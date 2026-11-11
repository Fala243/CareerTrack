import Link from "next/link";

// Shown by Next.js while the detail page waits for the application from the
// API. It mirrors the real page (same header, card and footer) so nothing
// jumps when the content arrives. Static: no animation, no client code.
export default function Loading() {
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
        <div
          className="welcome"
          role="status"
          aria-busy="true"
          aria-label="Loading application"
        >
          <div className="welcome-copy">
            {/* role / title */}
            <div className="skeleton skeleton-title" aria-hidden="true" />
            {/* company name */}
            <div className="welcome-intro" aria-hidden="true">
              <span className="skeleton skeleton-line" />
            </div>
            {/* stage, id and applied date */}
            <dl className="card-footer" aria-hidden="true">
              <div>
                <dt>Stage</dt>
                <dd>
                  <span className="skeleton skeleton-pill" />
                </dd>
              </div>
              <div>
                <dt>ID</dt>
                <dd>
                  <span className="skeleton skeleton-value skeleton-id" />
                </dd>
              </div>
              <div>
                <dt>Date applied</dt>
                <dd>
                  <span className="skeleton skeleton-value skeleton-date" />
                </dd>
              </div>
            </dl>
          </div>
          <div className="welcome-action">
            <Link
              href="/applications"
              prefetch={false}
              className="button-primary"
            >
              Back to Applications
            </Link>
          </div>
        </div>

        <div className="section-head">
          <span className="demo-badge">Demonstration data</span>
          <p className="section-note">
            Demonstration data only: this is a fictional record, not a real job
            posting.
          </p>
        </div>
      </main>

      <footer className="site-footer">
        <p>&copy; 2026 CareerTrack. All rights reserved.</p>
      </footer>
    </>
  );
}
