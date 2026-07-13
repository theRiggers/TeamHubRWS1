import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Headquarter RWS2',
    short_name: 'Headquarter',
    description: 'Teamverwaltung für die Mannschaft RWS2',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#d12d2d',
    icons: [
      {
        src: '/logo.png',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  }
}
