"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Application } from "@/lib/types";

const stageLabels: Record<Application["stage"], string> = {
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

// First letters of the first two words: "Northstar Logistics" -> "NL"
function getInitials(company: string): string {
  return company
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export default function Home() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadApplications() {
      try {
        const response = await fetch("/api/applications", {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const data: unknown = await response.json();
        if (!Array.isArray(data)) {
          throw new Error("Unexpected response: expected an array.");
        }
        if (controller.signal.aborted) return;
        setApplications(data as Application[]);
      } catch (err) {
        // An intentional cancellation (cleanup) is not an error to show.
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    loadApplications();

    return () => controller.abort();
  }, []);

  // Simple render-time counts derived from the fetched state (no extra state).
  const countByStage = (stage: Application["stage"]) =>
    applications.filter((application) => application.stage === stage).length;

  const summary = [
    { label: "Total Applications", value: applications.length },
    { label: "Applied", value: countByStage("applied") },
    { label: "Interviews", value: countByStage("interview") },
    { label: "Offers", value: countByStage("offer") },
  ];

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
        <section className="welcome" aria-labelledby="welcome-heading">
          <div className="welcome-copy">
            <h1 id="welcome-heading">
              Your next opportunity starts with a clear plan.
            </h1>
            <p className="welcome-intro">
              CareerTrack helps job seekers organize applications and track
              their progress.
            </p>
          </div>
          <div className="welcome-action">
            <Link href="/applications" className="button-primary">
              Add Application
            </Link>
          </div>
        </section>

        {isLoading && <p role="status">Loading applications...</p>}

        {!isLoading && error && (
          <div role="alert">
            <p>Could not load applications.</p>
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !error && (
          <>
            <section className="overview" aria-labelledby="overview-heading">
              <div className="section-head">
                <h2 id="overview-heading">Overview</h2>
                <span className="demo-badge">Demonstration data</span>
              </div>
              <dl className="summary-grid">
                {summary.map((item) => (
                  <div key={item.label} className="summary-tile">
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section
              className="applications"
              aria-labelledby="applications-heading"
            >
              <div className="section-head">
                <h2 id="applications-heading">My Applications</h2>
                <p className="section-note">
                  Demonstration data only: these are fictional records, not
                  real job postings.
                </p>
              </div>
              <div className="card-grid">
                {applications.map((application) => (
                  <article key={application.id} className="application-card">
                    <div className="card-top">
                      <span className="company-badge" aria-hidden="true">
                        {getInitials(application.company)}
                      </span>
                      <span
                        className={`stage-badge stage-${application.stage}`}
                      >
                        {stageLabels[application.stage]}
                      </span>
                    </div>
                    <h3 className="card-role">{application.role}</h3>
                    <p className="card-company">{application.company}</p>
                    <dl className="card-footer">
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
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="site-footer">
        <p>&copy; 2026 CareerTrack. All rights reserved.</p>
      </footer>
    </>
  );
}
