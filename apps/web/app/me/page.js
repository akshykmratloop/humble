'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { api } from '../../lib/api';

export default function MePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [serverError, setServerError] = useState(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm();

  useEffect(() => {
    api
      .session()
      .then(() => api.getOwnProfile())
      .then((p) => setProfile(p))
      .catch((err) => {
        if (err.status === 401) {
          router.replace('/login');
          return;
        }
        // 404 just means "no profile yet" — expected for a brand new account.
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function onSubmit(values) {
    setServerError(null);
    try {
      const updated = await api.updateOwnProfile(values);
      setProfile(updated);
      reset();
    } catch (err) {
      setServerError(err.body?.detail || err.message);
    }
  }

  if (loading) {
    return (
      <main className="flex h-full items-center justify-center">
        <p className="text-body text-muted">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex h-full max-w-md flex-col justify-center gap-6 overflow-y-auto px-6 py-12">
      {profile?.isComplete ? (
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-bold">You&apos;re all set, {profile.name}</h1>
          <p className="text-body text-muted">
            Discovery, matching, and the rest of the game layer ship in the next build slices — see
            TASKS.md.
          </p>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold">Set up your profile</h1>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <TextField id="name" label="Name" defaultValue={profile?.name} {...register('name')} />
            <TextField
              id="birthdate"
              label="Date of birth"
              type="date"
              defaultValue={profile?.birthdate?.slice(0, 10)}
              {...register('birthdate')}
            />
            <div className="flex flex-col gap-2">
              <label htmlFor="gender" className="text-body-sm font-medium">
                Gender
              </label>
              <select
                id="gender"
                defaultValue={profile?.gender || ''}
                {...register('gender')}
                className="h-12 rounded-sm border border-black/10 bg-surface px-4 text-base"
              >
                <option value="" disabled>
                  Select…
                </option>
                <option value="MAN">Man</option>
                <option value="WOMAN">Woman</option>
                <option value="NONBINARY">Non-binary</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <TextField id="bio" label="Bio" defaultValue={profile?.bio} {...register('bio')} />
            {serverError && (
              <p role="alert" className="text-body-sm text-warning">
                {serverError}
              </p>
            )}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Saving…' : 'Save profile'}
            </Button>
            <p className="text-center text-body-sm text-muted">
              Photo upload UI ships alongside the Discovery slice.
            </p>
          </form>
        </>
      )}
    </main>
  );
}
