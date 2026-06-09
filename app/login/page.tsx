'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push('/');
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <form onSubmit={handleLogin} className="w-full max-w-sm rounded-2xl border bg-card p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Log in</h1>
          <p className="text-sm text-muted-foreground mt-1">Access your finance dashboard.</p>
        </div>

        <input
          className="w-full rounded-lg border bg-background px-3 py-2"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          className="w-full rounded-lg border bg-background px-3 py-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button className="w-full rounded-lg bg-primary text-primary-foreground py-2 font-medium disabled:opacity-50" disabled={loading}>
          {loading ? 'Logging in...' : 'Log in'}
        </button>

        <button type="button" onClick={() => router.push('/signup')} className="w-full text-sm text-muted-foreground">
          Create account
        </button>
      </form>
    </main>
  );
}
