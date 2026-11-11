"use client"; // Error boundaries must be Client Components

import Link from "next/link";

// Shown when loading an application fails for a reason other than "not found"
// (for example the API or database being unavailable). A missing application
// is handled separately by notFound() in page.tsx and never reaches this file.
//
// Nothing from the error is displayed except its `digest`: an opaque hash that
// matches the server log entry. The message and stack trace are never shown.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <header className="site-header">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true">
            CT
          </span>
          <div>
            <p className="brand">CareerTrack</p>
            <p className="tagline">
              Organize your applications. Track your next opportunity.
            </p>
          </div>
        </div>
        <span className="demo-badge">Demo workspace</span>
      </header>

      <main className="site-main">
        <div className="welcome" role="alert">
          <div className="welcome-copy">
            <h1>This application couldn&apos;t load.</h1>
            <p className="welcome-intro">
              Something went wrong on our side while loading it. This is often
              temporary, so please try again.
            </p>
            {error.digest && (
              <p className="welcome-intro action-note">
                Reference: {error.digest}
              </p>
            )}
          </div>
          <div className="welcome-action">
            <button
              type="button"
              className="button-primary"
              onClick={() => reset()}
            >
              Try again
            </button>
            <Link
              href="/applications"
              prefetch={false}
              className="button-secondary"
            >
              Back to Applications
            </Link>
          </div>
        </div>
      </main>

      <footer className="site-footer">
        <p>&copy; 2026 CareerTrack. All rights reserved.</p>
      </footer>
    </>
  );
}
