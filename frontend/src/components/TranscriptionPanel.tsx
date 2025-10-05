import React, { useEffect, useRef } from 'react'
import type { ProviderName, ProviderOutput } from '../types'
import { cn } from '../lib/utils'
import { SpeechmaticsLogo } from './SpeechmaticsLogo'
import { DeepgramLogo } from './DeepgramLogo'

interface TranscriptionPanelProps {
  provider: ProviderName
  output: ProviderOutput
  className?: string
}

export const TranscriptionPanel: React.FC<TranscriptionPanelProps> = ({
  provider,
  output,
  className
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new transcripts arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [output.finalParts, output.nonFinalParts])
  const getStatusColor = () => {
    if (output.error) return 'text-red-500'
    if (output.statusMessage) return 'text-blue-500'
    return 'text-green-500'
  }

  const getSpeakerColors = (speaker: number | null | undefined) => {
    if (speaker === null || speaker === undefined) return null

    const colors = [
      { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-400', accent: 'bg-blue-500' },
      { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-400', accent: 'bg-purple-500' },
      { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-400', accent: 'bg-green-500' },
      { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-400', accent: 'bg-orange-500' },
      { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-400', accent: 'bg-pink-500' },
      { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-400', accent: 'bg-indigo-500' },
    ]

    return colors[speaker % colors.length]
  }

  const getProviderColors = () => {
    if (provider === 'speechmatics') {
      return {
        bg: 'bg-gradient-to-br from-teal-50 to-cyan-50',
        border: 'border-teal-200',
        headerBg: 'bg-gradient-to-r from-teal-500 to-cyan-500',
        accentBg: 'bg-teal-50',
        accentBorder: 'border-teal-200',
        accentText: 'text-teal-700'
      }
    } else {
      return {
        bg: 'bg-gradient-to-br from-emerald-50 to-green-50',
        border: 'border-emerald-200',
        headerBg: 'bg-black',
        accentBg: 'bg-emerald-50',
        accentBorder: 'border-emerald-200',
        accentText: 'text-emerald-700'
      }
    }
  }

  const colors = getProviderColors()

  return (
    <div className={cn(
      'flex flex-col h-full rounded-xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl',
      colors.bg,
      className
    )}>
      {/* Header with Logo */}
      <div className={cn('flex items-center justify-between p-4', colors.headerBg)}>
        <div className="flex items-center gap-3">
          {provider === 'speechmatics' ? (
            <SpeechmaticsLogo className="h-6" />
          ) : (
            <DeepgramLogo className="h-6" />
          )}
        </div>
        <div className={cn('text-sm font-medium flex items-center gap-2', getStatusColor())}>
          {output.error && (
            <span className="flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              <span className="text-red-600">Error</span>
            </span>
          )}
          {output.statusMessage && (
            <span className="flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              <span className="text-blue-600">{output.statusMessage}</span>
            </span>
          )}
          {!output.error && !output.statusMessage && (
            <span className="flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-green-600">Ready</span>
            </span>
          )}
        </div>
      </div>

      {/* Transcription Content */}
      <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto max-h-[600px]">
        {output.error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-slide-in-top">
            <p className="font-semibold text-red-800 mb-1">Error</p>
            <p className="text-red-600 text-sm">{output.error}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Final transcriptions - each utterance on a separate line */}
            {output.finalParts.map((part, index) => {
              const speakerColors = getSpeakerColors(part.speaker)
              return (
                <div
                  key={`final-${index}`}
                  className={cn(
                    'p-4 bg-white rounded-lg shadow-sm border-l-4 transition-all duration-300',
                    'hover:shadow-md animate-slide-in-bottom',
                    speakerColors ? speakerColors.border : colors.border
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {part.speaker !== null && part.speaker !== undefined && speakerColors && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className={cn('text-sm font-semibold px-3 py-1 rounded-full', speakerColors.bg, speakerColors.text)}>
                        Speaker {part.speaker + 1}
                      </span>
                    </div>
                  )}
                  <p className="text-gray-900 leading-relaxed">
                    {part.text.trim()}
                  </p>
                </div>
              )
            })}

            {/* Interim/partial transcriptions */}
            {output.nonFinalParts.map((part, index) => (
              <div
                key={`interim-${index}`}
                className={cn(
                  'p-4 rounded-lg border-2 border-dashed transition-all duration-200',
                  'animate-pulse',
                  colors.accentBg,
                  colors.accentBorder
                )}
              >
                <p className="text-gray-600 italic leading-relaxed">{part.text}</p>
              </div>
            ))}

            {/* Info messages */}
            {output.infoMessages.map((info, index) => (
              <div
                key={`info-${index}`}
                className={cn(
                  'p-3 rounded-lg text-sm transition-all duration-300',
                  info.level === 'error' && 'bg-red-50 border border-red-200 text-red-800',
                  info.level === 'warning' && 'bg-yellow-50 border border-yellow-200 text-yellow-800',
                  info.level === 'info' && 'bg-blue-50 border border-blue-200 text-blue-800'
                )}
              >
                {info.message}
              </div>
            ))}

            {/* Empty state */}
            {output.finalParts.length === 0 &&
             output.nonFinalParts.length === 0 &&
             !output.statusMessage &&
             !output.error && (
              <div className="text-center text-gray-400 py-16 animate-fade-in">
                <svg className="mx-auto h-16 w-16 mb-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <p className="text-lg font-medium">Waiting for audio</p>
                <p className="text-sm mt-1">Start speaking to see transcription</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
