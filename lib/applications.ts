import type { Application } from "@/lib/types";

export const applications: Application[] = [
  {
    id: "APP-001",
    company: "Northstar Logistics",
    role: "Data Analyst",
    stage: "applied",
    appliedDate: "2026-11-01",
  },
  {
    id: "APP-002",
    company: "BluePeak Analytics",
    role: "Business Analyst",
    stage: "interview",
    appliedDate: "2026-11-02",
  },
  {
    id: "APP-003",
    company: "BrightPath Consulting",
    role: "AI Implementation Specialist",
    stage: "applied",
    appliedDate: "2026-11-03",
  },
  {
    id: "APP-004",
    company: "Summit Retail",
    role: "Reporting Analyst",
    stage: "offer",
    appliedDate: "2026-11-04",
  },
  {
    id: "APP-005",
    company: "Horizon Supply",
    role: "Supply Chain Analyst",
    stage: "rejected",
    appliedDate: "2026-11-05",
  },
];

// Next id number to hand out. It starts one above the highest seeded id and
// only ever increases, so an id is never reused after a delete (for as long
// as this Node process runs; a restart re-seeds the array and this counter).
let nextNumber =
  applications.reduce((max, application) => {
    const match = /^APP-(\d+)$/.exec(application.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0) + 1;

// Synchronous, so two creates can never be given the same id.
export function nextApplicationId(): string {
  const id = `APP-${String(nextNumber).padStart(3, "0")}`;
  nextNumber += 1;
  return id;
}
