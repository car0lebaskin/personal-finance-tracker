'use client';

import { useEffect, useState } from 'react';
import { EyeOff, KeyRound, RotateCcw, Timer } from 'lucide-react';

const HASH_KEY = 'vault_lock_hash';
const SALT_KEY = 'vault_lock_salt';
const UNLOCK_KEY = 'vault_lock_time';
const TIMEOUT_KEY = 'vault_lock_timeout_ms';
const PRIVACY_DEFAULT_KEY = 'vault_privacy_default';
const DEFAULT_TIMEOUT = 5 * 60 * 1000;

async function digest(text: string) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function SecuritySettings() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [timeout, setTimeoutValue] = useState(String(DEFAULT_TIMEOUT));
  const [privacyDefault, setPrivacyDefault] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setTimeoutValue(localStorage.getItem(TIMEOUT_KEY) || String(DEFAULT_TIMEOUT));
    setPrivacyDefault(localStorage.getItem(PRIVACY_DEFAULT_KEY) === '1');
  }, []);

  async function changeCode() {
    setMessage('');
    const salt = localStorage.getItem(SALT_KEY) || '';
    const saved = localStorage.getItem(HASH_KEY);
    const currentHash = await digest(`${salt}:${current}`);
    if (saved && currentHash !== saved) { setMessage('Current code is incorrect.'); return; }
    if (next.length < 4) { setMessage('Use at least 4 digits.'); return; }
    if (next !== confirm) { setMessage('New code does not match.'); return; }
    const newSalt = crypto.randomUUID();
    localStorage.setItem(SALT_KEY, newSalt);
    localStorage.setItem(HASH_KEY, await digest(`${newSalt}:${next}`));
    sessionStorage.setItem(UNLOCK_KEY, String(Date.now()));
    setCurrent(''); setNext(''); setConfirm('');
    setMessage('Vault code updated.');
  }

  function saveTimeout(value: string) {
    setTimeoutValue(value);
    localStorage.setItem(TIMEOUT_KEY, value);
    setMessage('Lock timeout updated.');
  }

  function savePrivacyDefault(value: boolean) {
    setPrivacyDefault(value);
    localStorage.setItem(PRIVACY_DEFAULT_KEY, value ? '1' : '0');
    setMessage(value ? 'Privacy mode will be the default on this device.' : 'Privacy mode default turned off.');
  }

  function resetCode() {
    localStorage.removeItem(HASH_KEY);
    localStorage.removeItem(SALT_KEY);
    sessionStorage.removeItem(UNLOCK_KEY);
    setMessage('Code reset on this device. Go back to Vault to create a new one.');
  }

  return <section className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4 mb-4"><h2 className="text-base font-medium mb-3">Security</h2><div className="rounded-2xl bg-black/20 border border-white/8 p-3 mb-3"><div className="flex items-center gap-2 mb-3"><Timer className="h-4 w-4 text-[#a7ff4f]"/><p className="text-sm font-semibold">Auto-lock timeout</p></div><select value={timeout} onChange={(e) => saveTimeout(e.target.value)} className="w-full rounded-2xl bg-black/25 border border-white/10 px-4 py-3 outline-none"><option value={String(60 * 1000)}>1 minute</option><option value={String(5 * 60 * 1000)}>5 minutes</option><option value={String(15 * 60 * 1000)}>15 minutes</option><option value={String(30 * 60 * 1000)}>30 minutes</option></select></div><div className="rounded-2xl bg-black/20 border border-white/8 p-3 mb-3"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><EyeOff className="h-4 w-4 text-[#a7ff4f]"/><div><p className="text-sm font-semibold">Privacy mode default</p><p className="text-xs text-[#8d9188]">Start Vault with balances hidden on this device.</p></div></div><button onClick={() => savePrivacyDefault(!privacyDefault)} className={`h-7 w-12 rounded-full border transition ${privacyDefault ? 'bg-[#a7ff4f] border-[#a7ff4f]' : 'bg-white/10 border-white/10'}`}><span className={`block h-5 w-5 rounded-full bg-[#071006] transition ${privacyDefault ? 'translate-x-6' : 'translate-x-1 bg-white/70'}`}/></button></div></div><div className="rounded-2xl bg-black/20 border border-white/8 p-3 mb-3"><div className="flex items-center gap-2 mb-3"><KeyRound className="h-4 w-4 text-[#a7ff4f]"/><p className="text-sm font-semibold">Change code</p></div><input inputMode="numeric" type="password" value={current} onChange={(e) => setCurrent(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="Current code" className="w-full rounded-2xl bg-black/25 border border-white/10 px-4 py-3 outline-none mb-2"/><input inputMode="numeric" type="password" value={next} onChange={(e) => setNext(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="New code" className="w-full rounded-2xl bg-black/25 border border-white/10 px-4 py-3 outline-none mb-2"/><input inputMode="numeric" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="Confirm new code" className="w-full rounded-2xl bg-black/25 border border-white/10 px-4 py-3 outline-none mb-3"/><button onClick={changeCode} className="w-full rounded-2xl bg-[#a7ff4f] text-[#071006] py-3 font-bold">Update code</button></div><button onClick={resetCode} className="w-full rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-4 flex items-center justify-between text-left text-red-100"><span><b className="block text-sm">Reset code on this device</b><small className="text-red-200/70">You will create a new code next time</small></span><RotateCcw className="h-5 w-5"/></button>{message && <p className="text-xs text-[#a8aca3] mt-3">{message}</p>}</section>;
}
