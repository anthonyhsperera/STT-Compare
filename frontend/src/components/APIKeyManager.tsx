import React, { useState } from 'react'
import { Key, Eye, EyeOff, CheckCircle, XCircle, TestTube, ChevronDown } from 'lucide-react'
import { useComparison } from '../contexts/ComparisonContext'
import type { ProviderName } from '../types'
import { cn } from '../lib/utils'

export const APIKeyManager: React.FC = () => {
  const { config, updateConfig, testConnection } = useComparison()
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [showKeys, setShowKeys] = useState<Record<ProviderName, boolean>>({
    speechmatics: false,
    deepgram: false
  })
  const [testing, setTesting] = useState<Record<ProviderName, boolean>>({
    speechmatics: false,
    deepgram: false
  })
  const [testResults, setTestResults] = useState<Record<ProviderName, boolean | null>>({
    speechmatics: null,
    deepgram: null
  })

  const updateApiKey = (provider: ProviderName, apiKey: string) => {
    const newConfig = {
      ...config,
      [provider]: {
        ...config[provider],
        apiKey
      }
    }
    updateConfig(newConfig)
    // Clear test result when key changes
    setTestResults(prev => ({ ...prev, [provider]: null }))
  }

  const toggleShowKey = (provider: ProviderName) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }))
  }

  const handleTestConnection = async (provider: ProviderName) => {
    if (!config[provider].apiKey) {
      setTestResults(prev => ({ ...prev, [provider]: false }))
      return
    }

    setTesting(prev => ({ ...prev, [provider]: true }))
    try {
      const result = await testConnection(provider)
      setTestResults(prev => ({ ...prev, [provider]: result }))
    } catch (error) {
      setTestResults(prev => ({ ...prev, [provider]: false }))
    } finally {
      setTesting(prev => ({ ...prev, [provider]: false }))
    }
  }

  const validateApiKeyFormat = (provider: ProviderName, apiKey: string): boolean => {
    if (!apiKey) return false

    switch (provider) {
      case 'speechmatics':
        // Speechmatics API keys are typically alphanumeric strings
        return apiKey.length > 10 && /^[a-zA-Z0-9]+$/.test(apiKey)
      case 'deepgram':
        // Deepgram API keys typically start with a specific format
        return apiKey.length > 20 && /^[a-zA-Z0-9_-]+$/.test(apiKey)
      default:
        return false
    }
  }

  const getProviderTitle = (provider: ProviderName) => {
    return provider === 'speechmatics' ? 'Speechmatics' : 'Deepgram'
  }

  const getProviderPlaceholder = (provider: ProviderName) => {
    return provider === 'speechmatics'
      ? 'Enter your Speechmatics API key'
      : 'Enter your Deepgram API key'
  }

  const renderApiKeyInput = (provider: ProviderName) => {
    const apiKey = config[provider].apiKey
    const isValidFormat = validateApiKeyFormat(provider, apiKey)
    const showKey = showKeys[provider]
    const isTestingConnection = testing[provider]
    const testResult = testResults[provider]

    return (
      <div key={provider} className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            {getProviderTitle(provider)} API Key
          </label>
          <div className="flex items-center gap-2">
            {testResult !== null && (
              <div className={cn(
                'flex items-center gap-1 text-xs',
                testResult ? 'text-green-600' : 'text-red-600'
              )}>
                {testResult ? <CheckCircle size={12} /> : <XCircle size={12} />}
                {testResult ? 'Valid' : 'Invalid'}
              </div>
            )}
          </div>
        </div>

        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => updateApiKey(provider, e.target.value)}
            placeholder={getProviderPlaceholder(provider)}
            className={cn(
              'w-full px-3 py-2 border rounded-md text-sm pr-20',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              !apiKey && 'border-gray-300',
              apiKey && isValidFormat && 'border-green-300 bg-green-50',
              apiKey && !isValidFormat && 'border-red-300 bg-red-50'
            )}
          />

          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => toggleShowKey(provider)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title={showKey ? 'Hide API key' : 'Show API key'}
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>

            <button
              type="button"
              onClick={() => handleTestConnection(provider)}
              disabled={!apiKey || isTestingConnection}
              className={cn(
                'p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50',
                isTestingConnection && 'animate-spin'
              )}
              title="Test connection"
            >
              <TestTube size={14} />
            </button>
          </div>
        </div>

        {apiKey && !isValidFormat && (
          <p className="text-xs text-red-600">
            Invalid API key format for {getProviderTitle(provider)}
          </p>
        )}

        {!apiKey && (
          <p className="text-xs text-gray-500">
            API key is required to use {getProviderTitle(provider)} transcription service
          </p>
        )}
      </div>
    )
  }

  const hasValidKeys = Object.keys(config).every(provider =>
    validateApiKeyFormat(provider as ProviderName, config[provider as ProviderName].apiKey)
  )

  return (
    <div className="border rounded-lg bg-white">
      {/* Header - Clickable to expand/collapse */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <Key size={18} />
          <h3 className="text-sm font-semibold text-gray-700">API Keys</h3>
          {hasValidKeys && (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
              Configured
            </span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={cn(
            'text-gray-400 transition-transform',
            !isCollapsed && 'rotate-180'
          )}
        />
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="px-4 pb-4 space-y-6 border-t">
          <div className="space-y-6 pt-4">
            {renderApiKeyInput('speechmatics')}
            {renderApiKeyInput('deepgram')}
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-800 text-xs">
            <p className="font-medium">Security Note:</p>
            <p className="mt-1">
              API keys are stored locally in your browser and never sent to our servers.
            </p>
          </div>

          {!hasValidKeys && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs">
              <p className="font-medium">Required:</p>
              <p className="mt-1">
                Please provide valid API keys for both services to start recording.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}