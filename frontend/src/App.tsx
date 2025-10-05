import { ComparisonProvider, useComparison } from './contexts/ComparisonContext'
import { TranscriptionPanel } from './components/TranscriptionPanel'
import { ControlPanel } from './components/ControlPanel'
import { RadioStreamPanel } from './components/RadioStreamPanel'
import { APIKeyManager } from './components/APIKeyManager'
import { ConfigurationEditor } from './components/ConfigurationEditor'
import { DiarizationToggle } from './components/DiarizationToggle'

function AppContent() {
  const { providerOutputs } = useComparison()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                Real-time STT Comparison
              </h1>
              <p className="text-slate-600 mt-1 text-sm">
                Compare Speechmatics vs Deepgram transcription quality side-by-side
              </p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <div className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg text-sm font-medium shadow-sm">
                Live Comparison
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* API Keys - Collapsible */}
          <div className="bg-white/80 backdrop-blur rounded-xl shadow-lg border border-slate-200">
            <APIKeyManager />
          </div>

          {/* Diarization Toggle - Applies to both recording and streaming */}
          <DiarizationToggle />

          {/* Recording and Radio Controls - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/80 backdrop-blur rounded-xl shadow-lg p-6 border border-slate-200">
              <ControlPanel />
            </div>
            <div className="bg-white/80 backdrop-blur rounded-xl shadow-lg p-6 border border-slate-200">
              <RadioStreamPanel />
            </div>
          </div>

          {/* Transcription Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TranscriptionPanel
              provider="speechmatics"
              output={providerOutputs.speechmatics}
              className="min-h-[500px]"
            />
            <TranscriptionPanel
              provider="deepgram"
              output={providerOutputs.deepgram}
              className="min-h-[500px]"
            />
          </div>

          {/* Configuration Editor */}
          <div className="bg-white/80 backdrop-blur rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <ConfigurationEditor />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/60 backdrop-blur mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <p>Real-time Speech-to-Text Comparison Tool</p>
              <p>Built with React, TypeScript & Vite</p>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h3 className="font-semibold text-slate-700 mb-2">Project</h3>
                  <a
                    href="https://github.com/anthonyhsperera/STT-Compare"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline block"
                  >
                    GitHub Repository
                  </a>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-700 mb-2">Speechmatics Docs</h3>
                  <div className="space-y-1">
                    <a
                      href="https://docs.speechmatics.com/speech-to-text/realtime/output#latency"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline block"
                    >
                      Real-time Output & Latency
                    </a>
                    <a
                      href="https://github.com/speechmatics/speechmatics-python-sdk/tree/feature/voice-package-update/sdk/voice"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline block"
                    >
                      Python SDK (Voice)
                    </a>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-700 mb-2">Deepgram Docs</h3>
                  <a
                    href="https://developers.deepgram.com/docs/live-streaming-audio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline block"
                  >
                    Live Streaming Audio
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function App() {
  return (
    <ComparisonProvider>
      <AppContent />
    </ComparisonProvider>
  )
}

export default App
