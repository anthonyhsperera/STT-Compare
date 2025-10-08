import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import Hls from 'hls.js'
import type {
  ProviderName,
  ProviderOutputs,
  ProviderOutput,
  AudioRecordingState,
  RadioStreamState,
  TranscriptPart,
  AppConfig
} from '../types'
import { floatTo16BitPCM, resample, getApiUrl } from '../lib/utils'
import { loadConfig, saveConfig } from '../lib/config'

interface ComparisonContextState {
  recordingState: AudioRecordingState
  radioStreamState: RadioStreamState
  providerOutputs: ProviderOutputs
  appError: string | null
  config: AppConfig
  radioVolume: number
}

interface ComparisonContextActions {
  startRecording: () => Promise<void>
  stopRecording: () => void
  startRadioStream: (streamUrl: string, stationName: string) => Promise<void>
  stopRadioStream: () => void
  clearTranscripts: () => void
  updateConfig: (newConfig: AppConfig) => void
  testConnection: (provider: ProviderName) => Promise<boolean>
  setRadioVolume: (volume: number) => void
}

type ComparisonContextType = ComparisonContextState & ComparisonContextActions

const initializeProviderOutputs = (): ProviderOutputs => {
  const initialOutput: ProviderOutput = {
    statusMessage: '',
    finalParts: [],
    nonFinalParts: [],
    error: '',
    infoMessages: []
  }
  return {
    speechmatics: { ...initialOutput },
    deepgram: { ...initialOutput }
  }
}

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined)

interface CustomWindow extends Window {
  webkitAudioContext?: typeof AudioContext
}

export const ComparisonProvider = ({ children }: { children: React.ReactNode }) => {
  const [recordingState, setRecordingState] = useState<AudioRecordingState>('idle')
  const [radioStreamState, setRadioStreamState] = useState<RadioStreamState>('idle')
  const [providerOutputs, setProviderOutputs] = useState<ProviderOutputs>(initializeProviderOutputs)
  const [appError, setAppError] = useState<string | null>(null)
  const [config, setConfig] = useState<AppConfig>(loadConfig)
  const [radioVolume, setRadioVolumeState] = useState<number>(1.0)

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null)
  const recordingStateRef = useRef(recordingState)

  // Radio stream refs
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const hlsRef = useRef<Hls | null>(null)
  const radioAudioContextRef = useRef<AudioContext | null>(null)
  const radioSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)
  const radioProcessorNodeRef = useRef<ScriptProcessorNode | null>(null)
  const radioGainNodeRef = useRef<GainNode | null>(null)
  const radioWsRef = useRef<WebSocket | null>(null)
  const radioStreamStateRef = useRef(radioStreamState)

  const resetProviderOutputs = useCallback(() => {
    setProviderOutputs(initializeProviderOutputs())
  }, [])

  const clearTranscripts = useCallback(() => {
    resetProviderOutputs()
    setAppError(null)
  }, [resetProviderOutputs])

  const updateConfig = useCallback((newConfig: AppConfig) => {
    setConfig(newConfig)
    saveConfig(newConfig)
  }, [])

  const testConnection = useCallback(async (provider: ProviderName): Promise<boolean> => {
    // This will be implemented when we add the backend
    console.log(`Testing connection for ${provider}`)
    return true
  }, [])

  const setRadioVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume))
    setRadioVolumeState(clampedVolume)
    if (radioGainNodeRef.current) {
      radioGainNodeRef.current.gain.value = clampedVolume
    }
  }, [])

  const stopRecordingInternal = useCallback(() => {
    setRecordingState('stopping')

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect()
      processorNodeRef.current.onaudioprocess = null
      processorNodeRef.current = null
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect()
      sourceNodeRef.current = null
    }

    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error)
      }
      audioContextRef.current = null
    }

    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send('END')
      }
      wsRef.current.onclose = null
      wsRef.current.onerror = null
      wsRef.current.onmessage = null
      wsRef.current.onopen = null
      if (
        wsRef.current.readyState !== WebSocket.CLOSING &&
        wsRef.current.readyState !== WebSocket.CLOSED
      ) {
        wsRef.current.close()
      }
      wsRef.current = null
    }

    setProviderOutputs(prev => {
      const newState = { ...prev }
      Object.keys(newState).forEach(provider => {
        newState[provider as ProviderName].statusMessage = ''
      })
      return newState
    })

    setRecordingState('idle')
  }, [])

  const startRecording = useCallback(async () => {
    if (recordingState !== 'idle') {
      console.warn('Recording already in progress or starting/stopping.')
      return
    }

    // Validate API keys - at least one is required
    const hasSpeechmatics = !!config.speechmatics.apiKey
    const hasDeepgram = !!config.deepgram.apiKey

    if (!hasSpeechmatics && !hasDeepgram) {
      setAppError('Please provide at least one API key (Speechmatics or Deepgram)')
      return
    }

    setRecordingState('starting')

    // Show info message if only one provider is available
    if (!hasSpeechmatics || !hasDeepgram) {
      const missingProvider = !hasSpeechmatics ? 'Speechmatics' : 'Deepgram'
      const activeProvider = hasSpeechmatics ? 'Speechmatics' : 'Deepgram'
      setAppError(`Only ${activeProvider} will be used (${missingProvider} API key not provided)`)
    } else {
      setAppError(null)
    }

    resetProviderOutputs()

    setProviderOutputs(prev => ({
      speechmatics: { ...prev.speechmatics, statusMessage: hasSpeechmatics ? 'Initializing...' : 'API key not provided' },
      deepgram: { ...prev.deepgram, statusMessage: hasDeepgram ? 'Initializing...' : 'API key not provided' }
    }))

    try {
      const CustomAudioContext = window.AudioContext || (window as CustomWindow).webkitAudioContext
      if (!CustomAudioContext) throw new Error('AudioContext not supported.')

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'The MediaDevices API is not available in this browser. Please ensure you are running in a secure context (HTTPS).'
        )
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: false,
          echoCancellation: false,
          noiseSuppression: false
        }
      })

      streamRef.current = stream
      const context = new CustomAudioContext()
      audioContextRef.current = context
      sourceNodeRef.current = context.createMediaStreamSource(stream)

      setProviderOutputs(prev => ({
        speechmatics: { ...prev.speechmatics, statusMessage: hasSpeechmatics ? 'Connecting...' : 'API key not provided' },
        deepgram: { ...prev.deepgram, statusMessage: hasDeepgram ? 'Connecting...' : 'API key not provided' }
      }))
      setRecordingState('connecting')

      // Create WebSocket connection
      const apiUrl = getApiUrl()
      const wsUrl = apiUrl.replace(/^http/, 'ws') + '/ws/transcribe'
      wsRef.current = new WebSocket(wsUrl)
      wsRef.current.binaryType = 'arraybuffer'

      wsRef.current.onopen = () => {
        setRecordingState('recording')
        setProviderOutputs(prev => ({
          speechmatics: { ...prev.speechmatics, statusMessage: hasSpeechmatics ? 'Recording...' : 'API key not provided' },
          deepgram: { ...prev.deepgram, statusMessage: hasDeepgram ? 'Recording...' : 'API key not provided' }
        }))

        // Send configuration
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'config',
            config: config
          }))
        }

        const context = audioContextRef.current!
        const source = sourceNodeRef.current!
        const inputSampleRate = context.sampleRate
        const targetSampleRate = config.audio.sampleRate

        processorNodeRef.current = context.createScriptProcessor(4096, 1, 1)
        source.connect(processorNodeRef.current)
        processorNodeRef.current.connect(context.destination)

        processorNodeRef.current.onaudioprocess = (e: AudioProcessingEvent) => {
          const inputData = e.inputBuffer.getChannelData(0)

          // Mute output to prevent feedback
          const outputData = e.outputBuffer.getChannelData(0)
          for (let i = 0; i < outputData.length; i++) {
            outputData[i] = 0
          }

          if (wsRef.current?.readyState === WebSocket.OPEN) {
            const resampledData = resample(inputData, inputSampleRate, targetSampleRate)
            if (resampledData.length > 0) {
              const pcmInt16 = floatTo16BitPCM(resampledData)
              wsRef.current.send(pcmInt16.buffer as ArrayBuffer)
            }
          }
        }
      }

      wsRef.current.onmessage = (event: MessageEvent) => {
        try {
          const rawData = event.data as string
          console.log('Received WebSocket message:', rawData) // Debug log

          const result = JSON.parse(rawData)
          const provider = result.provider as ProviderName

          if (!provider) {
            console.warn('No provider specified in message:', result)
            return
          }

          setProviderOutputs(prev => {
            const newOutputs = { ...prev }
            const currentProviderOutput = { ...prev[provider] }

            if (result.error) {
              currentProviderOutput.error = result.error
              currentProviderOutput.statusMessage = ''
            } else if (result.transcript) {
              currentProviderOutput.error = ''
              if (currentProviderOutput.statusMessage) {
                currentProviderOutput.statusMessage = ''
              }

              const transcriptPart: TranscriptPart = {
                text: result.transcript.text,
                speaker: result.transcript.speaker,
                start_ms: result.transcript.start_ms,
                end_ms: result.transcript.end_ms,
                confidence: result.transcript.confidence,
                is_final: result.transcript.is_final
              }

              if (result.transcript.is_final) {
                currentProviderOutput.finalParts = [
                  ...currentProviderOutput.finalParts,
                  transcriptPart
                ]
                currentProviderOutput.nonFinalParts = []
              } else {
                currentProviderOutput.nonFinalParts = [transcriptPart]
              }
            }

            newOutputs[provider] = currentProviderOutput
            return newOutputs
          })
        } catch (error) {
          console.error('Failed to parse WebSocket message:', event.data, error)
        }
      }

      wsRef.current.onerror = () => setAppError('WebSocket connection error.')
      wsRef.current.onclose = () => {
        if (recordingStateRef.current !== 'idle') {
          stopRecordingInternal()
        }
      }
    } catch (err) {
      console.error('Failed to start recording:', err)
      const message = err instanceof Error ? err.message : 'An unknown error occurred.'
      setAppError(`Failed to start recording: ${message}`)
      stopRecordingInternal()
    }
  }, [config, recordingState, stopRecordingInternal, resetProviderOutputs])

  useEffect(() => {
    recordingStateRef.current = recordingState
  }, [recordingState])

  useEffect(() => {
    radioStreamStateRef.current = radioStreamState
  }, [radioStreamState])

  const stopRecording = useCallback(() => {
    if (recordingState !== 'idle' && recordingState !== 'stopping') {
      stopRecordingInternal()
    }
  }, [recordingState, stopRecordingInternal])

  const stopRadioStreamInternal = useCallback(() => {
    setRadioStreamState('stopping')

    if (radioProcessorNodeRef.current) {
      radioProcessorNodeRef.current.disconnect()
      radioProcessorNodeRef.current.onaudioprocess = null
      radioProcessorNodeRef.current = null
    }

    if (radioGainNodeRef.current) {
      radioGainNodeRef.current.disconnect()
      radioGainNodeRef.current = null
    }

    if (radioSourceNodeRef.current) {
      radioSourceNodeRef.current.disconnect()
      radioSourceNodeRef.current = null
    }

    if (radioAudioContextRef.current) {
      if (radioAudioContextRef.current.state !== 'closed') {
        radioAudioContextRef.current.close().catch(console.error)
      }
      radioAudioContextRef.current = null
    }

    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current.src = ''
      audioElementRef.current = null
    }

    // Clear any errors when stopping
    setAppError(null)

    if (radioWsRef.current) {
      if (radioWsRef.current.readyState === WebSocket.OPEN) {
        radioWsRef.current.send('END')
      }
      radioWsRef.current.onclose = null
      radioWsRef.current.onerror = null
      radioWsRef.current.onmessage = null
      radioWsRef.current.onopen = null
      if (
        radioWsRef.current.readyState !== WebSocket.CLOSING &&
        radioWsRef.current.readyState !== WebSocket.CLOSED
      ) {
        radioWsRef.current.close()
      }
      radioWsRef.current = null
    }

    setProviderOutputs(prev => {
      const newState = { ...prev }
      Object.keys(newState).forEach(provider => {
        newState[provider as ProviderName].statusMessage = ''
      })
      return newState
    })

    setRadioStreamState('idle')
  }, [])

  const startRadioStream = useCallback(async (streamUrl: string, stationName: string) => {
    if (radioStreamState !== 'idle') {
      console.warn('Radio stream already in progress')
      return
    }

    // Validate API keys - at least one is required
    const hasSpeechmatics = !!config.speechmatics.apiKey
    const hasDeepgram = !!config.deepgram.apiKey

    if (!hasSpeechmatics && !hasDeepgram) {
      setAppError('Please provide at least one API key (Speechmatics or Deepgram)')
      return
    }

    setRadioStreamState('connecting')

    // Show info message if only one provider is available
    if (!hasSpeechmatics || !hasDeepgram) {
      const missingProvider = !hasSpeechmatics ? 'Speechmatics' : 'Deepgram'
      const activeProvider = hasSpeechmatics ? 'Speechmatics' : 'Deepgram'
      setAppError(`Only ${activeProvider} will be used (${missingProvider} API key not provided)`)
    } else {
      setAppError(null)
    }

    resetProviderOutputs()

    setProviderOutputs(prev => ({
      speechmatics: { ...prev.speechmatics, statusMessage: hasSpeechmatics ? `Connecting to ${stationName}...` : 'API key not provided' },
      deepgram: { ...prev.deepgram, statusMessage: hasDeepgram ? `Connecting to ${stationName}...` : 'API key not provided' }
    }))

    try {
      const CustomAudioContext = window.AudioContext || (window as CustomWindow).webkitAudioContext
      if (!CustomAudioContext) throw new Error('AudioContext not supported.')

      // Create audio element for HLS stream
      const audio = new Audio()
      audio.crossOrigin = 'anonymous'
      audio.volume = 1.0 // Keep at full volume for transcription quality
      audio.muted = false // Ensure not muted
      audioElementRef.current = audio

      const context = new CustomAudioContext()
      radioAudioContextRef.current = context

      // Create WebSocket connection
      const apiUrl = getApiUrl()
      const wsUrl = apiUrl.replace(/^http/, 'ws') + '/ws/transcribe'
      radioWsRef.current = new WebSocket(wsUrl)
      radioWsRef.current.binaryType = 'arraybuffer'

      // Function to setup audio processing once media is ready
      const setupAudioProcessing = () => {
        if (!audioElementRef.current || !radioAudioContextRef.current) return

        // Prevent multiple setups
        if (radioSourceNodeRef.current) {
          console.log('Audio processing already set up, skipping')
          return
        }

        const audio = audioElementRef.current
        const context = radioAudioContextRef.current

        try {
          // Resume AudioContext if suspended
          if (context.state === 'suspended') {
            context.resume()
          }

          const source = context.createMediaElementSource(audio)
          radioSourceNodeRef.current = source

          const inputSampleRate = context.sampleRate
          const targetSampleRate = config.audio.sampleRate

          radioProcessorNodeRef.current = context.createScriptProcessor(4096, 1, 1)

          // Create gain node for volume control (only affects playback, not transcription)
          const gainNode = context.createGain()
          gainNode.gain.value = radioVolume // Set to current volume
          radioGainNodeRef.current = gainNode

          // Connect audio graph:
          // source -> processor (for transcription at full volume)
          // source -> gainNode -> destination (for playback with volume control)
          source.connect(radioProcessorNodeRef.current)
          source.connect(gainNode)
          gainNode.connect(context.destination)
          radioProcessorNodeRef.current.connect(context.destination)

          radioProcessorNodeRef.current.onaudioprocess = (e: AudioProcessingEvent) => {
            const inputData = e.inputBuffer.getChannelData(0)

            if (radioWsRef.current?.readyState === WebSocket.OPEN) {
              const resampledData = resample(inputData, inputSampleRate, targetSampleRate)
              if (resampledData.length > 0) {
                const pcmInt16 = floatTo16BitPCM(resampledData)
                radioWsRef.current.send(pcmInt16.buffer as ArrayBuffer)
              }
            }
          }

          // Start playing audio after audio graph is set up
          audio.play().catch(err => {
            console.error('Failed to play audio:', err)
            setAppError(`Failed to play stream: ${err.message}`)
            stopRadioStreamInternal()
          })

          setRadioStreamState('streaming')
          setProviderOutputs(prev => ({
            speechmatics: { ...prev.speechmatics, statusMessage: hasSpeechmatics ? `Streaming ${stationName}...` : 'API key not provided' },
            deepgram: { ...prev.deepgram, statusMessage: hasDeepgram ? `Streaming ${stationName}...` : 'API key not provided' }
          }))
        } catch (err) {
          console.error('Failed to setup audio processing:', err)
          setAppError(`Audio setup failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
          stopRadioStreamInternal()
        }
      }

      radioWsRef.current.onopen = () => {
        // Send configuration
        if (radioWsRef.current) {
          radioWsRef.current.send(JSON.stringify({
            type: 'config',
            config: config
          }))
        }
      }

      // Check if it's a direct audio stream (MP3, AAC, etc.) or HLS stream
      const isDirectAudio = /\.(mp3|aac|ogg|wav|flac)(\?.*)?$/i.test(streamUrl) ||
                           !streamUrl.includes('.m3u8')

      if (isDirectAudio) {
        // Direct audio stream - no need for HLS.js
        console.log('Loading direct audio stream:', streamUrl)
        audio.src = streamUrl
        audio.addEventListener('canplay', () => {
          console.log('Direct audio stream ready, setting up audio processing')
          setupAudioProcessing()
        }, { once: true })

        audio.addEventListener('error', (err) => {
          console.error('Audio loading error:', err)
          // Only show error if we're not intentionally stopping
          setRadioStreamState(prevState => {
            if (prevState !== 'stopping' && prevState !== 'idle') {
              setAppError(`Failed to load stream. Check the URL and CORS settings.`)
              stopRadioStreamInternal()
            }
            return prevState
          })
        })
      } else if (Hls.isSupported()) {
        // Use hls.js for HLS streams (Chrome, Firefox)
        console.log('Loading HLS stream with hls.js:', streamUrl)
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true
        })
        hlsRef.current = hls
        hls.loadSource(streamUrl)
        hls.attachMedia(audio)

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('HLS manifest parsed, setting up audio processing')
          setupAudioProcessing()
        })

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            console.error('HLS fatal error:', data)
            setAppError(`Stream error: ${data.type} - ${data.details}`)
            stopRadioStreamInternal()
          }
        })
      } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS support
        console.log('Loading HLS stream with native Safari support:', streamUrl)
        audio.src = streamUrl
        audio.addEventListener('loadedmetadata', () => {
          console.log('Native HLS loaded, setting up audio processing')
          setupAudioProcessing()
        }, { once: true })
      } else {
        throw new Error('Stream format not supported in this browser')
      }

      radioWsRef.current.onmessage = (event: MessageEvent) => {
        try {
          const rawData = event.data as string
          const result = JSON.parse(rawData)
          const provider = result.provider as ProviderName

          if (!provider) {
            console.warn('No provider specified in message:', result)
            return
          }

          setProviderOutputs(prev => {
            const newOutputs = { ...prev }
            const currentProviderOutput = { ...prev[provider] }

            if (result.error) {
              currentProviderOutput.error = result.error
              currentProviderOutput.statusMessage = ''
            } else if (result.transcript) {
              currentProviderOutput.error = ''
              if (currentProviderOutput.statusMessage) {
                currentProviderOutput.statusMessage = ''
              }

              const transcriptPart: TranscriptPart = {
                text: result.transcript.text,
                speaker: result.transcript.speaker,
                start_ms: result.transcript.start_ms,
                end_ms: result.transcript.end_ms,
                confidence: result.transcript.confidence,
                is_final: result.transcript.is_final
              }

              if (result.transcript.is_final) {
                currentProviderOutput.finalParts = [
                  ...currentProviderOutput.finalParts,
                  transcriptPart
                ]
                currentProviderOutput.nonFinalParts = []
              } else {
                currentProviderOutput.nonFinalParts = [transcriptPart]
              }
            }

            newOutputs[provider] = currentProviderOutput
            return newOutputs
          })
        } catch (error) {
          console.error('Failed to parse WebSocket message:', event.data, error)
        }
      }

      radioWsRef.current.onerror = () => setAppError('WebSocket connection error.')
      radioWsRef.current.onclose = () => {
        if (radioStreamStateRef.current !== 'idle') {
          stopRadioStreamInternal()
        }
      }
    } catch (err) {
      console.error('Failed to start radio stream:', err)
      const message = err instanceof Error ? err.message : 'An unknown error occurred.'
      setAppError(`Failed to start radio stream: ${message}`)
      stopRadioStreamInternal()
    }
  }, [config, radioStreamState, stopRadioStreamInternal, resetProviderOutputs, radioVolume])

  const stopRadioStream = useCallback(() => {
    if (radioStreamState !== 'idle' && radioStreamState !== 'stopping') {
      stopRadioStreamInternal()
    }
  }, [radioStreamState, stopRadioStreamInternal])

  useEffect(() => {
    return () => {
      stopRecordingInternal()
      stopRadioStreamInternal()
    }
  }, [stopRecordingInternal, stopRadioStreamInternal])

  const contextValue: ComparisonContextType = {
    recordingState,
    radioStreamState,
    providerOutputs,
    appError,
    config,
    radioVolume,
    startRecording,
    stopRecording,
    startRadioStream,
    stopRadioStream,
    clearTranscripts,
    updateConfig,
    testConnection,
    setRadioVolume
  }

  return (
    <ComparisonContext.Provider value={contextValue}>
      {children}
    </ComparisonContext.Provider>
  )
}

export const useComparison = (): ComparisonContextType => {
  const context = useContext(ComparisonContext)
  if (context === undefined) {
    throw new Error('useComparison must be used within a ComparisonProvider')
  }
  return context
}