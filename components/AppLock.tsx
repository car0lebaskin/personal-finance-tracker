'use client';

import { useEffect, useState } from 'react';
import { LockKeyhole, ShieldCheck } from 'lucide-react';

const HASH_KEY = 'vault_lock_hash';
const SALT_KEY = 'vault_lock_salt';
const UNLOCK_KEY = 'vault_lock_time';
const TIMEOUT_KEY = 'vault_lock_timeout_ms';
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

function timeoutMs() {
  if (typeof window === 'undefined') return DEFAULT_TIMEOUT_MS;
  return Number(localStorage.getItem(TIMEOUT_KEY) || DEFAULT_TIMEOUT_MS);
}

async function digest(text: string) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function AppLock({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [hasLock, setHasLock] = useState(false);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(HASH_KEY);
    const last = Number(sessionStorage.getItem(UNLOCK_KEY) || 0);
    setHasLock(Boolean(saved));
    setOpen(Boolean(saved && Date.now() - last < timeoutMs()));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => {
      const last = Number(sessionStorage.getItem(UNLOCK_KEY) || 0);
      if (Date.now() - last > timeoutMs()) setOpen(false);
    }, 15000);
    const refresh = () => sessionStorage.setItem(UNLOCK_KEY, String(Date.now()));
    window.addEventListener('click', refresh);
    window.addEventListener('touchstart', refresh);
    window.addEventListener('keydown', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('click', refresh);
      window.removeEventListener('touchstart', refresh);
      window.removeEventListener('keydown', refresh);
    };
  }, [open]);

  async function setup() {
    setError('');
    if (code.length < 4) { setError('Use at least 4 digits.'); return; }
    if (code !== confirm) { setError('Codes do not match.'); return; }
    const salt = crypto.randomUUID();
    localStorage.setItem(SALT_KEY, salt);
    localStorage.setItem(HASH_KEY, await digest(`${salt}:${code}`));
    sessionStorage.setItem(UNLOCK_KEY, String(Date.now()));
    setHasLock(true);
    setOpen(true);
  }

  async function unlock() {
    setError('');
    const salt = localStorage.getItem(SALT_KEY) || '';
    const saved = localStorage.getItem(HASH_KEY);
    const current = await digest(`${salt}:${code}`);
    if (current !== saved) { setError('Incorrect code.'); setCode(''); return; }
    sessionStorage.setItem(UNLOCK_KEY, String(Date.now()));
    setOpen(true);
  }

  if (!ready) return <main className="min-h-screen bg-[#080b08] flex items-center justify-center text-[#d8ded2] text-sm">Loading...</main>;
  if (open) return <>{children}</>;

  return <main className="min-h-screen bg-[#080b08] text-[#f4f5ef] flex items-center justify-center px-5"><div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(148,255,97,0.14),transparent_34%),linear-gradient(180deg,#182016_0%,#080b08_48%)]"/><section className="relative w-full max-w-[420px] rounded-[30px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl"><div className="h-14 w-14 rounded-2xl bg-[#a7ff4f]/15 flex items-center justify-center mb-5">{hasLock ? <LockKeyhole className="h-7 w-7 text-[#a7ff4f]"/> : <ShieldCheck className="h-7 w-7 text-[#a7ff4f]"/>}</div><h1 className="text-2xl font-semibold">{hasLock ? 'Unlock Vault' : 'Create Vault code'}</h1><p className="text-sm text-[#a8aca3] mt-2 mb-6">{hasLock ? 'Enter your code to continue.' : 'Your code hash is stored only in this browser.'}</p><input inputMode="numeric" type="password" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="Code" className="w-full rounded-2xl bg-black/25 border border-white/10 px-4 py-4 outline-none text-xl tracking-[0.35em] mb-3"/>{!hasLock && <input inputMode="numeric" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="Confirm" className="w-full rounded-2xl bg-black/25 border border-white/10 px-4 py-4 outline-none text-xl tracking-[0.35em] mb-3"/>}{error && <p className="text-sm text-red-200 mb-3">{error}</p>}<button onClick={hasLock ? unlock : setup} className="w-full rounded-2xl bg-[#a7ff4f] text-[#071006] py-4 font-bold">{hasLock ? 'Unlock' : 'Save code'}</button></section></main>;
}
