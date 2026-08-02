import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'ZeroKey - Stateless Password Vault',
        short_name: 'ZeroKey',
        description: 'Zero storage, stateless password generator and vault.',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#06b6d4',
        icons: [
            {
                src: '/icons/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icons/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    };
}
