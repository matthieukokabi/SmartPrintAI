import type { MetadataRoute } from 'next'

const SITE_URL = 'https://smartprintai.com'

export default function robots(): MetadataRoute.Robots {
      return {
              rules: [
                  {
                              userAgent: '*',
                              allow: '/',
                              disallow: [
                                            '/api/',
                                            '/signin',
                                            '/account',
                                            '/orders',
                                            '/cart',
                                            '/success',
                                            '/admin',
                                            '/create?',
                                            '/*?productId=',
                                            '/*?color=',
                                            '/*?size=',
                                          ],
                  },
                      ],
              sitemap: `${SITE_URL}/sitemap.xml`,
              host: SITE_URL,
      }
}
