export type ProviderName = 'speechmatics' | 'deepgram'

export interface TranscriptPart {
  text: string
  speaker?: number | null
  language?: string | null
  start_ms?: number | null
  end_ms?: number | null
  confidence?: number | null
  is_final: boolean
}

export interface InfoMessage {
  message: string
  level: 'info' | 'warning' | 'error'
}

export interface ProviderOutput {
  statusMessage: string
  finalParts: TranscriptPart[]
  nonFinalParts: TranscriptPart[]
  error: string
  infoMessages: InfoMessage[]
}

export type ProviderOutputs = Record<ProviderName, ProviderOutput>

export type AudioRecordingState =
  | 'idle'
  | 'starting'
  | 'connecting'
  | 'recording'
  | 'stopping'

export type RadioStreamState =
  | 'idle'
  | 'connecting'
  | 'streaming'
  | 'stopping'

export interface SpeechmaticsConfig {
  apiKey: string
  language: string
  enablePunctuation: boolean
  enableDiarization: boolean
  enablePartials: boolean
  customDictionary: string[]
  operatingPoint: string
  maxDelay: number
  endOfUtteranceSilenceTrigger: number
  endOfUtteranceMaxDelay: number
  endOfUtteranceMode: string
  speakerSensitivity: number
  maxSpeakers: number
  preferCurrentSpeaker: boolean
}

export interface DeepgramConfig {
  apiKey: string
  language: string
  model: string
  punctuate: boolean
  interim_results: boolean
  endpointing: number
  vad_events: boolean
  smart_format: boolean
  filler_words: boolean
  numerals: boolean
  diarize: boolean
}

export interface AudioConfig {
  sampleRate: number
  channels: number
  encoding: string
  chunkDuration: number
}

export interface AppConfig {
  speechmatics: SpeechmaticsConfig
  deepgram: DeepgramConfig
  audio: AudioConfig
}