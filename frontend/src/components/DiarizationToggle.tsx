import React from 'react'
import { Users } from 'lucide-react'
import { useComparison } from '../contexts/ComparisonContext'
import { cn } from '../lib/utils'

export const DiarizationToggle: React.FC = () => {
  const { config, updateConfig, recordingState, radioStreamState } = useComparison()

  const isDiarizationEnabled = config.speechmatics.enableDiarization || config.deepgram.diarize
  const isDisabled = recordingState !== 'idle' || radioStreamState !== 'idle'

  const handleToggle = () => {
    const newValue = !isDiarizationEnabled
    updateConfig({
      ...config,
      speechmatics: {
        ...config.speechmatics,
        enableDiarization: newValue
      },
      deepgram: {
        ...config.deepgram,
        diarize: newValue
      }
    })
  }

  return (
    <div className="bg-white/80 backdrop-blur rounded-xl shadow-lg p-4 border border-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="text-indigo-600" size={20} />
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Speaker Diarization</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Identify different speakers in the transcription
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isDiarizationEnabled && (
            <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-medium">
              ENABLED
            </span>
          )}
          <button
            onClick={handleToggle}
            disabled={isDisabled}
            className={cn(
              'relative inline-flex h-7 w-12 items-center rounded-full transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isDiarizationEnabled ? 'bg-indigo-600' : 'bg-gray-300'
            )}
            title={isDisabled ? 'Stop recording/streaming to change' : 'Toggle speaker diarization'}
          >
            <span
              className={cn(
                'inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm',
                isDiarizationEnabled ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
