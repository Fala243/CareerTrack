"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Application } from "@/lib/types";
import EditApplicationForm from "./EditApplicationForm";

// A plain click on a title navigates after this delay, so that a double-click
// (which sends two clicks first) can cancel the navigation.
const NAVIGATE_DELAY_MS = 300;

const stageLabels: Record<Application["stage"], string> = {
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

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

// Fixed column order, independent of the data.
const stages: Application["stage"][] = [
  "applied",
  "interview",
  "offer",
  "rejected",
];

export default function ApplicationBoard({
  applications,
  onUpdate,
  onDelete,
}: {
  applications: Application[];
  onUpdate: (application: Application) => void;
  onDelete: (id: string) => void;
}) {
  // Id of the card whose editor is open; null when none (one at a time).
  const [editingId, setEditingId] = useState<string | null>(null);

  // Ids with a DELETE in flight, and the most recent delete failure.
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [deleteError, setDeleteError] = useState<{
    id: string;
    message: string;
  } | null>(null);

  const router = useRouter();

  // A plain click on a title navigates after a short delay, so a double-click
  // can cancel it and open the inline role editor instead.
  const navigateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Never let a pending navigation fire after this list/board is gone
  // (for example after switching List/Board).
  useEffect(() => {
    const timer = navigateTimer; // the ref object itself never changes
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  // Inline role editor (one at a time): the record, the typed text, whether
  // its PUT is in flight, and the latest failure message.
  const [inlineId, setInlineId] = useState<string | null>(null);
  const [inlineRole, setInlineRole] = useState("");
  const [inlineSaving, setInlineSaving] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  // Set when the editor is closed on purpose. Chromium fires blur when a
  // focused input is removed, and that blur must not count as "click away = save".
  const skipBlurSave = useRef(false);

  function cancelPendingNavigation() {
    if (navigateTimer.current !== null) {
      clearTimeout(navigateTimer.current);
      navigateTimer.current = null;
    }
  }

  function handleTitleClick(event: MouseEvent<HTMLAnchorElement>, id: string) {
    // New-tab clicks and keyboard activation (detail 0) keep the default behaviour.
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.detail === 0
    ) {
      return;
    }
    event.preventDefault(); // Next's Link skips its own navigation when this is set
    if (event.detail > 1) return; // second click of a double-click: never navigate
    cancelPendingNavigation();
    navigateTimer.current = setTimeout(() => {
      navigateTimer.current = null;
      router.push(`/applications/${id}`);
    }, NAVIGATE_DELAY_MS);
  }

  function startInlineEdit(application: Application) {
    // Wait for a running inline save, and leave rows being deleted alone.
    if (inlineSaving || deletingIds.includes(application.id)) return;
    skipBlurSave.current = false;
    setEditingId(null); // one editor at a time: close the full editor
    setInlineId(application.id);
    setInlineRole(application.role);
    setInlineError(null);
  }

  function closeInlineEdit() {
    skipBlurSave.current = true;
    setInlineId(null);
    setInlineError(null);
  }

  async function saveInlineEdit(application: Application) {
    if (inlineSaving) return; // no duplicate submissions
    const role = inlineRole.trim();
    if (role === "") {
      setInlineError("Role cannot be empty");
      return;
    }
    if (role === application.role) {
      closeInlineEdit(); // nothing changed: no request
      return;
    }

    setInlineSaving(true);
    setInlineError(null);
    try {
      const response = await fetch(
        `/api/applications/${encodeURIComponent(application.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company: application.company,
            role,
            stage: application.stage,
            appliedDate: application.appliedDate,
          }),
        },
      );
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }
      const updated = (await response.json()) as Application;
      // Only now, after the server answered 200, does the client change.
      closeInlineEdit();
      onUpdate(updated);
    } catch (caught) {
      // Stay in edit mode with the typed text so the user can retry.
      setInlineError(
        caught instanceof Error ? caught.message : "Could not save role",
      );
    } finally {
      setInlineSaving(false);
    }
  }

  async function handleDelete(application: Application) {
    if (!window.confirm("Delete this application?")) return;

    setDeleteError(null);
    setDeletingIds((previous) => [...previous, application.id]);

    try {
      const response = await fetch(
        `/api/applications/${encodeURIComponent(application.id)}`,
        { method: "DELETE" },
      );
      // Success is exactly 204 No Content; anything else keeps the card.
      if (response.status !== 204) {
        throw new Error(await readErrorMessage(response));
      }
      onDelete(application.id);
    } catch (caught) {
      setDeleteError({
        id: application.id,
        message:
          caught instanceof Error
            ? caught.message
            : "Could not delete application",
      });
    } finally {
      setDeletingIds((previous) =>
        previous.filter((id) => id !== application.id),
      );
    }
  }

  return (
    <div className="board">
      {stages.map((stage) => {
        // filter() keeps the incoming order, so the parent's sort choice
        // still applies inside each column.
        const group = applications.filter(
          (application) => application.stage === stage,
        );

        return (
          <section
            key={stage}
            className="board-column"
            aria-labelledby={`board-heading-${stage}`}
          >
            <h2 className="board-column-title" id={`board-heading-${stage}`}>
              {stageLabels[stage]}{" "}
              <span className="board-count">{group.length}</span>
            </h2>

            {group.length === 0 ? (
              <p className="board-empty">No applications in this stage.</p>
            ) : (
              group.map((application) => {
                if (editingId === application.id) {
                  return (
                    <article key={application.id} className="board-card">
                      <EditApplicationForm
                        application={application}
                        onSave={(updated) => {
                          onUpdate(updated);
                          // Close only if this card's editor is still open.
                          setEditingId((current) =>
                            current === updated.id ? null : current,
                          );
                        }}
                        onCancel={() => setEditingId(null)}
                      />
                    </article>
                  );
                }

                const isDeleting = deletingIds.includes(application.id);
                const isInline = inlineId === application.id;

                return (
                  <article key={application.id} className="board-card">
                    <h3 className="board-card-role">
                      {isInline ? (
                        <input
                          type="text"
                          className="inline-role-input"
                          value={inlineRole}
                          aria-label={`Edit role for ${application.id}`}
                          aria-invalid={inlineError !== null}
                          aria-busy={inlineSaving}
                          readOnly={inlineSaving}
                          autoComplete="off"
                          autoFocus
                          draggable={false}
                          onFocus={(event) => {
                            skipBlurSave.current = false; // editing again: blur-save is back on
                            event.currentTarget.select();
                          }}
                          onChange={(event) => {
                            setInlineRole(event.target.value);
                            setInlineError(null);
                          }}
                          onKeyDown={(event) => {
                            if (event.nativeEvent.isComposing) return;
                            if (event.key === "Enter") {
                              event.preventDefault();
                              saveInlineEdit(application);
                            } else if (event.key === "Escape" && !inlineSaving) {
                              event.preventDefault();
                              closeInlineEdit();
                            }
                          }}
                          onBlur={(event) => {
                            if (skipBlurSave.current) return;
                            // Focus moving onto a full Edit button cancels the inline edit, not saves it.
                            const next = event.relatedTarget;
                            if (next instanceof HTMLElement && next.dataset.editButton === "true") return;
                            saveInlineEdit(application);
                          }}
                          onDragStart={(event) => event.preventDefault()}
                        />
                      ) : (
                        <Link
                          href={`/applications/${application.id}`}
                          prefetch={false}
                          onClick={(event) => handleTitleClick(event, application.id)}
                          onDoubleClick={() => {
                            cancelPendingNavigation();
                            startInlineEdit(application);
                          }}
                        >
                          {application.role}
                        </Link>
                      )}
                    </h3>
                    {isInline && inlineError !== null && (
                      <p className="form-error inline-error" role="alert">
                        {inlineError}
                      </p>
                    )}
                    {isInline && inlineError === null && inlineSaving && (
                      <p className="inline-note" role="status">
                        Saving...
                      </p>
                    )}
                    <p className="board-card-company">{application.company}</p>
                    <span className={`stage-badge stage-${application.stage}`}>
                      {stageLabels[application.stage]}
                    </span>
                    <dl className="board-card-meta">
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
                    <div className="row-actions">
                      <button
                        type="button"
                        className="button-secondary"
                        aria-label={`Edit ${application.role}`}
                        disabled={isDeleting || inlineSaving}
                        data-edit-button="true"
                        onMouseDown={(event) => {
                          // Runs before the inline input blurs, so that blur cancels instead of saving.
                          if (event.button !== 0) return;
                          cancelPendingNavigation();
                          skipBlurSave.current = true;
                        }}
                        onClick={() => {
                          cancelPendingNavigation();
                          closeInlineEdit();
                          setEditingId(application.id);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="button-secondary button-danger"
                        aria-label={
                          isDeleting
                            ? `Deleting ${application.role}`
                            : `Delete ${application.role}`
                        }
                        disabled={isDeleting}
                        onClick={() => handleDelete(application)}
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                    {deleteError?.id === application.id && (
                      <p className="form-error row-error" role="alert">
                        {deleteError.message}
                      </p>
                    )}
                  </article>
                );
              })
            )}
          </section>
        );
      })}
    </div>
  );
}
