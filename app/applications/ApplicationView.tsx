"use client";

import { useEffect, useState } from "react";
import type { Application } from "@/lib/types";
import AddApplicationForm from "./AddApplicationForm";
import ApplicationBoard from "./ApplicationBoard";
import ApplicationList from "./ApplicationList";

// Browser-only copy of the applications; never read during server rendering.
const STORAGE_KEY = "careertrack-applications";

type Filter = "all" | Application["stage"];
type Sort = "recent" | "oldest" | "company" | "manual";
type View = "list" | "board";

const stageLabels: Record<Application["stage"], string> = {
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

const filterOptions: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "applied", label: stageLabels.applied },
  { value: "interview", label: stageLabels.interview },
  { value: "offer", label: stageLabels.offer },
  { value: "rejected", label: stageLabels.rejected },
];

const sortOptions: { value: Sort; label: string }[] = [
  { value: "recent", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "company", label: "Company A–Z" },
  { value: "manual", label: "Manual" },
];

const viewOptions: { value: View; label: string }[] = [
  { value: "list", label: "List" },
  { value: "board", label: "Board" },
];

// Stored text is untrusted: accept an entry only if it has the shape of an
// Application, so a bad value can never reach the sort or the views.
function isApplication(value: unknown): value is Application {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.company === "string" &&
    typeof record.role === "string" &&
    typeof record.stage === "string" &&
    (Object.keys(stageLabels) as string[]).includes(record.stage) &&
    typeof record.appliedDate === "string"
  );
}

// Code-unit comparison: right for YYYY-MM-DD dates and the APP-### IDs.
function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// Pure: never mutates `applications`. Array.filter() returns a new array,
// so sorting that result in place cannot touch the prop.
function applyFilterAndSort(
  applications: Application[],
  filter: Filter,
  sort: Sort,
): Application[] {
  const result = applications.filter(
    (application) => filter === "all" || application.stage === filter,
  );
  // Manual keeps the order of `applications` (the user's drag order).
  if (sort === "manual") return result;
  return result.sort((a, b) => {
    let order: number;
    if (sort === "recent") {
      order = compareText(b.appliedDate, a.appliedDate);
    } else if (sort === "oldest") {
      order = compareText(a.appliedDate, b.appliedDate);
    } else {
      order = a.company.localeCompare(b.company, "en");
    }
    // Tie-breaker keeps the order consistent between renders.
    return order !== 0 ? order : compareText(a.id, b.id);
  });
}

export default function ApplicationView({
  applications,
}: {
  applications: Application[];
}) {
  // Local copy seeded from the server-rendered prop; new records are
  // appended here after the POST returns 201.
  const [items, setItems] = useState<Application[]>(applications);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [view, setView] = useState<View>("list");

  // False until the first localStorage read attempt has finished. It is state
  // (not a ref) so the write effect below sees false in the mount render.
  const [storageReady, setStorageReady] = useState(false);

  // Read effect: runs once after mount, in the browser only. Valid saved
  // data replaces the server data; anything else leaves it unchanged.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every(isApplication)) {
          // Reading browser-only storage after mount is the one place this
          // state must be set from an effect (it cannot be read during render).
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setItems(parsed);
        }
      }
    } catch {
      // Storage blocked or text is not valid JSON: keep the server data.
    }
    setStorageReady(true);
  }, []);

  // Write effect: saves `items` after every change, but never before the
  // read attempt has finished, so the server data cannot overwrite saved data.
  useEffect(() => {
    if (!storageReady) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Quota exceeded or storage blocked: ignore; the screen is unaffected.
    }
  }, [items, storageReady]);

  function handleAdd(application: Application) {
    setItems((previous) => [...previous, application]);
  }

  // Replace the saved record by id, only after the server confirmed it.
  function handleUpdate(updated: Application) {
    setItems((previous) =>
      previous.map((application) =>
        application.id === updated.id ? updated : application,
      ),
    );
  }

  // Remove the deleted record by id, only after the server confirmed it.
  function handleDelete(id: string) {
    setItems((previous) =>
      previous.filter((application) => application.id !== id),
    );
  }

  // Move `draggedId` to the slot held by `targetId` in the FULL items array
  // (hidden, filtered-out records keep their place). Builds a new array.
  function handleReorder(draggedId: string, targetId: string) {
    setItems((previous) => {
      const from = previous.findIndex(
        (application) => application.id === draggedId,
      );
      const to = previous.findIndex(
        (application) => application.id === targetId,
      );
      if (from === -1 || to === -1 || from === to) return previous;

      const next = [...previous]; // copy first: splice only touches the copy
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  // Derived during rendering from `items`: filter and sort stay as they are.
  const visible = applyFilterAndSort(items, filter, sort);

  return (
    <>
      <AddApplicationForm onAdd={handleAdd} />

      <div className="view-controls">
        <div
          className="control-group"
          role="group"
          aria-labelledby="filter-label"
        >
          <span className="control-label" id="filter-label">
            Stage
          </span>
          <div className="control-buttons">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className="control-button"
                aria-pressed={filter === option.value}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="control-group" role="group" aria-labelledby="sort-label">
          <span className="control-label" id="sort-label">
            Sort
          </span>
          <div className="control-buttons">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className="control-button"
                aria-pressed={sort === option.value}
                onClick={() => setSort(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="control-group" role="group" aria-labelledby="view-label">
          <span className="control-label" id="view-label">
            View
          </span>
          <div className="control-buttons">
            {viewOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className="control-button"
                aria-pressed={view === option.value}
                onClick={() => setView(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="section-note">No applications match this filter.</p>
      ) : view === "list" ? (
        <ApplicationList
          applications={visible}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          reorderable={sort === "manual"}
          onReorder={handleReorder}
        />
      ) : (
        <ApplicationBoard
          applications={visible}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}
