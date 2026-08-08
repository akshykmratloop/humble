import { motion } from 'framer-motion';
import { photoUrl } from '../lib/media';

const EXIT_VARIANTS = {
  LIKE: { x: 400, rotate: 20, opacity: 0 },
  REJECT: { x: -400, rotate: -20, opacity: 0 },
  none: { x: 0, rotate: 0, opacity: 1 },
};

/**
 * The discovery card (docs/03-design-system.md §4). `exiting` drives the
 * signature Like/Reject fly-off animation; `prefers-reduced-motion` swaps it
 * for a plain fade via Framer Motion's automatic reduced-motion handling.
 */
export function ProfileCard({ profile, exiting }) {
  const photo = profile.photos?.[0];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col overflow-hidden rounded-lg border border-black/10 bg-surface shadow-lg"
      initial={{ scale: 0.96, opacity: 0 }}
      animate={exiting ? EXIT_VARIANTS[exiting] : { scale: 1, opacity: 1, x: 0, rotate: 0 }}
      transition={{ duration: exiting ? 0.4 : 0.25, ease: 'easeOut' }}
    >
      <div className="relative flex-1 bg-surface-dim">
        {photo ? (
          <img
            src={photoUrl(photo.s3Key)}
            alt={`${profile.name}'s profile photo`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">No photo</div>
        )}
        {exiting === 'LIKE' && (
          <div className="absolute right-6 top-6 rounded-sm border-4 border-success px-3 py-1 text-h2 font-bold text-success">
            LIKE
          </div>
        )}
        {exiting === 'REJECT' && (
          <div className="absolute left-6 top-6 rounded-sm border-4 border-rejection px-3 py-1 text-h2 font-bold text-rejection">
            NOPE
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 p-4">
        <h2 className="text-h1 font-bold">
          {profile.name}, {profile.age}
        </h2>
        {profile.cityLabel && <p className="text-body-sm text-muted">{profile.cityLabel}</p>}
        {profile.bio && <p className="text-body">{profile.bio}</p>}
      </div>
    </motion.div>
  );
}
