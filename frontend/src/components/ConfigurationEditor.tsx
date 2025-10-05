import React, { useState, useEffect } from 'react'
import { Editor } from '@monaco-editor/react'
import { Settings, RotateCcw, Save, AlertCircle } from 'lucide-react'
import { useComparison } from '../contexts/ComparisonContext'
import { DEFAULT_CONFIG } from '../lib/config'
import type { AppConfig } from '../types'
import { cn } from '../lib/utils'

export const ConfigurationEditor: React.FC = () => {
  const { config, updateConfig } = useComparison()
  const [editorValue, setEditorValue] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(true)

  useEffect(() => {
    setEditorValue(JSON.stringify(config, null, 2))
  }, [config])

  const validateConfig = (jsonString: string): { isValid: boolean; error?: string; config?: AppConfig } => {
    try {
      const parsed = JSON.parse(jsonString)

      // Basic validation
      if (!parsed.speechmatics || !parsed.deepgram || !parsed.audio) {
        return { isValid: false, error: 'Missing required configuration sections (speechmatics, deepgram, audio)' }
      }

      // Validate required fields
      if (typeof parsed.speechmatics.apiKey !== 'string') {
        return { isValid: false, error: 'speechmatics.apiKey must be a string' }
      }
      if (typeof parsed.deepgram.apiKey !== 'string') {
        return { isValid: false, error: 'deepgram.apiKey must be a string' }
      }
      if (typeof parsed.audio.sampleRate !== 'number' || parsed.audio.sampleRate <= 0) {
        return { isValid: false, error: 'audio.sampleRate must be a positive number' }
      }

      return { isValid: true, config: parsed as AppConfig }
    } catch (error) {
      return { isValid: false, error: 'Invalid JSON format' }
    }
  }

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setEditorValue(value)
      const validation = validateConfig(value)
      if (validation.isValid) {
        setValidationError(null)
      } else {
        setValidationError(validation.error || 'Unknown validation error')
      }
    }
  }

  const handleApplyChanges = () => {
    const validation = validateConfig(editorValue)
    if (validation.isValid && validation.config) {
      updateConfig(validation.config)
      setValidationError(null)
    } else {
      setValidationError(validation.error || 'Invalid configuration')
    }
  }

  const handleResetToDefaults = () => {
    const defaultConfigString = JSON.stringify(DEFAULT_CONFIG, null, 2)
    setEditorValue(defaultConfigString)
    setValidationError(null)
  }

  return (
    <div className="border rounded-lg bg-white">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b cursor-pointer hover:bg-gray-50"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <Settings size={20} />
          <h3 className="text-lg font-semibold">Configuration Editor</h3>
        </div>
        <div className="flex items-center gap-2">
          {validationError && (
            <AlertCircle size={16} className="text-red-500" />
          )}
          <span className="text-sm text-gray-500">
            {isCollapsed ? 'Click to expand' : 'Click to collapse'}
          </span>
        </div>
      </div>

      {/* Editor Content */}
      {!isCollapsed && (
        <div className="p-4">
          {validationError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} />
                <span className="font-medium">Configuration Error:</span>
              </div>
              <p className="mt-1">{validationError}</p>
            </div>
          )}

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Edit the configuration below. Changes will be validated in real-time.
            </p>
          </div>

          <div className="border rounded overflow-hidden">
            <Editor
              height="400px"
              defaultLanguage="json"
              value={editorValue}
              onChange={handleEditorChange}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                insertSpaces: true,
                formatOnPaste: true,
                formatOnType: true
              }}
              theme="vs"
            />
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleApplyChanges}
              disabled={!!validationError}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors',
                'bg-green-600 hover:bg-green-700 text-white',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <Save size={16} />
              Apply Changes
            </button>

            <button
              onClick={handleResetToDefaults}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors',
                'bg-gray-600 hover:bg-gray-700 text-white'
              )}
            >
              <RotateCcw size={16} />
              Reset to Defaults
            </button>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-800 text-sm">
            <p className="font-medium">Configuration Tips:</p>
            <ul className="mt-1 space-y-1 text-xs">
              <li>• API keys are required for both providers to start recording</li>
              <li>• Sample rate should typically be 16000 Hz for best compatibility</li>
              <li>• Enable interim_results/enablePartials to see real-time transcription</li>
              <li>• Model options: Speechmatics (enhanced, standard), Deepgram (nova-2, base)</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}