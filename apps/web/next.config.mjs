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
};

export default nextConfig;

