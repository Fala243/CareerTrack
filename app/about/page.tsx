import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — CareerTrack",
  description:
    "CareerTrack is a job-application tracking project: organize applications, follow each one through its stages, and keep your data in a real database.",
};

export default function AboutPage() {
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
        <section className="welcome" aria-labelledby="about-heading">
          <div className="welcome-copy">
            <h1 id="about-heading">About CareerTrack</h1>
            <p className="welcome-intro">
              CareerTrack is a job-application tracking project. It helps job
              seekers keep every application in one place and see where each
              one stands, from the first submission to an offer or a rejection.
            </p>
          </div>
          <div className="welcome-action">
            <Link href="/applications" className="button-primary">
              View applications
            </Link>
          </div>
        </section>

        <section className="applications" aria-labelledby="about-features">
          <div className="section-head">
            <h2 id="about-features">What it does</h2>
            <p className="section-note">
              Demonstration data only: the records in this app are fictional,
              not real job postings.
            </p>
          </div>
          <div className="card-grid">
            <article className="application-card">
              <h3 className="card-role">Track every application</h3>
              <p className="welcome-intro">
                Add, edit and delete applications, and follow each one through
                Applied, Interview, Offer or Rejected.
              </p>
            </article>
            <article className="application-card">
              <h3 className="card-role">See it your way</h3>
              <p className="welcome-intro">
                Filter by stage, sort by date or company, switch between List
                and Board views, and drag rows into your own Manual order.
              </p>
            </article>
            <article className="application-card">
              <h3 className="card-role">Stored in a database</h3>
              <p className="welcome-intro">
                Applications are saved in a PostgreSQL database, so they
                survive restarts. Your Manual order is remembered in this
                browser only.
              </p>
            </article>
            <article className="application-card">
              <h3 className="card-role">How it is built</h3>
              <p className="welcome-intro">
                A learning project built with the Next.js App Router, React
                and TypeScript, with a PostgreSQL database on Neon.
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <p>&copy; 2026 CareerTrack. All rights reserved.</p>
      </footer>
    </>
  );
}
