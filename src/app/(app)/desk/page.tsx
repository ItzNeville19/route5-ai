import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Desk — Route5",
  description:
    "Turn emails, notes, and threads into owned next steps: pick a project, paste source material, run one structured decision capture — saved per program with checklists and audit-friendly history.",
};

export default function DeskPage() {
  redirect("/workspace/dashboard");
}
