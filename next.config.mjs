const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'files.cdn.printful.com' },
      { protocol: 'http', hostname: 'localhost', port: '9000' }
    ]
  }
};

export default nextConfig;
