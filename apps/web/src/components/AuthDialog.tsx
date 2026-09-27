import { LogOut, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { useStrayCity } from '../lib/stray-city-context';

export function AuthDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { authUser, currentProfile, isDemoMode, signIn, signUp, signOut } = useStrayCity();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  if (!open) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setPending(true);
    const data = new FormData(event.currentTarget);
    try {
      if (mode === 'signin') {
        await signIn(String(data.get('email')), String(data.get('password')));
      } else {
        await signUp(
          String(data.get('email')),
          String(data.get('password')),
          String(data.get('displayName')),
          String(data.get('username')),
          String(data.get('phone')),
        );
      }
      if (!isDemoMode) onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Account request failed.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-card max-w-md"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="icon-button absolute right-4 top-4" onClick={onClose} aria-label="Close">
          <X size={19} />
        </button>
        <p className="eyebrow">Your Stray City</p>
        <h2 className="mt-2 font-display text-3xl">
          {authUser
            ? `Hey, ${currentProfile.displayName}.`
            : mode === 'signin'
              ? 'Welcome back.'
              : 'Join the wander.'}
        </h2>

        {authUser ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-ink/5 p-4">
              <p className="font-semibold">@{currentProfile.username}</p>
              <p className="mt-1 text-sm text-ink/60">{currentProfile.email}</p>
            </div>
            <button className="button-secondary w-full" onClick={() => void signOut()}>
              <LogOut size={17} /> Sign out
            </button>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={(event) => void submit(event)}>
            {mode === 'signup' && (
              <div className="grid grid-cols-2 gap-3">
                <label className="field-label">
                  Name
                  <input name="displayName" required />
                </label>
                <label className="field-label">
                  Username
                  <input name="username" pattern="[a-z0-9_]{3,30}" required />
                </label>
              </div>
            )}
            <label className="field-label">
              Email
              <input name="email" type="email" autoComplete="email" required />
            </label>
            {mode === 'signup' && (
              <label className="field-label">
                Phone number
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+1 212 555 0199"
                  required
                />
                <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-ink/45">
                  Required to connect photos sent through iMessage. Never shown publicly.
                </span>
              </label>
            )}
            <label className="field-label">
              Password
              <input
                name="password"
                type="password"
                minLength={8}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
              />
            </label>
            {error && <p className="rounded-xl bg-coral/10 p-3 text-sm text-coral">{error}</p>}
            {isDemoMode && (
              <p className="rounded-xl bg-gold/15 p-3 text-sm">
                Supabase is not configured, so the product is running with clearly labeled sample
                data. The form can be previewed without creating an account.
              </p>
            )}
            <button className="button-primary w-full" disabled={pending}>
              {pending ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
            <button
              type="button"
              className="w-full text-sm font-semibold underline underline-offset-4"
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            >
              {mode === 'signin'
                ? 'New here? Create an account'
                : 'Already have an account? Sign in'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
