'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { api, uploadPhotoBytes } from '../../lib/api';
import { photoUrl } from '../../lib/media';

export default function MePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
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
    if (!values.gender) {
      setServerError('Please select a gender.');
      return;
    }
    try {
      const updated = await api.updateOwnProfile(values);
      setProfile(updated);
      reset();
    } catch (err) {
      setServerError(err.body?.detail || err.message);
    }
  }

  async function onPhotoSelected(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setServerError(null);
    setUploadingPhoto(true);
    try {
      const { photoId, uploadUrl } = await api.requestPhotoUploadUrl();
      await uploadPhotoBytes(uploadUrl, file);
      await api.confirmPhotoUpload(photoId);
      setProfile(await api.getOwnProfile());
    } catch (err) {
      setServerError(err.body?.detail || err.message);
    } finally {
      setUploadingPhoto(false);
      event.target.value = '';
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
        <div className="flex flex-col items-center gap-4 text-center">
          {profile.photos?.[0] && (
            <img
              src={photoUrl(profile.photos[0].s3Key)}
              alt={profile.name}
              className="h-24 w-24 rounded-full object-cover"
            />
          )}
          <h1 className="text-2xl font-bold">You&apos;re all set, {profile.name}</h1>
          <Link href="/discovery" className="w-full">
            <Button className="w-full">Start discovering</Button>
          </Link>
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
              <label
                htmlFor="gender"
                className="text-body-sm font-medium text-ink dark:text-surface"
              >
                Gender
              </label>
              <select
                id="gender"
                defaultValue={profile?.gender || ''}
                {...register('gender')}
                className="h-12 rounded-sm border border-black/10 bg-surface px-4 text-base text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-white/15 dark:bg-white/5 dark:text-surface"
              >
                <option value="" disabled className="text-ink">
                  Select…
                </option>
                <option value="MAN" className="text-ink">
                  Man
                </option>
                <option value="WOMAN" className="text-ink">
                  Woman
                </option>
                <option value="NONBINARY" className="text-ink">
                  Non-binary
                </option>
                <option value="OTHER" className="text-ink">
                  Other
                </option>
              </select>
            </div>
            <TextField id="bio" label="Bio" defaultValue={profile?.bio} {...register('bio')} />

            <div className="flex flex-col gap-2">
              <span className="text-body-sm font-medium">Photo</span>
              {profile?.photos?.[0] ? (
                <img
                  src={photoUrl(profile.photos[0].s3Key)}
                  alt="Your profile"
                  className="h-24 w-24 rounded-md object-cover"
                />
              ) : (
                <label
                  htmlFor="photo"
                  className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-md border border-dashed border-black/20 text-body-sm text-muted"
                >
                  {uploadingPhoto ? 'Uploading…' : 'Add photo'}
                </label>
              )}
              <input
                id="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={uploadingPhoto}
                onChange={onPhotoSelected}
              />
            </div>

            {serverError && (
              <p role="alert" className="text-body-sm text-warning">
                {serverError}
              </p>
            )}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Saving…' : 'Save profile'}
            </Button>
          </form>
        </>
      )}
    </main>
  );
}
