import { forwardRef } from 'react';
import clsx from 'clsx';

export const TextField = forwardRef(function TextField(
  { label, error, id, className, ...inputProps },
  ref,
) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-body-sm font-medium text-ink dark:text-surface">
        {label}
      </label>
      <input
        id={id}
        ref={ref}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={clsx(
          'h-12 rounded-sm border border-black/10 bg-surface px-4 text-base text-ink',
          'placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30',
          'dark:border-white/15 dark:bg-white/5 dark:text-surface',
          error && 'border-warning focus:border-warning focus:ring-warning/30',
          className,
        )}
        {...inputProps}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-body-sm text-warning">
          {error}
        </p>
      )}
    </div>
  );
});
