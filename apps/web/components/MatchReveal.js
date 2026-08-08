import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';
import { photoUrl } from '../lib/media';

/**
 * The Normal Match / Humble Match celebration (docs/03-design-system.md §4,
 * ADR-0006). Humble Match gets the bigger animation budget per product
 * principle #1 — it's the signature moment, not a footnote.
 */
export function MatchReveal({ match, onDismiss, onSayHello }) {
  if (!match) return null;
  const isHumble = match.type === 'HUMBLE';
  const photo = match.counterpart?.photos?.[0];

  return (
    <AnimatePresence>
      <motion.div
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 px-6 text-center ${
          isHumble ? 'bg-ink/95' : 'bg-primary/95'
        }`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {isHumble ? (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.55, ease: 'backOut' }}
            className="flex flex-col items-center gap-3"
          >
            <span className="text-display font-bold text-rejection">HUMBLE MATCH</span>
            <p className="max-w-xs text-body text-surface">
              You rejected them. They rejected you. Apparently neither of you is good enough for the
              other.
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col items-center gap-3"
          >
            <span className="text-display font-bold text-surface">It&apos;s a Match!</span>
            <p className="text-body text-surface/90">You both liked each other.</p>
          </motion.div>
        )}

        {photo && (
          <motion.img
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            src={photoUrl(photo.s3Key)}
            alt={match.counterpart.name}
            className="h-28 w-28 rounded-full border-4 border-surface object-cover"
          />
        )}
        <p className="text-h2 font-semibold text-surface">{match.counterpart?.name}</p>

        <div className="flex w-full max-w-xs flex-col gap-3">
          <Button className="w-full" onClick={onSayHello}>
            {isHumble ? 'Ask why they rejected you' : 'Say hello'}
          </Button>
          <Button variant="ghost" className="w-full text-surface" onClick={onDismiss}>
            Keep browsing
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
