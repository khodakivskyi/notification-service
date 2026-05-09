import Link from "next/link";
import { Bell } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-full border border-border bg-secondary">
        <Bell className="size-6 text-[var(--brand)]" aria-hidden="true" />
      </div>
      <div>
        <p className="font-mono text-xs text-muted-foreground mb-2 tracking-widest uppercase">
          404
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="mt-3 text-muted-foreground max-w-xs mx-auto">
          The page you were looking for does not exist or has been moved.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/en"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Go home
        </Link>
        <Link
          href="/en/docs"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
        >
          View docs
        </Link>
      </div>
    </div>
  );
}
