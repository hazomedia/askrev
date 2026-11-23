'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminSettingsPaymentRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin?tab=payment-settings');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center font-sans">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center max-w-sm w-full space-y-2">
        <div className="text-sm font-bold text-[#253247]">Loading Payment Settings...</div>
        <p className="text-xs text-slate-500">Redirecting to Payment & Gateway Configuration</p>
      </div>
    </div>
  );
}
