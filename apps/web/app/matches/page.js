'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { photoUrl } from '../../lib/media';

const TYPE_BADGE = {
  NORMAL: { label: 'Match', className: 'bg-success/15 text-success' },
  HUMBLE: { label: 'Humble Match', className: 'bg-rejection/15 text-rejection' },
};

export default function MatchesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    api
      .getMatches()
      .then((res) => setMatches(res.matches))
      .catch((err) => {
        if (err.status === 401) router.replace('/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <main className="mx-auto flex h-full max-w-md flex-col px-4 py-4">
      <header className="flex items-center justify-between py-2">
        <Link href="/discovery" className="text-body-sm font-semibold text-ink dark:text-surface">
          &larr; Discovery
        </Link>
        <span className="text-h2 font-bold">Matches</span>
        <span className="w-16" />
      </header>

      {loading && <p className="text-body text-muted">Loading…</p>}

      {!loading && matches.length === 0 && (
        <div className="flex flex-1 items-center justify-center text-center text-body text-muted">
          No matches yet — go find your Humble Match.
        </div>
      )}

      <ul className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {matches.map((match) => {
          const badge = TYPE_BADGE[match.type];
          const photo = match.counterpart?.photos?.[0];
          return (
            <li
              key={match.id}
              className="flex items-center gap-3 rounded-md border border-black/10 p-3"
            >
              {photo ? (
                <img
                  src={photoUrl(photo.s3Key)}
                  alt={match.counterpart.name}
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <div className="h-14 w-14 rounded-full bg-surface-dim" />
              )}
              <div className="flex flex-1 flex-col gap-1">
                <span className="font-semibold">{match.counterpart?.name}</span>
                <span
                  className={`w-fit rounded-sm px-2 py-0.5 text-xs font-semibold ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
