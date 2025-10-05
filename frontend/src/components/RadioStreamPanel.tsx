import React, { useState } from 'react'
import { Radio, Play, Square } from 'lucide-react'
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
    id: 'bbc-world-service',
    name: 'BBC World Service (English)',
    url: 'http://stream.live.vc.bbcmedia.co.uk/bbc_world_service',
    language: 'en'
  },
  {
    id: 'monocle24',
    name: 'Monocle 24 (English)',
    url: 'https://monocle.en.sharp-stream.com/monocle24.aac',
    language: 'en'
  },

  // BBC UK (may have geo-restrictions)
  {
    id: 'radio4',
    name: 'BBC Radio 4 (UK)',
    url: 'http://as-hls-ww-live.akamaized.net/pool_55057080/live/ww/bbc_radio_fourfm/bbc_radio_fourfm.isml/bbc_radio_fourfm-audio%3d96000.norewind.m3u8',
    language: 'en'
  },
  {
    id: 'radio1',
    name: 'BBC Radio 1 (UK)',
    url: 'http://as-hls-ww-live.akamaized.net/pool_01505109/live/ww/bbc_radio_one/bbc_radio_one.isml/bbc_radio_one-audio%3d96000.norewind.m3u8',
    language: 'en'
  },
  {
    id: 'radio2',
    name: 'BBC Radio 2 (UK)',
    url: 'http://as-hls-ww-live.akamaized.net/pool_74208725/live/ww/bbc_radio_two/bbc_radio_two.isml/bbc_radio_two-audio%3d96000.norewind.m3u8',
    language: 'en'
  },

  // French
  {
    id: 'france-inter',
    name: 'France Inter (French)',
    url: 'https://icecast.radiofrance.fr/franceinter-midfi.mp3',
    language: 'fr'
  },
  {
    id: 'rfi-french',
    name: 'RFI (French)',
    url: 'https://rfifm64k.ice.infomaniak.ch/rfifm-64.mp3',
    language: 'fr'
  },

  // German
  {
    id: 'dw-german',
    name: 'Deutsche Welle (German)',
    url: 'https://dw-radioeins.akacast.akamaistream.net/7/785/3673891/v1/gnl.akacast.akamaistream.net/dw-radioeins',
    language: 'de'
  },
  {
    id: 'deutschlandfunk',
    name: 'Deutschlandfunk (German)',
    url: 'https://st01.sslstream.dlf.de/dlf/01/128/mp3/stream.mp3',
    language: 'de'
  },

  // Arabic
  {
    id: 'bbc-arabic',
    name: 'BBC Arabic (Arabic)',
    url: 'http://stream.live.vc.bbcmedia.co.uk/bbc_arabic_radio',
    language: 'ar'
  },
  {
    id: 'monte-carlo-arabic',
    name: 'Monte Carlo Doualiya (Arabic)',
    url: 'https://montecarlodoualiya64k.ice.infomaniak.ch/mc-doualiya.mp3',
    language: 'ar'
  }
]

export const RadioStreamPanel: React.FC = () => {
  const { radioStreamState, startRadioStream, stopRadioStream, appError } = useComparison()
  const [selectedStation, setSelectedStation] = useState<string>(RADIO_STATIONS[0].id) // Default to World Service

  const handleStartStop = () => {
    if (radioStreamState === 'idle') {
      const station = RADIO_STATIONS.find(s => s.id === selectedStation)
      if (station) {
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
      <div className="flex items-center gap-2">
        <Radio className="text-blue-600" size={20} />
        <h3 className="text-lg font-semibold">Live Radio Stream</h3>
      </div>

      {appError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
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
          <p><strong>Note:</strong> Some BBC UK stations may have geographic restrictions and only work from the UK. International stations (BBC World Service, Monocle 24, etc.) should work globally.</p>
        </div>
      </div>
    </div>
  )
}
