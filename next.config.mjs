/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: "https://api.ordinify.com/:path*",
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-9bbbaa6f881049ec904e8d165b707f3f.r2.dev",
      },
    ],
  },
};

export default nextConfig;
