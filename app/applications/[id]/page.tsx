import Link from "next/link";
import { notFound } from "next/navigation";
import type { Application } from "@/lib/types";
import { getOrigin } from "@/lib/origin";

const stageLabels: Record<Application["stage"], string> = {
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

async function getApplication(id: string): Promise<Application> {
  const origin = await getOrigin();
  const response = await fetch(
    `${origin}/api/applications/${encodeURIComponent(id)}`,
    { cache: "no-store" },
  );

  // notFound() throws, so nothing below runs for an unknown ID. It is not
  // inside a try/catch, so network errors and HTTP 500s are never turned into 404s.
  if (response.status === 404) {
    notFound();
  }
  if (!response.ok) {
    throw new Error(
      `Failed to load application: ${response.status} ${response.statusText}`,
    );
  }
  return (await response.json()) as Application;
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const application = await getApplication(id);

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
        <article className="welcome" aria-labelledby="application-heading">
          <div className="welcome-copy">
            <h1 id="application-heading">{application.role}</h1>
            <p className="welcome-intro">{application.company}</p>
            <dl className="card-footer">
              <div>
                <dt>Stage</dt>
                <dd>
                  <span className={`stage-badge stage-${application.stage}`}>
                    {stageLabels[application.stage]}
                  </span>
                </dd>
              </div>
              <div>
                <dt>ID</dt>
                <dd>{application.id}</dd>
              </div>
              <div>
                <dt>Date applied</dt>
                <dd>
                  <time dateTime={application.appliedDate}>
                    {application.appliedDate}
                  </time>
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
        </article>

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
