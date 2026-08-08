import Link from 'next/link';
import { Button } from '../components/Button';

export default function LandingPage() {
  return (
    <main className="mx-auto flex h-full max-w-md flex-col justify-center gap-8 px-6">
      <div className="flex flex-col gap-3 text-center">
        <span className="text-body-sm font-semibold uppercase tracking-wide text-rejection">
          A dating app with a twist
        </span>
        <h1 className="text-4xl font-bold leading-tight">
          You both thought you were <span className="text-rejection">too good</span> for each other.
        </h1>
        <p className="text-body text-muted">
          So now you have to meet. Humble is the only dating app where rejecting someone can be the
          start of something.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <Link href="/signup">
          <Button className="w-full">Get started</Button>
        </Link>
        <Link href="/login">
          <Button variant="ghost" className="w-full">
            I already have an account
          </Button>
        </Link>
      </div>
    </main>
  );
}
