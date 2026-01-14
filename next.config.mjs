/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/instructor/:path*',
        destination: '/admin/:path*',
      },
    ];
  },
};

export default nextConfig;
