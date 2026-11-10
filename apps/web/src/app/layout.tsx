import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ASKR EV — Electric Mobility Platform',
  description:
    'Official corporate portal of ASKR EV Mobility Private Limited. Electric motorcycles, community membership, and verified booking management.',
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
