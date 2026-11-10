import { applications } from "@/lib/applications";
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const application = applications.find((item) => item.id === id);

  if (!application) {
    return Response.json({ error: "Application not found" }, { status: 404 });
  }

  return Response.json(application);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const application = applications.find((item) => item.id === id);

  if (!application) {
    return Response.json({ error: "Application not found" }, { status: 404 });
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
    return badRequest("appliedDate must be a valid date in YYYY-MM-DD format");
  }

  // Every field is validated above, so the record is never half-updated.
  // Mutating the object in place updates the shared array used by the
  // list, detail, and homepage reads.
  application.company = company.trim();
  application.role = role.trim();
  application.stage = stage;
  application.appliedDate = appliedDate;

  return Response.json(application);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const index = applications.findIndex((item) => item.id === id);

  if (index === -1) {
    return Response.json({ error: "Application not found" }, { status: 404 });
  }

  // splice() removes exactly this record from the shared array in place, so
  // the list, detail and homepage reads all see the deletion.
  applications.splice(index, 1);

  // 204 No Content: no JSON and no body.
  return new Response(null, { status: 204 });
}
