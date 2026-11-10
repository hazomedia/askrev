import './globals.css';
import type { Metadata } from 'next';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export const metadata: Metadata = {
  title: 'ASKR EV — High-Torque Electric Mobility & Verified Member Platform',
  description:
    'Experience high-performance zero-emission EV motorbikes, transparent direct community rewards, and verified shopping voucher commerce with ASKR EV Mobility.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-navy-950 text-slate-100 flex flex-col antialiased selection:bg-electric-500 selection:text-white">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
