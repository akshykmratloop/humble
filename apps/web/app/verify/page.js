'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../../components/Button';
import { api } from '../../lib/api';

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('pending');
  // Verification tokens are single-use (docs/06-lld.md Auth module): calling
  // verifyEmail twice for the same token 401s on the second call. Without this
  // guard, React Strict Mode's dev-only double-invoke of effects fires the
  // mutation twice — the second call then fails and clobbers the first call's
  // success. A ref (unlike a local `let` in the effect) survives Strict Mode's
  // synchronous mount->cleanup->mount cycle, so it reliably fires the network
  // call exactly once per token.
  const firedForToken = useRef(null);

  useEffect(() => {
    if (!token) {
      setStatus('missing');
      return;
    }
    if (firedForToken.current === token) return;
    firedForToken.current = token;

    api
      .verifyEmail(token)
      .then(() => setStatus('verified'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <main className="mx-auto flex h-full max-w-md flex-col justify-center gap-4 px-6 text-center">
      {status === 'pending' && <p className="text-body text-muted">Verifying…</p>}
      {status === 'verified' && (
        <>
          <h1 className="text-2xl font-bold text-success">Email verified</h1>
          <Link href="/login">
            <Button className="w-full">Log in</Button>
          </Link>
        </>
      )}
      {(status === 'error' || status === 'missing') && (
        <p className="text-body text-warning">That verification link is invalid or has expired.</p>
      )}
    </main>
  );
}
