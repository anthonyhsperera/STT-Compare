import asyncio
import json
import logging
import os
from typing import Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

from providers.speechmatics_provider import SpeechmaticsProvider
from providers.deepgram_provider import DeepgramProvider

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="STT Compare API", version="1.0.0")

# CORS middleware - support both local development and production
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    # Add production frontend URL from environment variable
    os.getenv("FRONTEND_URL", ""),
]

# Filter out empty strings
allowed_origins = [origin for origin in allowed_origins if origin]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (optional - for production deployment)
try:
    app.mount("/static", StaticFiles(directory="../stt-compare/dist"), name="static")
except Exception as e:
    logger.info("Static files not mounted - development mode")

class ConnectionManager:
    def __init__(self):
        self.providers: Dict[str, Any] = {}
        self.active_connections: Dict[WebSocket, Dict[str, Any]] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[websocket] = {
            "speechmatics": None,
            "deepgram": None,
            "config": None
        }

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            # Clean up provider connections
            connection_data = self.active_connections[websocket]
            for provider_name, provider in connection_data.items():
                if provider_name in ["speechmatics", "deepgram"] and provider:
                    asyncio.create_task(provider.disconnect())
            del self.active_connections[websocket]

    async def initialize_providers(self, websocket: WebSocket, config: Dict[str, Any]):
        """Initialize both providers with the given configuration"""
        connection_data = self.active_connections[websocket]
        connection_data["config"] = config

        try:
            # Get audio config for sample rate
            audio_config = config.get("audio", {})
            sample_rate = audio_config.get("sampleRate", 16000)

            # Initialize Speechmatics
            speechmatics_config = config.get("speechmatics", {})
            logger.info(f"[CONFIG] Extracted Speechmatics config: {speechmatics_config}")
            if speechmatics_config.get("apiKey"):
                # Merge audio sample rate into provider config
                speechmatics_config_with_audio = {**speechmatics_config, "sampleRate": sample_rate}
                speechmatics_provider = SpeechmaticsProvider(
                    api_key=speechmatics_config["apiKey"],
                    config=speechmatics_config_with_audio,
                    websocket=websocket
                )
                await speechmatics_provider.connect()
                connection_data["speechmatics"] = speechmatics_provider
            else:
                await websocket.send_text(json.dumps({
                    "provider": "speechmatics",
                    "error": "API key not provided"
                }))

            # Initialize Deepgram
            deepgram_config = config.get("deepgram", {})
            if deepgram_config.get("apiKey"):
                # Merge audio sample rate into provider config
                deepgram_config_with_audio = {**deepgram_config, "sampleRate": sample_rate}
                deepgram_provider = DeepgramProvider(
                    api_key=deepgram_config["apiKey"],
                    config=deepgram_config_with_audio,
                    websocket=websocket
                )
                await deepgram_provider.connect()
                connection_data["deepgram"] = deepgram_provider
            else:
                await websocket.send_text(json.dumps({
                    "provider": "deepgram",
                    "error": "API key not provided"
                }))

        except Exception as e:
            logger.error(f"Error initializing providers: {e}")
            await websocket.send_text(json.dumps({
                "error": f"Failed to initialize providers: {str(e)}"
            }))

    async def send_audio_to_providers(self, websocket: WebSocket, audio_data: bytes):
        """Send audio data to all connected providers"""
        connection_data = self.active_connections.get(websocket, {})

        tasks = []
        for provider_name in ["speechmatics", "deepgram"]:
            provider = connection_data.get(provider_name)
            if provider:
                tasks.append(provider.send_audio(audio_data))

        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def stop_providers(self, websocket: WebSocket):
        """Stop all providers for this connection"""
        connection_data = self.active_connections.get(websocket, {})

        for provider_name in ["speechmatics", "deepgram"]:
            provider = connection_data.get(provider_name)
            if provider:
                await provider.disconnect()
                connection_data[provider_name] = None

manager = ConnectionManager()

@app.websocket("/ws/transcribe")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    logger.info("Client connected")

    try:
        while True:
            # Receive data from client
            try:
                data = await websocket.receive()

                if "text" in data:
                    # Handle text messages (configuration, commands)
                    message = json.loads(data["text"])

                    if message.get("type") == "config":
                        received_config = message.get("config", {})
                        logger.info(f"[CONFIG] Received config from frontend: {received_config}")
                        await manager.initialize_providers(websocket, received_config)
                    elif message.get("type") == "stop" or data["text"] == "END":
                        await manager.stop_providers(websocket)

                elif "bytes" in data:
                    # Handle audio data
                    audio_data = data["bytes"]
                    await manager.send_audio_to_providers(websocket, audio_data)

            except json.JSONDecodeError:
                # Handle raw string messages like "END"
                if data.get("text") == "END":
                    await manager.stop_providers(websocket)

    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        manager.disconnect(websocket)

@app.get("/")
async def read_root():
    return {"message": "STT Compare API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )