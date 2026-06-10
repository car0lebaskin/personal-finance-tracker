import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vault — Personal Finance Dashboard',
    short_name: 'Vault',
    description: 'Track your net worth, investments, retirement goals, and portfolio insights.',
    start_url: '/',
    display: 'standalone',
    background_color: '#080B08',
    theme_color: '#080B08',
    icons: [
      {
        src: '/vault-icon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/vault-icon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      {
        src: '/favicon.svg',
        sizes: '64x64',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
