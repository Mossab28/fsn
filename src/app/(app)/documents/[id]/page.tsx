import React from 'react'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import Link from 'next/link'
import {
  ArrowLeft,
  Download,
  FileText,
  BarChart2,
  Image as ImageIcon,
  File,
  Calendar,
  User,
  HardDrive,
  Tag,
} from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/Badge'
import { formatBytes, formatDate, parseTags } from '@/lib/utils'
import type { DocumentWithRelations } from '@/types'

interface DocumentDetailPageProps {
  params: Promise<{ id: string }>
}

function getFileTypeConfig(mimeType: string) {
  if (mimeType === 'application/pdf') {
    return { icon: <FileText size={48} />, label: 'PDF', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.12)' }
  }
  if (mimeType.includes('word') || mimeType.includes('document')) {
    return { icon: <FileText size={48} />, label: 'Word', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.12)' }
  }
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
    return { icon: <BarChart2 size={48} />, label: 'Excel', color: '#22C55E', bgColor: 'rgba(34, 197, 94, 0.12)' }
  }
  if (mimeType.startsWith('image/')) {
    return { icon: <ImageIcon size={48} />, label: 'Image', color: '#A78BFA', bgColor: 'rgba(167, 139, 250, 0.12)' }
  }
  return { icon: <File size={48} />, label: 'Fichier', color: '#71717A', bgColor: 'rgba(113, 113, 122, 0.12)' }
}

function MetadataRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 0',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-raised)',
          color: 'var(--text-tertiary)',
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div style={{ flex: 1 }}>
        <span
          style={{
            display: 'block',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
            marginBottom: '1px',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            color: 'var(--text-primary)',
            fontWeight: 500,
          }}
        >
          {value}
        </span>
      </div>
    </div>
  )
}

export default async function DocumentDetailPage({ params }: DocumentDetailPageProps) {
  const session = await getServerSession(authOptions)
  if (!session) notFound()

  const { id } = await params

  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      uploader: { select: { id: true, name: true, email: true, role: true, createdAt: true } },
      category: true,
    },
  }) as DocumentWithRelations | null

  if (!document) notFound()

  const fileType = getFileTypeConfig(document.mimeType)
  const isImage = document.mimeType.startsWith('image/')
  const isPdf = document.mimeType === 'application/pdf'

  return (
    <div style={{ padding: '0 0 60px' }}>
      {/* Back navigation */}
      <div style={{ marginBottom: '28px' }}>
        <Link
          href="/documents"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            transition: 'color var(--transition)',
            padding: '6px 0',
          }}
        >
          <ArrowLeft size={15} />
          Documents
        </Link>
      </div>

      {/* Two-column layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '3fr 2fr',
          gap: '32px',
          alignItems: 'start',
        }}
      >
        {/* LEFT: Preview area */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            minHeight: '480px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Preview header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
              }}
            >
              Aperçu
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 8px',
                borderRadius: '4px',
                background: fileType.bgColor,
                color: fileType.color,
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {fileType.label}
            </span>
          </div>

          {/* Preview content */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              minHeight: '420px',
            }}
          >
            {isPdf && (
              <iframe
                src={`/api/documents/${document.id}/download`}
                title={document.title}
                style={{
                  width: '100%',
                  height: '500px',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  background: '#fff',
                }}
              />
            )}

            {isImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/documents/${document.id}/download`}
                alt={document.title}
                style={{
                  maxWidth: '100%',
                  maxHeight: '500px',
                  borderRadius: 'var(--radius-md)',
                  objectFit: 'contain',
                  border: '1px solid var(--border)',
                }}
              />
            )}

            {!isPdf && !isImage && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '20px',
                  textAlign: 'center',
                  padding: '40px',
                }}
              >
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: 'var(--radius-xl)',
                    background: fileType.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: fileType.color,
                  }}
                >
                  {fileType.icon}
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      margin: '0 0 6px',
                    }}
                  >
                    Aperçu non disponible
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      margin: '0 0 20px',
                    }}
                  >
                    {document.filename}
                  </p>
                  <a
                    href={`/api/documents/${document.id}/download`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      background: 'var(--accent)',
                      color: '#FFFFFF',
                      borderRadius: 'var(--radius-md)',
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      transition: 'filter var(--transition)',
                    }}
                  >
                    <Download size={15} />
                    Télécharger pour consulter
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Metadata panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Title card */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              padding: '24px',
            }}
          >
            {document.category && (
              <div style={{ marginBottom: '12px' }}>
                <Badge variant="accent">{document.category.name}</Badge>
              </div>
            )}

            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '22px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: '0 0 10px',
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
              }}
            >
              {document.title}
            </h1>

            {document.description && (
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  margin: '0 0 20px',
                  lineHeight: 1.65,
                }}
              >
                {document.description}
              </p>
            )}

            {/* Metadata grid */}
            <div style={{ marginTop: document.description ? '4px' : '8px' }}>
              {document.authorName && (
                <MetadataRow icon={<User size={14} />} label="Auteur" value={document.authorName} />
              )}
              {document.publishedAt && (
                <MetadataRow
                  icon={<Calendar size={14} />}
                  label="Date de publication"
                  value={formatDate(document.publishedAt)}
                />
              )}
              <MetadataRow icon={<HardDrive size={14} />} label="Taille" value={formatBytes(document.fileSize)} />
              <MetadataRow icon={<FileText size={14} />} label="Format" value={fileType.label} />
            </div>

            {/* Tags */}
            {parseTags(document.tags).length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '10px',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  <Tag size={12} />
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Tags
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {parseTags(document.tags).map((tag) => (
                    <span
                      key={tag}
                      style={{
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        background: 'var(--bg-raised)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        fontSize: '12px',
                        fontWeight: 500,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Download CTA */}
          <a
            href={`/api/documents/${document.id}/download`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '13px 20px',
              background: 'var(--accent)',
              color: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'filter var(--transition)',
              letterSpacing: '-0.01em',
            }}
          >
            <Download size={17} />
            Télécharger le document
          </a>

          {/* Uploader info */}
          <div
            style={{
              padding: '16px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                color: 'var(--text-tertiary)',
                margin: '0 0 4px',
              }}
            >
              Mis en ligne par
            </p>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                margin: '0 0 2px',
                fontWeight: 500,
              }}
            >
              {document.uploader.name}
            </p>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                color: 'var(--text-tertiary)',
                margin: 0,
              }}
            >
              le {formatDate(document.createdAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
