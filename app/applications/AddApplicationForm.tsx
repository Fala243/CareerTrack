"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { Application } from "@/lib/types";

const stageOptions: { value: Application["stage"]; label: string }[] = [
  { value: "applied", label: "Applied" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
];

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: unknown };
    if (typeof data.error === "string") {
      return data.error;
    }
  } catch {
    // Body was not JSON; fall through to the generic message.
  }
  return `Request failed with status ${response.status}`;
}

export default function AddApplicationForm({
  onAdd,
}: {
  onAdd: (application: Application) => void;
}) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [stage, setStage] = useState<Application["stage"]>("applied");
  const [appliedDate, setAppliedDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    let created: Application;
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: company.trim(),
          role: role.trim(),
          stage,
          appliedDate,
        }),
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }
      created = (await response.json()) as Application;
    } catch (caught) {
      // Keep what the user typed so they can fix it and resubmit.
      setError(
        caught instanceof Error ? caught.message : "Could not add application",
      );
      setSubmitting(false);
      return;
    }

    // Only reached after the server answered 201.
    onAdd(created);
    setCompany("");
    setRole("");
    setStage("applied");
    setAppliedDate("");
    setSubmitting(false);
  }

  return (
    <form
      className="entry-form"
      onSubmit={handleSubmit}
      aria-labelledby="add-application-heading"
    >
      <h2 id="add-application-heading">Add application</h2>

      <div className="form-fields">
        <label className="form-field">
          Company
          <input
            type="text"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            required
            autoComplete="off"
            disabled={submitting}
          />
        </label>

        <label className="form-field">
          Role
          <input
            type="text"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            required
            autoComplete="off"
            disabled={submitting}
          />
        </label>

        <label className="form-field">
          Stage
          <select
            value={stage}
            onChange={(event) =>
              setStage(event.target.value as Application["stage"])
            }
            disabled={submitting}
          >
            {stageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          Applied date
          <input
            type="date"
            value={appliedDate}
            onChange={(event) => setAppliedDate(event.target.value)}
            required
            disabled={submitting}
          />
        </label>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="form-actions">
        <button
          type="submit"
          className="button-primary"
          disabled={
            submitting ||
            !company.trim() ||
            !role.trim() ||
            !appliedDate
          }
        >
          {submitting ? "Adding..." : "Add application"}
        </button>
      </div>
    </form>
  );
}
