export interface Application {
  id: string;
  company: string;
  role: string;
  stage: "applied" | "interview" | "offer" | "rejected";
  appliedDate: string; // YYYY-MM-DD
}
