import Anthropic from '@anthropic-ai/sdk'
import { readFile } from 'fs/promises'
import { extname } from 'path'

const AUDIO_VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mp3', '.wav', '.webm', '.ogg', '.m4a', '.flac', '.aac',
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
 * Transcrit un fichier audio/vidéo en texte via l'API Claude.
 * Utilise l'encodage base64 pour envoyer le fichier audio.
 * Limite : fichiers de moins de 25 Mo pour l'envoi à l'API.
 */
export async function transcribeAudioVideo(filePath: string, mimeType: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.warn('ANTHROPIC_API_KEY non configurée — transcription ignorée')
    return null
  }

  try {
    const buffer = await readFile(filePath)

    // Limiter à 25 Mo pour l'API
    if (buffer.length > 25 * 1024 * 1024) {
      console.warn('Fichier trop volumineux pour la transcription automatique (> 25 Mo)')
      return null
    }

    const base64Data = buffer.toString('base64')

    // Déterminer le type média pour Claude
    const mediaType = resolveMediaType(mimeType, filePath)

    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 16000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: mediaType as 'application/pdf',
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: 'Transcris intégralement le contenu audio/vidéo de ce fichier en français. Retourne uniquement la transcription textuelle, sans commentaires ni mise en forme. Si le fichier contient plusieurs intervenants, indique les changements de locuteur.',
            },
          ],
        },
      ],
    })

    const textBlock = message.content.find((b) => b.type === 'text')
    return textBlock ? textBlock.text : null
  } catch (error) {
    console.error('Erreur transcription audio/vidéo:', error)
    return null
  }
}

function resolveMediaType(mimeType: string, filePath: string): string {
  if (AUDIO_VIDEO_MIMES.has(mimeType)) return mimeType

  const ext = extname(filePath).toLowerCase()
  const mapping: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.webm': 'video/webm',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.flac': 'audio/flac',
    '.aac': 'audio/aac',
  }
  return mapping[ext] || 'application/octet-stream'
}
