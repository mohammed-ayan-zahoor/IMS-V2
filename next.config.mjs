/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdfkit', 'canvas', 'puppeteer', 'node-unrar-js'],
  outputFileTracingRoot: process.cwd(),
  outputFileTracingIncludes: {
    '/api/v1/mou/docx': ['./templates/mou/**/*'],
    '/api/v1/mou/pdf': ['./templates/mou/**/*'],
  },
  productionBrowserSourceMaps: false,
  typescript: {
    ignoreBuildErrors: true,
  },

  experimental: {
    webpackBuildWorker: false,
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
    return {
      beforeFiles: [
        {
          source: '/',
          destination: '/landing.html',
        },
        {
          source: '/quantech',
          destination: '/landing.html',
        },
        {
          source: '/landing',
          destination: '/landing.html',
        },
      ],
      afterFiles: [
        {
          source: '/instructor/:path*',
          destination: '/admin/:path*',
        },
        {
          source: '/uploads/:filename',
          destination: '/api/uploads/files/:filename',
        },
      ],
      fallback: [],
    };
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
