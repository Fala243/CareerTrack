import Link from "next/link";
import type { Application } from "@/lib/types";
import ApplicationView from "./ApplicationView";

// LOCAL LEARNING ONLY: localhost:3000 only works while the dev server runs on
// this machine. Revisit this address before any deployment.
const API_URL = "http://localhost:3000/api/applications";

async function getApplications(): Promise<Application[]> {
  const response = await fetch(API_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(
      `Failed to load applications: ${response.status} ${response.statusText}`,
    );
  }
  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("Failed to load applications: expected an array.");
  }
  return data as Application[];
}

export default async function ApplicationsPage() {
  const applications = await getApplications();

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
        <section className="welcome" aria-labelledby="applications-heading">
          <div className="welcome-copy">
            <h1 id="applications-heading">Applications</h1>
            <p className="welcome-intro">
              Every application you are tracking, loaded on the server from the
              CareerTrack API.
            </p>
          </div>
          <div className="welcome-action">
            <Link href="/" className="button-primary">
              Back to homepage
            </Link>
          </div>
        </section>

        <section className="applications" aria-label="Application list">
          <div className="section-head">
            <span className="demo-badge">Demonstration data</span>
            <p className="section-note">
              Demonstration data only: these are fictional records, not real
              job postings.
            </p>
          </div>
          <ApplicationView applications={applications} />
        </section>
      </main>

      <footer className="site-footer">
        <p>&copy; 2026 CareerTrack. All rights reserved.</p>
      </footer>
    </>
  );
}
