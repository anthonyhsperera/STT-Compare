# Real-time STT Comparison Tool

A web-based application for side-by-side real-time transcription comparison between **Speechmatics** and **Deepgram** Speech-to-Text services.

## Features

- **Side-by-Side Comparison**: Compare Speechmatics and Deepgram transcriptions in real-time with identical audio input
- **Live Microphone Recording**: Capture audio directly from your microphone
- **Radio Stream Support**: Stream and transcribe live radio broadcasts (BBC, NPR, etc.)
- **Speaker Diarization**: Identify and label different speakers in the conversation
- **Configuration Editor**: Customize transcription parameters for both providers in real-time
- **Auto-scrolling Transcripts**: Always see the latest transcription results
- **API Key Management**: Secure, browser-based API key storage with connection testing

## Architecture

The application consists of two main components:

- **Frontend**: React + TypeScript application built with Vite
- **Backend**: FastAPI (Python) WebSocket server that manages connections to STT providers

```
┌─────────────┐
│   Browser   │
│  (Frontend) │
└──────┬──────┘
       │ WebSocket
       │
┌──────▼──────┐
│   FastAPI   │
│  (Backend)  │
└──────┬──────┘
       │
    ┌──┴──┐
    │     │
┌───▼──┐ ┌▼────────┐
│Speech│ │Deepgram │
│matics│ │         │
└──────┘ └─────────┘
```

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.9+
- **API Keys**:
  - [Speechmatics API Key](https://portal.speechmatics.com/)
  - [Deepgram API Key](https://console.deepgram.com/)

## Installation

### 1. Clone or Download the Project

```bash
cd "STT Compare"
```

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

## Configuration

### Backend Configuration

The backend uses default settings that work out of the box. Optionally, you can create a `.env` file:

```bash
cd backend
cp .env.example .env
# Edit .env with your preferred settings (optional)
```

### Frontend Configuration

Default configurations are stored in `frontend/src/lib/config.ts`:

**Speechmatics defaults:**
- `language`: `en`
- `operatingPoint`: `enhanced`
- `maxDelay`: `1.2`
- `endOfUtteranceSilenceTrigger`: `0.8`
- `endOfUtteranceMode`: `external`
- `enableDiarization`: `false`

**Deepgram defaults:**
- `language`: `en`
- `model`: `nova-3`
- `punctuate`: `true`
- `interim_results`: `true`
- `endpointing`: `300`
- `diarize`: `false`

These can be customized through the in-app Configuration Editor.

## Usage

### Starting the Application

You need to run both the backend and frontend:

**Terminal 1 - Backend:**
```bash
cd backend
./start.sh
```
The backend will start on `http://0.0.0.0:8000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
The frontend will start on `http://localhost:5173`

### Using the Application

1. **Open** `http://localhost:5173` in your browser

2. **Add API Keys**:
   - Click on the "API Keys" section
   - Enter your Speechmatics and Deepgram API keys
   - Click the test button to verify each key
   - Keys are stored securely in your browser's localStorage

3. **Start Transcribing**:
   - **Microphone**: Click "Start Speaking" to use your microphone
   - **Radio Stream**: Enter a radio stream URL and click "Start Stream"

4. **Customize Settings** (Optional):
   - Expand the "Configuration Editor" at the bottom
   - Modify parameters for either provider
   - Changes apply to the next recording session

5. **View Results**:
   - Transcriptions appear side-by-side in real-time
   - Interim results shown in lighter text
   - Final transcriptions in bold
   - Speaker labels (if diarization is enabled)

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for instructions on deploying to Render.com or other hosting platforms.

## API Keys

### Getting API Keys

**Speechmatics:**
1. Sign up at [https://portal.speechmatics.com/](https://portal.speechmatics.com/)
2. Navigate to API Keys section
3. Generate a new API key

**Deepgram:**
1. Sign up at [https://console.deepgram.com/](https://console.deepgram.com/)
2. Create a new project
3. Generate an API key

### Security Note

API keys are stored in your browser's localStorage and are sent directly to the respective STT services. They are never stored on our backend server.

## Troubleshooting

### Backend won't start
- Ensure Python 3.9+ is installed: `python3 --version`
- Check virtual environment is activated
- Verify all dependencies installed: `pip list`

### Frontend won't start
- Ensure Node.js 18+ is installed: `node --version`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear build cache: `rm -rf dist`

### No transcriptions appearing
- Verify both API keys are valid using the test button
- Check browser console for errors (F12)
- Check backend logs in the terminal
- Ensure microphone permissions are granted

### Audio not working
- Check browser microphone permissions
- Try a different browser (Chrome/Edge recommended)
- Ensure no other application is using the microphone

### Configuration changes not applying
- Configuration changes only apply to new recording sessions
- Stop current recording and start a new one
- Check the Configuration Editor for syntax errors

## Technology Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type-safe development
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Monaco Editor** - Configuration editor
- **WebSocket** - Real-time communication
- **Web Audio API** - Microphone capture
- **HLS.js** - Radio stream playback

### Backend
- **FastAPI** - Python web framework
- **Uvicorn** - ASGI server
- **WebSockets** - Real-time bi-directional communication
- **Speechmatics Voice SDK** - Speechmatics integration
- **Deepgram SDK** - Deepgram integration

## Project Structure

```
STT Compare/
├── README.md                   # This file
├── DEPLOYMENT.md               # Deployment guide
├── render.yaml                 # Render.com configuration
├── .gitignore                  # Git ignore rules
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── contexts/          # React contexts
│   │   ├── lib/               # Utilities and config
│   │   ├── types/             # TypeScript types
│   │   └── App.tsx            # Main app component
│   ├── package.json
│   └── vite.config.ts
└── backend/                    # Python backend
    ├── providers/              # STT provider implementations
    │   ├── base_provider.py
    │   ├── speechmatics_provider.py
    │   └── deepgram_provider.py
    ├── main.py                # FastAPI application
    ├── requirements.txt       # Python dependencies
    └── start.sh              # Startup script
```

## Development

### Building for Production

**Frontend:**
```bash
cd frontend
npm run build
```
Built files will be in `frontend/dist/`

**Backend:**
The backend runs as-is in production. Update `start.sh` to disable auto-reload:
```bash
# In start.sh, change --reload to --no-reload
uvicorn main:app --host 0.0.0.0 --port 8000 --no-reload
```

## License

This project is provided as-is for comparison and evaluation purposes.
