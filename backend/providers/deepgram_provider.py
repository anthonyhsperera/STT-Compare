import asyncio
import json
import logging
import websockets
from collections import Counter
from typing import Dict, Any
from fastapi import WebSocket

from .base_provider import BaseSTTProvider

logger = logging.getLogger(__name__)

class DeepgramProvider(BaseSTTProvider):
    """Deepgram Real-time STT Provider"""

    def __init__(self, api_key: str, config: Dict[str, Any], websocket: WebSocket):
        super().__init__(api_key, config, websocket)
        self.ws_url = "wss://api.deepgram.com/v1/listen"

    def get_provider_name(self) -> str:
        return "deepgram"

    async def connect(self) -> None:
        """Connect to Deepgram real-time API"""
        try:
            # Build query parameters
            # Check if diarization is enabled
            diarize_enabled = self.config.get("diarize", False)

            params = {
                "encoding": "linear16",
                "sample_rate": self.config.get("sampleRate", 16000),
                "channels": 1,
                "model": self.config.get("model", "nova-2"),
                "language": self.config.get("language", "en"),
                "punctuate": "true" if self.config.get("punctuate", True) else "false",
                "interim_results": "true" if self.config.get("interim_results", True) else "false",
                "endpointing": str(self.config.get("endpointing", 300)),
                "vad_events": "true" if self.config.get("vad_events", True) else "false",
                "smart_format": "true" if self.config.get("smart_format", True) else "false",
                "filler_words": "true" if self.config.get("filler_words", False) else "false",
                "numerals": "true" if self.config.get("numerals", True) else "false",
                "diarize": "true" if diarize_enabled else "false"
            }

            # Add utterances=true when diarization is enabled to get word-level timestamps and speaker info
            if diarize_enabled:
                params["utterances"] = "true"

            # Build URL with parameters
            param_string = "&".join([f"{k}={v}" for k, v in params.items()])
            url = f"{self.ws_url}?{param_string}"

            # Prepare headers
            headers = {
                "Authorization": f"Token {self.api_key}"
            }

            # Connect to WebSocket
            self.provider_websocket = await websockets.connect(url, extra_headers=headers)
            self.is_connected = True

            # Start listening for responses
            asyncio.create_task(self._listen_for_responses())

            logger.info("Connected to Deepgram")

        except Exception as e:
            logger.error(f"Failed to connect to Deepgram: {e}")
            await self.send_error_to_client(f"Connection failed: {str(e)}")

    async def disconnect(self) -> None:
        """Disconnect from Deepgram"""
        try:
            if self.provider_websocket and not self.provider_websocket.closed:
                # Send close frame
                await self.provider_websocket.send(json.dumps({"type": "CloseStream"}))
                await self.provider_websocket.close()
            self.is_connected = False
            logger.info("Disconnected from Deepgram")
        except Exception as e:
            logger.error(f"Error disconnecting from Deepgram: {e}")

    async def send_audio(self, audio_data: bytes) -> None:
        """Send audio data to Deepgram"""
        try:
            if self.provider_websocket and self.is_connected:
                await self.provider_websocket.send(audio_data)
        except Exception as e:
            logger.error(f"Error sending audio to Deepgram: {e}")
            await self.send_error_to_client(f"Audio transmission error: {str(e)}")

    async def _listen_for_responses(self) -> None:
        """Listen for responses from Deepgram"""
        try:
            while self.provider_websocket and not self.provider_websocket.closed:
                response = await self.provider_websocket.recv()
                await self._process_response(response)
        except websockets.exceptions.ConnectionClosed:
            logger.info("Deepgram connection closed")
        except Exception as e:
            logger.error(f"Error listening to Deepgram responses: {e}")
            await self.send_error_to_client(f"Response processing error: {str(e)}")

    async def _process_response(self, response: str) -> None:
        """Process response from Deepgram"""
        try:
            data = json.loads(response)

            # Handle different types of messages
            if "channel" in data and "alternatives" in data["channel"]:
                # Transcription result
                channel = data["channel"]
                alternatives = channel.get("alternatives", [])

                if alternatives:
                    alternative = alternatives[0]  # Use the first alternative
                    transcript_text = alternative.get("transcript", "")

                    if transcript_text:  # Only process non-empty transcripts
                        is_final = data.get("is_final", False)

                        # Extract timing information
                        start_ms = data.get("start", 0) * 1000 if "start" in data else 0
                        duration_ms = data.get("duration", 0) * 1000 if "duration" in data else 0
                        end_ms = start_ms + duration_ms

                        transcript = {
                            "provider": self.get_provider_name(),
                            "transcript": {
                                "text": transcript_text,
                                "is_final": is_final,
                                "start_ms": start_ms,
                                "end_ms": end_ms,
                                "confidence": alternative.get("confidence", 0.0)
                            }
                        }

                        # Add speaker information if available
                        # In live streaming, speaker info is at word level, not transcript level
                        if "speaker" in alternative:
                            transcript["transcript"]["speaker"] = alternative["speaker"]
                        elif "words" in alternative and alternative["words"]:
                            # Extract speaker from words (most common speaker in this utterance)
                            speakers = [word.get("speaker") for word in alternative["words"] if "speaker" in word]
                            if speakers:
                                # Use the most common speaker
                                most_common_speaker = Counter(speakers).most_common(1)[0][0]
                                transcript["transcript"]["speaker"] = most_common_speaker

                        await self.websocket.send_text(json.dumps(transcript))

            elif "type" in data:
                # Handle metadata messages
                message_type = data["type"]

                if message_type == "UtteranceEnd":
                    # End of utterance - could be used for UI feedback
                    pass
                elif message_type == "SpeechStarted":
                    # Speech started - could be used for UI feedback
                    pass
                elif message_type == "Error":
                    error_msg = data.get("description", "Unknown error")
                    await self.send_error_to_client(f"Deepgram error: {error_msg}")

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Deepgram response: {e}")
        except Exception as e:
            logger.error(f"Error processing Deepgram response: {e}")
            await self.send_error_to_client(f"Response processing error: {str(e)}")