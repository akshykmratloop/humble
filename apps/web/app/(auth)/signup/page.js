'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { api } from '../../../lib/api';

/**
 * Client-side mirror of packages/validation's registerSchema — UX only.
 * The server-side schema is the real security gate (global CLAUDE.md §6).
 */
const signupSchema = z.object({
  email: z.string().min(5).max(254).email('Enter a valid email'),
  password: z
    .string()
    .min(12, 'At least 12 characters')
    .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), 'Include a letter and a number'),
  birthdate: z.string().min(1, 'Required'),
});

export default function SignupPage() {
  const [serverError, setServerError] = useState(null);
  const [devVerificationToken, setDevVerificationToken] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(signupSchema) });

  async function onSubmit(values) {
    setServerError(null);
    try {
      const result = await api.register(values);
      setDevVerificationToken(result.verificationToken || 'sent');
    } catch (err) {
      setServerError(err.body?.detail || err.message);
    }
  }

  if (devVerificationToken) {
    return (
      <main className="mx-auto flex h-full max-w-md flex-col justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-body text-muted">
          We sent a verification link. Click it to activate your account, then log in.
        </p>
        {devVerificationToken !== 'sent' && (
          <Link
            href={`/verify?token=${devVerificationToken}`}
            className="text-body-sm font-semibold text-primary underline"
          >
            Dev shortcut: verify now
          </Link>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto flex h-full max-w-md flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <TextField
          id="birthdate"
          label="Date of birth"
          type="date"
          error={errors.birthdate?.message}
          {...register('birthdate')}
        />
        {serverError && (
          <p role="alert" className="text-body-sm text-warning">
            {serverError}
          </p>
        )}
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <p className="text-center text-body-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-primary">
          Log in
        </Link>
      </p>
    </main>
  );
}
