/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@askrev/shared', '@askrev/ui'],
  reactStrictMode: true,
};

export default nextConfig;
