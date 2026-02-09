/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const apiBackendUrl = process.env.API_BACKEND_URL;
    if (!apiBackendUrl) {
      return [];
    }
    return [
      {
        source: '/v1/:path*',
        destination: `${apiBackendUrl}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
