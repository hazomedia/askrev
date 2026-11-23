import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.askrevdrive.com'),
  title: {
    default: 'ASKR EV — Electric Mobility Platform',
    template: '%s | ASKR EV',
  },
  description:
    'Official corporate portal of ASKR EV. Next-generation electric mobility featuring Electric Bikes, Electric Cycles, and Electric Jeeps.',
  keywords: [
    'ASKR EV',
    'Electric Vehicles',
    'Electric Bikes',
    'Electric Cycles',
    'Electric Jeeps',
    'Clean Mobility',
    'PMSM Motor',
    'Sustainable Transport',
  ],
  authors: [{ name: 'ASKR EV' }],
  creator: 'ASKR EV',
  publisher: 'ASKR EV',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: 'ASKR EV — Electric Mobility Platform',
    description:
      'The Future Moves Electric. Discover next-generation electric motorcycles, electric cycles, and all-terrain electric jeeps.',
    url: 'https://www.askrevdrive.com',
    siteName: 'ASKR EV',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/brand/askrev-full-logo.png',
        width: 2048,
        height: 684,
        alt: 'ASKR EV Mobility',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ASKR EV — Electric Mobility Platform',
    description:
      'The Future Moves Electric. Next-generation electric bikes, cycles, and electric jeeps.',
    creator: '@askrev',
    images: ['/brand/askrev-full-logo.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-48.png', type: 'image/png', sizes: '48x48' },
      { url: '/brand/askrev-icon.webp', type: 'image/webp' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: ['/favicon.ico'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-[#253247] flex flex-col antialiased selection:bg-[#165DAD] selection:text-white font-sans">
        {children}
      </body>
    </html>
  );
}
