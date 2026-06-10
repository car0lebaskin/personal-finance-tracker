'use client';

import { useRouter } from 'next/navigation';
import { Calculator, Upload } from 'lucide-react';
import ProfileContent from '@/components/ProfileContent';

export default function ProfilePage() {
  const router = useRouter();
  return <><ProfileContent /><div className="fixed left-4 right-4 bottom-5 z-[80] mx-auto max-w-[640px] grid grid-cols-2 gap-2"><button onClick={() => router.push('/planner')} className="rounded-2xl bg-[#a7ff4f] text-[#071006] px-3 py-3 text-xs font-bold flex items-center justify-center gap-2 shadow-2xl"><Calculator className="h-4 w-4"/>Planner</button><button onClick={() => router.push('/import')} className="rounded-2xl bg-white text-[#071006] px-3 py-3 text-xs font-bold flex items-center justify-center gap-2 shadow-2xl"><Upload className="h-4 w-4"/>Restore</button></div></>;
}
