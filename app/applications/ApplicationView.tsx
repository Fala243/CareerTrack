"use client";

import { useEffect, useState } from "react";
import type { Application } from "@/lib/types";
import AddApplicationForm from "./AddApplicationForm";
import ApplicationBoard from "./ApplicationBoard";
import ApplicationList from "./ApplicationList";

// Browser-only: the user's Manual order, as a list of application ids and
// nothing else. The records themselves always come from the database.
const ORDER_KEY = "careertrack-manual-order";

// Old key that held full Application records. Never read as data; it is only
// removed, once, after the first successful start-up below.
const LEGACY_STORAGE_KEY = "careertrack-applications";

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

// Stored text is untrusted: it is used only if it is a JSON array of strings.
function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  );
}

// Pure. Puts `records` (always the database's data) in the saved id order.
// Saved ids that no longer exist are ignored, repeated ids count once, and
// records missing from the saved order go to the end in their current order.
function applyManualOrder(
  records: Application[],
  savedIds: string[],
): Application[] {
  const remaining = new Map(records.map((record) => [record.id, record]));
  const ordered: Application[] = [];
  for (const id of savedIds) {
    const record = remaining.get(id);
    if (record) {
      ordered.push(record);
      remaining.delete(id);
    }
  }
  for (const record of records) {
    if (remaining.has(record.id)) ordered.push(record);
  }
  return ordered;
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
  // Local copy seeded from the server-rendered (database) prop; its ORDER is
  // the Manual order. New records are appended here after the POST returns 201.
  const [items, setItems] = useState<Application[]>(applications);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [view, setView] = useState<View>("list");

  // False until the first read of the saved order has finished. It is state
  // (not a ref) so the write effect below sees false in the mount render.
  const [storageReady, setStorageReady] = useState(false);

  // Read effect: runs once after mount, in the browser only. A saved id list
  // only re-orders the database records; anything else keeps the server order.
  useEffect(() => {
    let savedOrder: string[] | null = null;
    let storageReadable = false;
    try {
      const raw = localStorage.getItem(ORDER_KEY);
      storageReadable = true;
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw);
        if (isStringArray(parsed)) savedOrder = parsed;
      }
    } catch {
      // Storage blocked, or text is not valid JSON: keep the server order.
    }

    if (savedOrder !== null) {
      const order = savedOrder;
      // Reading browser-only storage after mount is the one place this
      // state must be set from an effect (it cannot be read during render).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItems((previous) => applyManualOrder(previous, order));
    }

    // Start-up succeeded (the database records are on screen): the old
    // full-record copy is no longer needed, so remove it. Never before this.
    if (storageReadable) {
      try {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch {
        // Ignore: the old key is harmless, it is never read.
      }
    }
    setStorageReady(true);
  }, []);

  // Write effect: saves ONLY the id order after every change, but never before
  // the read attempt has finished, so the server order cannot overwrite a
  // saved order that has not been read yet.
  useEffect(() => {
    if (!storageReady) return;
    try {
      localStorage.setItem(
        ORDER_KEY,
        JSON.stringify(items.map((application) => application.id)),
      );
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
