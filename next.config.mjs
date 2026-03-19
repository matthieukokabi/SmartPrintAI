const cspMode = (process.env.CSP_MODE || 'hardened').trim().toLowerCase()
const isLegacyCspMode = cspMode === 'legacy'
const scriptSrcTokens = ["'self'", 'https:']
if (isLegacyCspMode) {
  scriptSrcTokens.splice(1, 0, "'unsafe-inline'", "'unsafe-eval'")
}
const scriptSrcElementTokens = ["'self'", "'unsafe-inline'", 'https:']

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src ${scriptSrcTokens.join(' ')}`,
  ...(isLegacyCspMode ? [] : [
    `script-src-elem ${scriptSrcElementTokens.join(' ')}`,
    "script-src-attr 'none'",
  ]),
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
  "object-src 'none'",
].join('; ')

const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
    deviceSizes: [640, 750, 828, 1080, 1200, 1600, 1920],
    imageSizes: [96, 128, 256, 384],
    remotePatterns: [
      { protocol: 'https', hostname: 'files.cdn.printful.com' },
      { protocol: 'https', hostname: 'az412349.cdn.gooten.com' },
      { protocol: 'https', hostname: 'appassets.azureedge.net' },
      { protocol: 'https', hostname: 's3.amazonaws.com', pathname: '/gooten-imgmanip/**' },
      { protocol: 'https', hostname: 'smartprintai.com' },
      { protocol: 'https', hostname: 'www.smartprintai.com' },
      { protocol: 'http', hostname: 'localhost', port: '9000' },
      { protocol: 'http', hostname: '127.0.0.1', port: '9000' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig;
