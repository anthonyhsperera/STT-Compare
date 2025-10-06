import type { AppConfig } from '../types'

export const DEFAULT_CONFIG: AppConfig = {
  speechmatics: {
    apiKey: '',
    language: 'en',
    endpoint: 'wss://us2.rt.speechmatics.com/v2',
    enablePunctuation: true,
    enableDiarization: true,
    enablePartials: true,
    additional_vocab: [],
    operatingPoint: 'enhanced',
    maxDelay: 1.2,
    endOfUtteranceSilenceTrigger: 0.8,
    endOfUtteranceMaxDelay: 10.0,
    endOfUtteranceMode: 'adaptive',
    speakerSensitivity: 0.5,
    maxSpeakers: 10,
    preferCurrentSpeaker: false
  },
  deepgram: {
    apiKey: '',
    language: 'en',
    model: 'nova-3',
    punctuate: true,
    interim_results: true,
    endpointing: 300,
    vad_events: true,
    smart_format: true,
    filler_words: false,
    numerals: true,
    diarize: true
  },
  audio: {
    sampleRate: 16000,
    channels: 1,
    encoding: 'pcm16',
    chunkDuration: 100
  }
}

export const CONFIG_STORAGE_KEY = 'stt-compare-config'

export function loadConfig(): AppConfig {
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)

      // Migration: convert old customDictionary to new additional_vocab format
      if (parsed.speechmatics?.customDictionary) {
        const oldDict = parsed.speechmatics.customDictionary
        if (Array.isArray(oldDict)) {
          // Convert string[] to AdditionalVocabItem[]
          parsed.speechmatics.additional_vocab = oldDict.map((word: string) => ({
            content: word
          }))
        }
        // Remove old field
        delete parsed.speechmatics.customDictionary
      }

      // Deep merge to ensure new config fields are included
      const merged = {
        speechmatics: { ...DEFAULT_CONFIG.speechmatics, ...parsed.speechmatics },
        deepgram: { ...DEFAULT_CONFIG.deepgram, ...parsed.deepgram },
        audio: { ...DEFAULT_CONFIG.audio, ...parsed.audio }
      }
      // Save the merged config back to localStorage to persist new fields
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(merged))
      return merged
    }
  } catch (error) {
    console.warn('Failed to load config from localStorage:', error)
  }
  return DEFAULT_CONFIG
}

export function saveConfig(config: AppConfig): void {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config))
  } catch (error) {
    console.warn('Failed to save config to localStorage:', error)
  }
}