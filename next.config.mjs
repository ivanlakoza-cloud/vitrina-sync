/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cms-q7ms.onrender.com', // твой домен Directus
        pathname: '/assets/**',
      },
    ],
  },
};

export default nextConfig;
