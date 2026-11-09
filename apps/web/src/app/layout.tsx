import './globals.css';
import type { Metadata } from 'next';
import Navbar from '../components/Navbar';

export const metadata: Metadata = {
  title: 'ASKR EV — High-Performance EV Ecosystem & Membership Platform',
  description: 'Enterprise EV Booking, Membership Management, Shopping Vouchers, and Financial Ledger Engine.',
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
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        <footer className="bg-navy-950 border-t border-navy-800/80 py-8 px-4 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <span className="font-bold text-slate-300">ASKR EV Mobility Pvt. Ltd.</span> &copy; 2026. All rights reserved.
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <span className="text-emerald-400">Strict Direct Selling Compliance Mode</span>
              <span>•</span>
              <span>Currency: INR (₹)</span>
              <span>•</span>
              <span>Timezone: Asia/Kolkata</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
