import asyncio
import json
import logging
from typing import Dict, Any
from fastapi import WebSocket

from speechmatics.voice import (
    VoiceAgentClient,
    VoiceAgentConfig,
    EndOfUtteranceMode,
    OperatingPoint,
    AudioEncoding,
    AgentServerMessageType
)

from .base_provider import BaseSTTProvider

logger = logging.getLogger(__name__)

class SpeechmaticsProvider(BaseSTTProvider):
    """Speechmatics Voice SDK Provider"""

    def __init__(self, api_key: str, config: Dict[str, Any], websocket: WebSocket):
        super().__init__(api_key, config, websocket)
        self.voice_client = None
        self.is_connected = False

    def get_provider_name(self) -> str:
        return "speechmatics"

    async def connect(self) -> None:
        """Connect to Speechmatics using Voice SDK"""
        try:
            # Configure the voice agent
            logger.info(f"Speechmatics config received: {self.config}")
            diarization_enabled = self.config.get("enableDiarization", False)

            # Get end of utterance mode
            eou_mode_str = self.config.get("endOfUtteranceMode", "adaptive").upper()
            if eou_mode_str == "FIXED":
                eou_mode = EndOfUtteranceMode.FIXED
            elif eou_mode_str == "ADAPTIVE":
                eou_mode = EndOfUtteranceMode.ADAPTIVE
            elif eou_mode_str == "EXTERNAL":
                eou_mode = EndOfUtteranceMode.EXTERNAL
            else:
                eou_mode = EndOfUtteranceMode.EXTERNAL  # default fallback

            # Get operating point
            op_point_str = self.config.get("operatingPoint", "enhanced").upper()
            if op_point_str == "ENHANCED":
                operating_point = OperatingPoint.ENHANCED
            elif op_point_str == "STANDARD":
                operating_point = OperatingPoint.STANDARD
            else:
                operating_point = OperatingPoint.ENHANCED  # default fallback

            # Get max_delay value
            max_delay_value = float(self.config.get("maxDelay", 1.2))
            logger.info(f"Setting max_delay to: {max_delay_value}")

            voice_config = VoiceAgentConfig(
                operating_point=operating_point,
                language=self.config.get("language", "en"),
                max_delay=max_delay_value,
                end_of_utterance_mode=eou_mode,
                end_of_utterance_silence_trigger=float(self.config.get("endOfUtteranceSilenceTrigger", 0.8)),
                end_of_utterance_max_delay=float(self.config.get("endOfUtteranceMaxDelay", 10.0)),
                enable_diarization=diarization_enabled,
                include_results=True,
                sample_rate=self.config.get("sampleRate", 16000),
                audio_encoding=AudioEncoding.PCM_S16LE,
            )

            logger.info(f"VoiceAgentConfig created with max_delay={voice_config.max_delay}")

            # Add diarization-specific settings if enabled
            if diarization_enabled:
                voice_config.speaker_sensitivity = self.config.get("speakerSensitivity", 0.5)
                voice_config.max_speakers = self.config.get("maxSpeakers", 10)
                voice_config.prefer_current_speaker = self.config.get("preferCurrentSpeaker", False)
                logger.info(f"Diarization enabled with: sensitivity={voice_config.speaker_sensitivity}, max_speakers={voice_config.max_speakers}, prefer_current={voice_config.prefer_current_speaker}")

            # Create client with API key
            self.voice_client = VoiceAgentClient(api_key=self.api_key, config=voice_config)

            # Register event handlers BEFORE connecting
            @self.voice_client.on(AgentServerMessageType.ADD_PARTIAL_SEGMENT)
            def handle_interim_segments(message):
                logger.info(f"ADD_PARTIAL_SEGMENT event triggered")
                asyncio.create_task(self._handle_partial_segments(message))

            @self.voice_client.on(AgentServerMessageType.ADD_SEGMENT)
            def handle_final_segments(message):
                logger.info(f"ADD_SEGMENT event triggered")
                asyncio.create_task(self._handle_final_segments(message))

            @self.voice_client.on(AgentServerMessageType.SPEAKER_STARTED)
            def handle_speech_started(message):
                logger.info(f"SPEAKER_STARTED event triggered")
                asyncio.create_task(self._handle_speech_started(message))

            @self.voice_client.on(AgentServerMessageType.SPEAKER_ENDED)
            def handle_speech_ended(message):
                logger.info(f"SPEAKER_ENDED event triggered")
                asyncio.create_task(self._handle_speech_ended(message))

            @self.voice_client.on(AgentServerMessageType.END_OF_TURN)
            def handle_end_of_turn(message):
                logger.info(f"END_OF_TURN event triggered")
                asyncio.create_task(self._handle_end_of_turn(message))

            # Connect to the service
            await self.voice_client.connect()
            self.is_connected = True

            logger.info("Connected to Speechmatics Voice SDK")

        except Exception as e:
            logger.error(f"Failed to connect to Speechmatics: {e}")
            await self.send_error_to_client(f"Connection failed: {str(e)}")

    async def disconnect(self) -> None:
        """Disconnect from Speechmatics"""
        try:
            if self.voice_client:
                await self.voice_client.close()
            self.is_connected = False
            logger.info("Disconnected from Speechmatics")
        except Exception as e:
            logger.error(f"Error disconnecting from Speechmatics: {e}")

    async def send_audio(self, audio_data: bytes) -> None:
        """Send audio data to Speechmatics Voice SDK"""
        try:
            if self.voice_client and self.is_connected:
                await self.voice_client.send_audio(audio_data)
        except Exception as e:
            logger.error(f"Error sending audio to Speechmatics: {e}")
            await self.send_error_to_client(f"Audio transmission error: {str(e)}")

    async def _handle_partial_segments(self, message: Dict[str, Any]) -> None:
        """Handle partial/interim transcription segments

        ALL AddPartialSegment events are partial, even if they have 'has_final' annotation.
        The has_final annotation just means some words are internally finalized,
        but the segment is still being built incrementally.
        """
        try:
            segments = message["segments"]
            for segment in segments:
                # All partial segments are sent as non-final (italic display)
                transcript = {
                    "provider": self.get_provider_name(),
                    "transcript": {
                        "text": segment.get("text", ""),
                        "is_final": False,  # Always False for partial segments
                        "start_ms": segment.get("start_time", 0) * 1000,
                        "end_ms": segment.get("end_time", 0) * 1000,
                    }
                }
                # Only add speaker if present
                if "speaker_id" in segment and segment["speaker_id"] is not None:
                    speaker_id = segment["speaker_id"]
                    if isinstance(speaker_id, str) and speaker_id.startswith('S'):
                        speaker_num = int(speaker_id[1:]) - 1
                        transcript["transcript"]["speaker"] = speaker_num
                    else:
                        transcript["transcript"]["speaker"] = speaker_id
                await self.websocket.send_text(json.dumps(transcript))
        except Exception as e:
            logger.error(f"Error handling partial segments: {e}")

    async def _handle_final_segments(self, message: Dict[str, Any]) -> None:
        """Handle finalized transcription segments"""
        try:
            logger.info(f"Received final segments message: {message}")
            segments = message["segments"]
            logger.info(f"Number of final segments: {len(segments)}")
            for segment in segments:
                logger.info(f"Final segment data: {segment}")
                transcript = {
                    "provider": self.get_provider_name(),
                    "transcript": {
                        "text": segment.get("text", ""),
                        "is_final": True,
                        "start_ms": segment.get("start_time", 0) * 1000,
                        "end_ms": segment.get("end_time", 0) * 1000,
                        "confidence": segment.get("confidence", 0.0)
                    }
                }
                # Only add speaker if present
                if "speaker_id" in segment and segment["speaker_id"] is not None:
                    # Convert S1, S2, etc. to integers 0, 1, 2, etc.
                    speaker_id = segment["speaker_id"]
                    if isinstance(speaker_id, str) and speaker_id.startswith('S'):
                        speaker_num = int(speaker_id[1:]) - 1  # S1 -> 0, S2 -> 1, etc.
                        transcript["transcript"]["speaker"] = speaker_num
                    else:
                        transcript["transcript"]["speaker"] = speaker_id
                    logger.info(f"Added speaker ID: {segment['speaker_id']} -> {transcript['transcript']['speaker']}")

                await self.websocket.send_text(json.dumps(transcript))
                logger.info(f"Sent final transcript: {transcript}")
        except Exception as e:
            logger.error(f"Error handling final segments: {e}")

    async def _handle_speech_started(self, message: Dict[str, Any]) -> None:
        """Handle speech started event"""
        try:
            status = message.get("status", "")  # status may be optional
            event = {
                "provider": self.get_provider_name(),
                "event": "speech_started",
                "status": status
            }
            await self.websocket.send_text(json.dumps(event))
        except Exception as e:
            logger.error(f"Error handling speech started: {e}")

    async def _handle_speech_ended(self, message: Dict[str, Any]) -> None:
        """Handle speech ended event"""
        try:
            status = message.get("status", "")  # status may be optional
            event = {
                "provider": self.get_provider_name(),
                "event": "speech_ended",
                "status": status
            }
            await self.websocket.send_text(json.dumps(event))
        except Exception as e:
            logger.error(f"Error handling speech ended: {e}")

    async def _handle_end_of_turn(self, _message: Dict[str, Any]) -> None:
        """Handle end of turn/utterance"""
        try:
            event = {
                "provider": self.get_provider_name(),
                "event": "end_of_turn"
            }
            await self.websocket.send_text(json.dumps(event))
        except Exception as e:
            logger.error(f"Error handling end of turn: {e}")
