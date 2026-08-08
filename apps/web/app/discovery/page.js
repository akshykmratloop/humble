'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, X } from 'lucide-react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { ProfileCard } from '../../components/ProfileCard';
import { MatchReveal } from '../../components/MatchReveal';
import { Button } from '../../components/Button';

export default function DiscoveryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [exiting, setExiting] = useState(null);
  const [activeMatch, setActiveMatch] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .getOwnProfile()
      .then((profile) => {
        if (!profile.isComplete) {
          router.replace('/me');
          return null;
        }
        return api.getCandidates();
      })
      .then((res) => {
        if (res) setCandidates(res.candidates);
      })
      .catch((err) => {
        if (err.status === 401) router.replace('/login');
        else if (err.status === 404) router.replace('/me');
        else setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const current = candidates[0];

  // Card-fly-off duration (docs/03-design-system.md §2.6 "standard" motion, 250-300ms)
  // matched against ProfileCard's own exit transition. Driven by a timer rather than
  // Framer Motion's onAnimationComplete callback, which was found not to fire
  // reliably for this animate-prop-swap pattern in the installed framer-motion
  // version — a timer is simpler and has no such dependency.
  const EXIT_ANIMATION_MS = 400;

  const handleDecide = useCallback(
    (decision) => {
      if (!current || exiting) return;
      const target = current;
      setExiting(decision);
      setTimeout(async () => {
        setExiting(null);
        setCandidates((prev) => prev.filter((c) => c.id !== target.id));
        try {
          const result = await api.submitDecision(target.userId, decision);
          if (result.match) {
            setActiveMatch(result.match);
          }
        } catch (err) {
          setError(err.message);
        }
      }, EXIT_ANIMATION_MS);
    },
    [current, exiting],
  );

  if (loading) {
    return (
      <main className="flex h-full items-center justify-center">
        <p className="text-body text-muted">Finding people nearby…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex h-full max-w-md flex-col px-4 py-4">
      <header className="flex items-center justify-between py-2">
        <span className="text-h2 font-bold text-primary">Humble</span>
        <Link href="/matches" className="text-body-sm font-semibold text-ink dark:text-surface">
          Matches
        </Link>
      </header>

      <div className="relative flex-1 min-h-0">
        {error && <p className="text-body-sm text-warning">{error}</p>}
        {!current && !error && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-h2 font-semibold">You&apos;re all caught up</p>
            <p className="text-body text-muted">Check back later for more people to discover.</p>
          </div>
        )}
        {current && <ProfileCard key={current.id} profile={current} exiting={exiting} />}
      </div>

      {current && (
        <div className="flex items-center justify-center gap-8 py-6">
          <Button
            variant="ghost"
            aria-label="Reject"
            className="h-16 w-16 rounded-full border border-rejection/30 text-rejection"
            onClick={() => handleDecide('REJECT')}
          >
            <X size={28} />
          </Button>
          <Button
            aria-label="Like"
            className="h-16 w-16 rounded-full"
            onClick={() => handleDecide('LIKE')}
          >
            <Heart size={28} />
          </Button>
        </div>
      )}

      <MatchReveal
        match={activeMatch}
        onDismiss={() => setActiveMatch(null)}
        onSayHello={() => router.push('/matches')}
      />
    </main>
  );
}
