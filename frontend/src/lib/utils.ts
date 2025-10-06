import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function floatTo16BitPCM(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length)
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]))
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return int16Array
}

export function resample(
  inputBuffer: Float32Array,
  inputSampleRate: number,
  targetSampleRate: number
): Float32Array {
  if (inputSampleRate === targetSampleRate) {
    return inputBuffer
  }
  const inputLength = inputBuffer.length
  const outputLength = Math.floor(
    (inputLength * targetSampleRate) / inputSampleRate
  )
  if (outputLength === 0) {
    return new Float32Array(0)
  }
  const outputBuffer = new Float32Array(outputLength)
  for (let i = 0; i < outputLength; i++) {
    const t = (i * (inputLength - 1)) / (outputLength - 1)
    const index = Math.floor(t)
    const frac = t - index
    const val1 = inputBuffer[index]
    const val2 = inputBuffer[index + 1]

    if (val2 === undefined) {
      outputBuffer[i] = val1
    } else {
      outputBuffer[i] = val1 + (val2 - val1) * frac
    }
  }
  return outputBuffer
}

export function getApiUrl(): string {
  // 1. Use explicit environment variable if set
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }

  // 2. Auto-detect Render production environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname

    // If running on Render.com, use the production backend URL
    if (hostname.includes('onrender.com')) {
      return 'https://stt-compare-api.onrender.com'
    }
  }

  // 3. Default to localhost for development
  return 'http://localhost:8000'
}