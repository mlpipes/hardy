/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['better-auth', '@better-auth/prisma']
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has TypeScript type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  output: 'standalone',
  generateBuildId: async () => {
    return 'hardy-auth-build'
  },
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        './node_modules/swc/lib',
        './node_modules/esbuild',
        './node_modules/webpack',
        './node_modules/rollup'
      ]
    }
  },
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3001',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ]
      }
    ]
  },
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: '/api/auth/:path*'
      },
      {
        source: '/api/oauth/:path*', 
        destination: '/api/oauth/:path*'
      },
      {
        source: '/api/fhir/:path*',
        destination: '/api/fhir/:path*'
      }
    ]
  }
}

module.exports = nextConfig