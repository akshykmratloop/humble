'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { api } from '../../../lib/api';

const loginSchema = z.object({
  email: z.string().min(1, 'Required').email('Enter a valid email'),
  password: z.string().min(1, 'Required'),
});

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values) {
    setServerError(null);
    try {
      await api.login(values);
      router.push('/me');
    } catch (err) {
      setServerError(err.body?.detail || err.message);
    }
  }

  return (
    <main className="mx-auto flex h-full max-w-md flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-bold">Welcome back</h1>
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
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {serverError && (
          <p role="alert" className="text-body-sm text-warning">
            {serverError}
          </p>
        )}
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
      <p className="text-center text-body-sm text-muted">
        New to Humble?{' '}
        <Link href="/signup" className="font-semibold text-primary">
          Create an account
        </Link>
      </p>
    </main>
  );
}
