/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdfkit', 'canvas', 'puppeteer'],
  outputFileTracingRoot: process.cwd(),
  productionBrowserSourceMaps: false,
  typescript: {
    ignoreBuildErrors: true,
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'recharts',
      'date-fns',
      'intl'
    ],
  },

  async redirects() {
    return [
      {
        source: '/admin/logs',
        destination: '/admin/audit-logs',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/instructor/:path*',
        destination: '/admin/:path*',
      },
      {
        source: '/uploads/:filename',
        destination: '/api/uploads/files/:filename',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '0',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
