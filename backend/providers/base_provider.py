from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from fastapi import WebSocket
import asyncio

class BaseSTTProvider(ABC):
    """Base class for Speech-to-Text providers"""

    def __init__(self, api_key: str, config: Dict[str, Any], websocket: WebSocket):
        self.api_key = api_key
        self.config = config
        self.websocket = websocket
        self.is_connected = False
        self.provider_websocket = None

    @abstractmethod
    async def connect(self) -> None:
        """Establish connection to the STT service"""
        pass

    @abstractmethod
    async def disconnect(self) -> None:
        """Close connection to the STT service"""
        pass

    @abstractmethod
    async def send_audio(self, audio_data: bytes) -> None:
        """Send audio data to the STT service"""
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        """Return the name of this provider"""
        pass

    async def send_result_to_client(self, result: Dict[str, Any]) -> None:
        """Send transcription result back to the client"""
        try:
            import json
            result["provider"] = self.get_provider_name()
            await self.websocket.send_text(json.dumps(result))
        except Exception as e:
            print(f"Error sending result to client: {e}")

    async def send_error_to_client(self, error_message: str) -> None:
        """Send error message back to the client"""
        error_result = {
            "provider": self.get_provider_name(),
            "error": error_message
        }
        await self.send_result_to_client(error_result)