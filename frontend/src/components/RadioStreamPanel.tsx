import React, { useState } from 'react'
import { Radio, Play, Square, Volume2 } from 'lucide-react'
import { useComparison } from '../contexts/ComparisonContext'
import { cn } from '../lib/utils'

interface RadioStation {
  id: string
  name: string
  url: string
  language?: string
}

const RADIO_STATIONS: RadioStation[] = [
  // International / English
  {
    id: 'npr-news',
    name: 'NPR News (English)',
    url: 'https://npr-ice.streamguys1.com/live.mp3',
    language: 'en'
  },
  {
    id: 'bbc-world-service',
    name: 'BBC World Service (English)',
    url: 'https://stream.live.vc.bbcmedia.co.uk/bbc_world_service',
    language: 'en'
  },

  // French
  {
    id: 'france-inter',
    name: 'France Inter (French)',
    url: 'https://icecast.radiofrance.fr/franceinter-midfi.mp3',
    language: 'fr'
  },

  // German
  {
    id: 'deutschlandfunk',
    name: 'Deutschlandfunk (German)',
    url: 'https://st01.sslstream.dlf.de/dlf/01/128/mp3/stream.mp3',
    language: 'de'
  }
]

export const RadioStreamPanel: React.FC = () => {
  const { radioStreamState, startRadioStream, stopRadioStream, appError, config, updateConfig, radioVolume, setRadioVolume } = useComparison()
  const [selectedStation, setSelectedStation] = useState<string>('bbc-world-service') // Default to BBC World Service

  const handleStartStop = () => {
    if (radioStreamState === 'idle') {
      const station = RADIO_STATIONS.find(s => s.id === selectedStation)
      if (station) {
        // Update language settings if station has a different language
        if (station.language && station.language !== config.speechmatics.language) {
          updateConfig({
            ...config,
            speechmatics: {
              ...config.speechmatics,
              language: station.language
            },
            deepgram: {
              ...config.deepgram,
              language: station.language
            }
          })
        }
        startRadioStream(station.url, station.name)
      }
    } else {
      stopRadioStream()
    }
  }

  const isStreaming = radioStreamState === 'streaming'
  const isConnecting = radioStreamState === 'connecting'
  const isStopping = radioStreamState === 'stopping'
  const canStart = radioStreamState === 'idle'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Radio className="text-blue-600" size={20} />
          <h3 className="text-lg font-semibold">Live Radio Stream</h3>
        </div>
        <div className="flex items-center gap-2">
          <Volume2 className="text-gray-600" size={16} />
          <input
            type="range"
            min="0"
            max="100"
            value={radioVolume * 100}
            onChange={(e) => setRadioVolume(parseInt(e.target.value) / 100)}
            className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${radioVolume * 100}%, #e5e7eb ${radioVolume * 100}%, #e5e7eb 100%)`
            }}
          />
          <span className="text-xs text-gray-600 w-8 text-right">{Math.round(radioVolume * 100)}%</span>
        </div>
      </div>

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

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Select Station:</label>
          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            disabled={radioStreamState !== 'idle'}
            className={cn(
              'px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none',
              'disabled:opacity-50 disabled:cursor-not-allowed bg-white'
            )}
          >
            {RADIO_STATIONS.map(station => (
              <option key={station.id} value={station.id}>
                {station.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleStartStop}
          disabled={isStopping}
          className={cn(
            'flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            canStart && 'bg-blue-600 hover:bg-blue-700 text-white',
            (isStreaming || isConnecting) && 'bg-red-600 hover:bg-red-700 text-white',
            isStopping && 'bg-gray-400 text-white'
          )}
        >
          {canStart && (
            <>
              <Play size={16} />
              Start Stream
            </>
          )}
          {(isStreaming || isConnecting) && (
            <>
              <Square size={16} />
              Stop Stream
            </>
          )}
          {isStopping && (
            <>
              <Square size={16} />
              Stopping...
            </>
          )}
        </button>

        <div className="text-sm text-gray-600">
          <p className="font-medium">Status:</p>
          <p className={cn(
            radioStreamState === 'idle' && 'text-gray-600',
            radioStreamState === 'streaming' && 'text-blue-600',
            radioStreamState === 'connecting' && 'text-blue-600',
            radioStreamState === 'stopping' && 'text-yellow-600'
          )}>
            {radioStreamState === 'idle' && 'Ready to stream'}
            {radioStreamState === 'connecting' && 'Connecting to radio stream...'}
            {radioStreamState === 'streaming' && `Streaming: ${RADIO_STATIONS.find(s => s.id === selectedStation)?.name}`}
            {radioStreamState === 'stopping' && 'Stopping stream...'}
          </p>
        </div>

        <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded p-2">
          <p><strong>Note:</strong> All stations are international and should work globally. Language settings will automatically update to match the selected station.</p>
        </div>
      </div>
    </div>
  )
}
