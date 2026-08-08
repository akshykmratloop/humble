import clsx from 'clsx';

const VARIANTS = {
  primary: 'bg-primary text-white hover:bg-primary-ink active:bg-primary-ink disabled:opacity-50',
  ghost: 'bg-transparent text-ink hover:bg-surface-dim dark:text-surface dark:hover:bg-white/10',
};

export function Button({ variant = 'primary', className, type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={clsx(
        'inline-flex h-12 items-center justify-center rounded-md px-6 text-base font-semibold',
        'transition-colors duration-micro focus-visible:outline focus-visible:outline-2',
        'focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
