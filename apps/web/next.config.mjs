/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@askrev/shared', '@askrev/ui'],
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'askrevdrive.com',
          },
        ],
        destination: 'https://www.askrevdrive.com/:path*',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
    return [
      {
        source: '/api/media/:path*',
        destination: `${apiBase}/media/:path*`,
      },
    ];
  },
};

export default nextConfig;
