import { readFile } from 'fs/promises'
import { extname } from 'path'

/**
 * Extrait le texte d'un fichier pour indexation et recherche dans le contenu.
 * Supporte : PDF, DOCX, TXT, CSV, HTML, Markdown
 */
export async function extractTextContent(filePath: string, mimeType: string): Promise<string | null> {
  try {
    const ext = extname(filePath).toLowerCase()

    // Fichiers texte brut
    if (
      mimeType.startsWith('text/') ||
      ['.txt', '.csv', '.html', '.md', '.markdown'].includes(ext)
    ) {
      const buffer = await readFile(filePath)
      const text = buffer.toString('utf-8')
      // Pour HTML, retirer les tags
      if (mimeType === 'text/html' || ext === '.html') {
        return stripHtmlTags(text)
      }
      return text.slice(0, 500_000) // Limiter à 500K chars
    }

    // PDF
    if (mimeType === 'application/pdf' || ext === '.pdf') {
      return await extractPdfText(filePath)
    }

    // DOCX
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      ext === '.docx'
    ) {
      return await extractDocxText(filePath)
    }

    // Types non supportés pour l'extraction (images, Excel, PPT, etc.)
    return null
  } catch (error) {
    console.error(`Erreur extraction texte (${filePath}):`, error)
    return null
  }
}

async function extractPdfText(filePath: string): Promise<string | null> {
  try {
    const pdfParseModule = await import('pdf-parse')
    const pdfParse = ('default' in pdfParseModule ? pdfParseModule.default : pdfParseModule) as (buffer: Buffer) => Promise<{ text: string }>
    const buffer = await readFile(filePath)
    const data = await pdfParse(buffer)
    return data.text?.slice(0, 500_000) || null
  } catch (error) {
    console.error('Erreur extraction PDF:', error)
    return null
  }
}

async function extractDocxText(filePath: string): Promise<string | null> {
  try {
    const mammoth = await import('mammoth')
    const buffer = await readFile(filePath)
    const result = await mammoth.extractRawText({ buffer })
    return result.value?.slice(0, 500_000) || null
  } catch (error) {
    console.error('Erreur extraction DOCX:', error)
    return null
  }
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
