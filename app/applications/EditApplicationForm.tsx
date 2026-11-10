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

export default function EditApplicationForm({
  application,
  onSave,
  onCancel,
}: {
  application: Application;
  onSave: (application: Application) => void;
  onCancel: () => void;
}) {
  const [company, setCompany] = useState(application.company);
  const [role, setRole] = useState(application.role);
  const [stage, setStage] = useState<Application["stage"]>(application.stage);
  const [appliedDate, setAppliedDate] = useState(application.appliedDate);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    let updated: Application;
    try {
      const response = await fetch(
        `/api/applications/${encodeURIComponent(application.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company: company.trim(),
            role: role.trim(),
            stage,
            appliedDate,
          }),
        },
      );
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }
      updated = (await response.json()) as Application;
    } catch (caught) {
      // Keep what the user typed so they can fix it and resubmit.
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not save application",
      );
      setSubmitting(false);
      return;
    }

    // Only reached after the server answered 200 with the updated record.
    // The parent replaces its copy and closes this editor (unmounting it),
    // so there is nothing left to reset here.
    onSave(updated);
  }

  return (
    <form
      className="edit-form"
      onSubmit={handleSubmit}
      aria-label={`Edit application ${application.id}`}
    >
      <p className="edit-form-title">Edit {application.id}</p>

      <div className="form-fields">
        <label className="form-field">
          Company
          <input
            type="text"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            required
            autoComplete="off"
            autoFocus
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
          {submitting ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          className="button-secondary"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
