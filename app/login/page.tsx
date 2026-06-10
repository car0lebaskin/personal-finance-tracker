'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push('/');
  }

  return <main className="min-h-screen bg-[#080b08] text-[#f4f5ef] flex items-center justify-center px-5"><div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(148,255,97,0.14),transparent_34%),linear-gradient(180deg,#182016_0%,#080b08_48%)]"/><form onSubmit={handleLogin} className="relative w-full max-w-[380px] rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-2xl"><div className="flex items-center gap-3 mb-6"><div className="h-12 w-12 rounded-2xl bg-[#a7ff4f]/15 flex items-center justify-center"><ShieldCheck className="h-6 w-6 text-[#a7ff4f]"/></div><div><h1 className="text-2xl font-semibold tracking-tight">Vault</h1><p className="text-xs text-[#a8aca3]">Sign in to continue</p></div></div><label className="block text-sm text-[#a8aca3] mb-2">Email</label><div className="flex items-center gap-3 rounded-2xl bg-black/25 border border-white/10 px-4 py-3 mb-3"><Mail className="h-4 w-4 text-[#8d9188]"/><input className="w-full bg-transparent outline-none text-base" type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required/></div><label className="block text-sm text-[#a8aca3] mb-2">Password</label><div className="flex items-center gap-3 rounded-2xl bg-black/25 border border-white/10 px-4 py-3 mb-3"><LockKeyhole className="h-4 w-4 text-[#8d9188]"/><input className="w-full bg-transparent outline-none text-base" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required/></div>{error && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 mb-3">{error}</p>}<button className="w-full rounded-2xl bg-[#a7ff4f] text-[#071006] py-3.5 font-bold disabled:opacity-50" disabled={loading}>{loading ? 'Logging in...' : 'Log in'}</button><button type="button" onClick={() => router.push('/signup')} className="w-full mt-4 rounded-2xl border border-white/10 bg-white/[0.04] py-3 text-sm text-[#d8ded2]">Create account</button></form></main>;
}
