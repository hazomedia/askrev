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
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ASKR EV — Electric Mobility Platform',
    description:
      'The Future Moves Electric. Next-generation electric bikes, cycles, and electric jeeps.',
    creator: '@askrev',
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
