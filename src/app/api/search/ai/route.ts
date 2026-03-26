import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { parseTags } from '@/lib/utils'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface AISearchFilters {
  categoryIds: string[]
  mimeTypes: string[]
  dateFrom: string | null
  dateTo: string | null
}

interface AISearchResponse {
  filters: AISearchFilters
  documentIds: string[]
  explanation: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body: unknown = await request.json()
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { query } = body as Record<string, unknown>
    if (typeof query !== 'string' || !query.trim()) {
      return NextResponse.json(
        { error: 'Le champ "query" est requis' },
        { status: 400 }
      )
    }

    const sanitizedQuery = query.trim().slice(0, 500)

    const [categories, documents] = await Promise.all([
      prisma.category.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.document.findMany({
        select: {
          id: true,
          title: true,
          description: true,
          categoryId: true,
          tags: true,
          mimeType: true,
          authorName: true,
          publishedAt: true,
        },
        take: 200,
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const categoriesJson = JSON.stringify(
      categories.map((c) => ({ id: c.id, name: c.name }))
    )

    const documentsJson = JSON.stringify(
      documents.map((d) => ({
        id: d.id,
        titre: d.title,
        description: d.description ?? '',
        categorieId: d.categoryId,
        tags: parseTags(d.tags),
        type: d.mimeType,
        auteur: d.authorName ?? '',
        date: d.publishedAt
          ? new Date(d.publishedAt).toISOString().split('T')[0]
          : null,
      }))
    )

    const prompt = `Tu es un assistant de recherche documentaire pour la Filiere Sante Numerique.
L'utilisateur cherche des documents avec cette requete : "${sanitizedQuery}"

Voici les categories disponibles :
${categoriesJson}

Voici les documents disponibles (id, titre, description, categorie, tags, type, auteur, date) :
${documentsJson}

Analyse la requete et retourne un JSON avec :
- "filters": { "categoryIds": [...], "mimeTypes": [...], "dateFrom": "YYYY-MM-DD" or null, "dateTo": "YYYY-MM-DD" or null }
- "documentIds": [liste ordonnee des IDs les plus pertinents, max 20]
- "explanation": "Courte explication en francais de ce qui a ete trouve"

Reponds UNIQUEMENT avec le JSON, sans aucun texte avant ou apres.`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = message.content.find((block) => block.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json(
        { error: 'Reponse IA invalide' },
        { status: 502 }
      )
    }

    let aiResponse: AISearchResponse
    try {
      const rawText = textBlock.text.trim()
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      aiResponse = JSON.parse(jsonMatch[0]) as AISearchResponse
    } catch {
      console.error('Failed to parse AI response:', textBlock.text)
      return NextResponse.json(
        { error: 'Impossible de traiter la reponse IA' },
        { status: 502 }
      )
    }

    if (
      !aiResponse.documentIds ||
      !Array.isArray(aiResponse.documentIds) ||
      !aiResponse.filters
    ) {
      return NextResponse.json(
        { error: 'Format de reponse IA invalide' },
        { status: 502 }
      )
    }

    const validIds = aiResponse.documentIds
      .filter((id): id is string => typeof id === 'string')
      .slice(0, 20)

    let fullDocuments: Awaited<ReturnType<typeof prisma.document.findMany>> = []

    if (validIds.length > 0) {
      const unorderedDocs = await prisma.document.findMany({
        where: { id: { in: validIds } },
        include: {
          uploader: {
            select: { id: true, name: true, email: true, role: true, createdAt: true },
          },
          category: true,
        },
      })

      const docMap = new Map(unorderedDocs.map((d) => [d.id, d]))
      fullDocuments = validIds
        .map((id) => docMap.get(id))
        .filter(
          (d): d is NonNullable<typeof d> => d !== undefined
        )
    }

    return NextResponse.json({
      documents: fullDocuments,
      filters: {
        categoryIds: Array.isArray(aiResponse.filters.categoryIds)
          ? aiResponse.filters.categoryIds
          : [],
        mimeTypes: Array.isArray(aiResponse.filters.mimeTypes)
          ? aiResponse.filters.mimeTypes
          : [],
        dateFrom: aiResponse.filters.dateFrom ?? null,
        dateTo: aiResponse.filters.dateTo ?? null,
      },
      explanation: aiResponse.explanation ?? '',
      total: fullDocuments.length,
    })
  } catch (error) {
    console.error('POST /api/search/ai error:', error)

    if (
      error instanceof Error &&
      (error.message.includes('API') ||
        error.message.includes('authentication') ||
        error.message.includes('rate'))
    ) {
      return NextResponse.json(
        { error: 'Service IA temporairement indisponible' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
