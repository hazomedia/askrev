'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WithdrawPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard?tab=withdraw');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F9FC]">
      <div className="text-center space-y-2">
        <div className="animate-spin w-8 h-8 border-2 border-[#165DAD] border-t-transparent rounded-full mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Redirecting to Withdrawal Portal...</p>
      </div>
    </div>
  );
}
