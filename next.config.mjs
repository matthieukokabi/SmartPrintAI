const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'files.cdn.printful.com' },
      { protocol: 'https', hostname: 'smartprintai.com' },
      { protocol: 'https', hostname: 'www.smartprintai.com' },
      { protocol: 'http', hostname: 'localhost', port: '9000' },
      { protocol: 'http', hostname: '127.0.0.1', port: '9000' }
    ]
  }
};

export default nextConfig;
