import React from 'react'
import { Play, Square, RotateCcw } from 'lucide-react'
import { useComparison } from '../contexts/ComparisonContext'
import { cn } from '../lib/utils'

export const ControlPanel: React.FC = () => {
  const { recordingState, startRecording, stopRecording, clearTranscripts, appError } = useComparison()

  const handleStartStop = () => {
    if (recordingState === 'idle') {
      startRecording()
    } else {
      stopRecording()
    }
  }

  const isRecording = recordingState === 'recording'
  const isConnecting = recordingState === 'connecting' || recordingState === 'starting'
  const isStopping = recordingState === 'stopping'
  const canStart = recordingState === 'idle'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold">Live Mic Transcription</h3>

        {appError && (
          <div className={cn(
            "p-3 border rounded text-sm",
            appError.includes('Only') && appError.includes('will be used')
              ? "bg-blue-50 border-blue-200 text-blue-800"
              : "bg-red-50 border-red-200 text-red-800"
          )}>
            {appError}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleStartStop}
          disabled={isStopping}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            canStart && 'bg-green-600 hover:bg-green-700 text-white',
            (isRecording || isConnecting) && 'bg-red-600 hover:bg-red-700 text-white',
            isStopping && 'bg-gray-400 text-white'
          )}
        >
          {canStart && (
            <>
              <Play size={16} />
              Start Speaking
            </>
          )}
          {(isRecording || isConnecting) && (
            <>
              <Square size={16} />
              Stop Speaking
            </>
          )}
          {isStopping && (
            <>
              <Square size={16} />
              Stopping...
            </>
          )}
        </button>

        <button
          onClick={clearTranscripts}
          disabled={recordingState !== 'idle'}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors',
            'bg-gray-600 hover:bg-gray-700 text-white',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <RotateCcw size={16} />
          Clear
        </button>
      </div>

      <div className="text-sm text-gray-600">
        <p className="font-medium">Status:</p>
        <p className={cn(
          recordingState === 'idle' && 'text-gray-600',
          recordingState === 'recording' && 'text-green-600',
          (recordingState === 'connecting' || recordingState === 'starting') && 'text-blue-600',
          recordingState === 'stopping' && 'text-yellow-600'
        )}>
          {recordingState === 'idle' && 'Ready to record'}
          {recordingState === 'starting' && 'Initializing...'}
          {recordingState === 'connecting' && 'Connecting to services...'}
          {recordingState === 'recording' && 'Recording in progress'}
          {recordingState === 'stopping' && 'Stopping recording...'}
        </p>
      </div>
    </div>
  )
}