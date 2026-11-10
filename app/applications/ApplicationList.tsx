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

// Renders the applications in the order received: sorting happens in the parent.
export default function ApplicationList({
  applications,
  onUpdate,
  onDelete,
  reorderable,
  onReorder,
}: {
  applications: Application[];
  onUpdate: (application: Application) => void;
  onDelete: (id: string) => void;
  // True only for the Manual sort: rows can then be dragged to reorder.
  reorderable: boolean;
  onReorder: (draggedId: string, targetId: string) => void;
}) {
  // Id of the row whose editor is open; null when none (one at a time).
  const [editingId, setEditingId] = useState<string | null>(null);

  // Ids with a DELETE in flight, and the most recent delete failure.
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [deleteError, setDeleteError] = useState<{
    id: string;
    message: string;
  } | null>(null);

  // Drag and drop (Manual sort only): the row being dragged, and the row
  // it is currently over.
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  function endDrag() {
    setDraggingId(null);
    setDropTargetId(null);
  }

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
      // Success is exactly 204 No Content; anything else keeps the row.
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
    <div
      className="app-list"
      onDragLeave={(event) => {
        // Clear the highlight only when the pointer leaves the whole list.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDropTargetId(null);
        }
      }}
    >
      {applications.map((application) => {
        if (editingId === application.id) {
          return (
            <article key={application.id} className="list-row list-row-editing">
              <EditApplicationForm
                application={application}
                onSave={(updated) => {
                  onUpdate(updated);
                  // Close only if this row's editor is still the open one.
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
        const isDragging = draggingId === application.id;
        const isDropTarget = dropTargetId === application.id && !isDragging;
        const isInline = inlineId === application.id;

        return (
          <article
            key={application.id}
            className={`list-row${reorderable ? " list-row-draggable" : ""}${
              isDragging ? " is-dragging" : ""
            }${isDropTarget ? " is-drop-target" : ""}`}
            draggable={reorderable && !isInline}
            onDragStart={(event) => {
              if (!reorderable || isInline) return;
              // Some browsers only start a drag when data has been set.
              event.dataTransfer.setData("text/plain", application.id);
              event.dataTransfer.effectAllowed = "move";
              setDraggingId(application.id);
            }}
            onDragOver={(event) => {
              // Only accept drags that started on a row of this list.
              if (!reorderable || draggingId === null) return;
              event.preventDefault(); // a drop is allowed only if dragover is cancelled
              event.dataTransfer.dropEffect = "move";
              setDropTargetId(application.id);
            }}
            onDrop={(event) => {
              if (!reorderable || draggingId === null) return;
              event.preventDefault();
              if (draggingId !== application.id) {
                onReorder(draggingId, application.id);
              }
              endDrag();
            }}
            onDragEnd={endDrag}
          >
            {reorderable && (
              <span
                className="drag-handle"
                aria-hidden="true"
                title="Drag to reorder"
              />
            )}
            <div>
              <h2 className="list-row-role">
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
                    // A dragged link would carry its URL: drag the whole row instead.
                    draggable={reorderable ? false : undefined}
                    onClick={(event) => handleTitleClick(event, application.id)}
                    onDoubleClick={() => {
                      cancelPendingNavigation();
                      startInlineEdit(application);
                    }}
                  >
                    {application.role}
                  </Link>
                )}
              </h2>
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
              <p className="list-row-company">{application.company}</p>
            </div>
            <span className={`stage-badge stage-${application.stage}`}>
              {stageLabels[application.stage]}
            </span>
            <dl className="list-row-meta">
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
      })}
    </div>
  );
}
