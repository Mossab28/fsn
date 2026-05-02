import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '52mb',
    },
  },
  serverExternalPackages: ['bcryptjs', 'pdf-parse', 'mammoth', 'adm-zip'],
}

export default nextConfig
