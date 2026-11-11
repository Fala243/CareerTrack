import {
  deleteApplication,
  getApplication,
  updateApplication,
} from "@/lib/applications";
import type { Application } from "@/lib/types";

const stages: Application["stage"][] = [
  "applied",
  "interview",
  "offer",
  "rejected",
];

function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

function notFoundResponse() {
  return Response.json({ error: "Application not found" }, { status: 404 });
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isStage(value: unknown): value is Application["stage"] {
  return typeof value === "string" && (stages as string[]).includes(value);
}

// YYYY-MM-DD, and a real calendar date (rejects 2026-02-31).
function isDateString(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

// Any failure that is not the client's fault (for example the database being
// unreachable). The details go to the server log only; the browser gets a
// generic message, never SQL, credentials or the connection string.
function serverError(error: unknown) {
  console.error("CareerTrack API error:", error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const application = await getApplication(id);

    if (!application) {
      return notFoundResponse();
    }

    return Response.json(application);
  } catch (error) {
    return serverError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // An unknown id is a 404 before the body is even read (as before).
    if (!(await getApplication(id))) {
      return notFoundResponse();
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Request body must be valid JSON");
    }

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return badRequest("Request body must be a JSON object");
    }

    // A client-supplied `id` is never read: the existing id is preserved.
    const { company, role, stage, appliedDate } = body as Record<
      string,
      unknown
    >;

    if (!isNonEmptyString(company)) {
      return badRequest("company must be a non-empty string");
    }
    if (!isNonEmptyString(role)) {
      return badRequest("role must be a non-empty string");
    }
    if (!isStage(stage)) {
      return badRequest(
        "stage must be one of: applied, interview, offer, rejected",
      );
    }
    if (!isDateString(appliedDate)) {
      return badRequest(
        "appliedDate must be a valid date in YYYY-MM-DD format",
      );
    }

    // One UPDATE statement changes all four fields together, so the record is
    // never half-updated.
    const updated = await updateApplication(id, {
      company: company.trim(),
      role: role.trim(),
      stage,
      appliedDate,
    });

    // Deleted by someone else after the check above: the same 404.
    if (!updated) {
      return notFoundResponse();
    }

    return Response.json(updated);
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!(await deleteApplication(id))) {
      return notFoundResponse();
    }

    // 204 No Content: no JSON and no body.
    return new Response(null, { status: 204 });
  } catch (error) {
    return serverError(error);
  }
}
