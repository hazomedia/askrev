import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ASKR EV Member Portal',
    short_name: 'ASKR EV',
    description: 'Official ASKR EV Member Portal & Electric Mobility Platform',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#0A1128',
    theme_color: '#0A1128',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/favicon-32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/favicon-48.png',
        sizes: '48x48',
        type: 'image/png',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/pwa-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/pwa-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/brand/askrev-icon.webp',
        sizes: '1254x1254',
        type: 'image/webp',
        purpose: 'any',
      },
    ],
  };
}
