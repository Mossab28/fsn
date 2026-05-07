import { extname, dirname, basename, join } from 'path'
import { existsSync, unlinkSync } from 'fs'
import { spawn } from 'child_process'

const AUDIO_VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mp3', '.wav', '.webm', '.ogg', '.m4a', '.flac', '.aac', '.mov', '.mkv',
])

const AUDIO_VIDEO_MIMES = new Set([
  'video/mp4', 'audio/mpeg', 'audio/wav', 'audio/webm',
  'video/webm', 'audio/ogg', 'audio/mp4', 'audio/flac',
  'audio/aac', 'audio/x-m4a',
])

/**
 * Vérifie si un fichier est un fichier audio/vidéo transcriptible.
 */
export function isTranscribable(mimeType: string, filePath: string): boolean {
  const ext = extname(filePath).toLowerCase()
  return AUDIO_VIDEO_MIMES.has(mimeType) || AUDIO_VIDEO_EXTENSIONS.has(ext)
}

/**
 * Convertit un fichier audio/vidéo en WAV 16 kHz mono via ffmpeg
 * (format requis par Whisper.cpp).
 */
function convertToWav(inputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const wavPath = join(dirname(inputPath), basename(inputPath, extname(inputPath)) + '.wav')
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-i', inputPath,
      '-ar', '16000',
      '-ac', '1',
      '-c:a', 'pcm_s16le',
      wavPath,
    ])

    let stderr = ''
    ffmpeg.stderr.on('data', (data) => { stderr += data.toString() })
    ffmpeg.on('close', (code) => {
      if (code === 0 && existsSync(wavPath)) {
        resolve(wavPath)
      } else {
        reject(new Error(`ffmpeg failed (code ${code}): ${stderr.slice(-500)}`))
      }
    })
    ffmpeg.on('error', reject)
  })
}

/**
 * Transcrit un fichier audio/vidéo en texte via Whisper.cpp tournant localement.
 * Pas d'API externe, 100% offline.
 *
 * Modèle utilisé : "small" (multilingual, ~466 Mo).
 * Téléchargé automatiquement à la première utilisation par nodejs-whisper.
 */
export async function transcribeAudioVideo(filePath: string, _mimeType: string): Promise<string | null> {
  let wavPath: string | null = null
  try {
    // 1. Convert to WAV via ffmpeg (Whisper.cpp requires WAV 16kHz mono)
    wavPath = await convertToWav(filePath)

    // 2. Run Whisper.cpp via nodejs-whisper
    const { nodewhisper } = await import('nodejs-whisper')

    await nodewhisper(wavPath, {
      modelName: process.env.WHISPER_MODEL ?? 'small',
      autoDownloadModelName: process.env.WHISPER_MODEL ?? 'small',
      removeWavFileAfterTranscription: false,
      withCuda: false,
      whisperOptions: {
        outputInText: true,
        outputInJson: false,
        outputInSrt: false,
        outputInVtt: false,
        translateToEnglish: false,
        wordTimestamps: false,
        timestamps_length: 0,
        splitOnWord: false,
        language: 'fr',
      },
    })

    // 3. Read the generated .txt file
    const txtPath = wavPath.replace(/\.wav$/, '.txt')
    if (!existsSync(txtPath)) {
      console.warn(`[Whisper] No txt output found at ${txtPath}`)
      return null
    }

    const fs = await import('fs/promises')
    const text = await fs.readFile(txtPath, 'utf-8')

    // Cleanup the .txt output (we keep the original audio/video file)
    try { unlinkSync(txtPath) } catch { /* ignore */ }

    return text.trim() || null
  } catch (error) {
    console.error('[Whisper] Transcription error:', error)
    return null
  } finally {
    // Always cleanup the temporary WAV file
    if (wavPath && existsSync(wavPath)) {
      try { unlinkSync(wavPath) } catch { /* ignore */ }
    }
  }
}
