/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'api.lewishamCharity.org', 'lewisham-charity-hub-api.onrender.com'],
  },
  async rewrites() {
    // Only use rewrites in development
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:8080/api/:path*',
        },
      ];
    }
    return [];
  },
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/visitor',
        permanent: false,
      },
      {
        source: '/visitor/dashboard',
        destination: '/visitor',
        permanent: false,
      },
      {
        source: '/admin/dashboard',
        destination: '/admin',
        permanent: false,
      },
      {
        source: '/volunteer/dashboard',
        destination: '/volunteer',
        permanent: false,
      },
      {
        source: '/donor/dashboard',
        destination: '/donor',
        permanent: false,
      },
    ];
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  },
};

module.exports = nextConfig;