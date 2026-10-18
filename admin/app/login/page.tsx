'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { createClient } from '@/lib/supabase/client';

// Admins sign in with their email and a 6 digit code, like the app. New accounts are never
// created here; an admin's account must already exist and be listed in the admins table.
function LoginForm() {
  const supabase = createClient();
  const router = useRouter();
  const denied = useSearchParams().get('denied') === '1';
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    denied ? 'This account is not an admin. Sign in with an admin email.' : null,
  );

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false },
    });
    setBusy(false);
    if (error) setError(error.code === 'otp_disabled' ? 'No account with that email.' : error.message);
    else setStep('code');
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) setError("That code didn't work. Check it or ask for a new one.");
    else {
      router.replace('/');
      router.refresh();
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl bg-surface p-8">
        <div>
          <h1 className="font-serif text-3xl text-accent">HabeshaMatch</h1>
          <p className="text-muted">Admin sign in</p>
        </div>
        {step === 'email' ? (
          <form onSubmit={sendCode} className="space-y-4">
            <label className="block space-y-1">
              <span className="text-sm text-muted">Email</span>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-raised px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
              />
            </label>
            <button disabled={busy} className="w-full rounded-full bg-accent py-2.5 font-semibold text-background disabled:opacity-50">
              {busy ? 'Sending...' : 'Send code'}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-4">
            <p className="text-sm text-muted">We sent a 6 digit code to {email}.</p>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              autoFocus
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-full rounded-lg bg-raised px-3 py-2 text-center text-2xl tracking-[0.5em] outline-none focus:ring-2 focus:ring-accent"
            />
            <button disabled={busy || code.length !== 6} className="w-full rounded-full bg-accent py-2.5 font-semibold text-background disabled:opacity-50">
              {busy ? 'Checking...' : 'Sign in'}
            </button>
            <button type="button" onClick={() => setStep('email')} className="w-full text-sm text-muted">
              Use a different email
            </button>
          </form>
        )}
        {error && <p className="text-sm text-rose">{error}</p>}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
