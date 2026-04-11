import { Suspense } from "react";
import ProjectDashboard from "@/components/app/ProjectDashboard";

type Props = { params: Promise<{ projectId: string }> };

export default async function ProjectDetailPage({ params }: Props) {
  const { projectId } = await params;
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-[var(--workspace-surface)] ring-1 ring-[var(--workspace-border)]" />
          <p className="mt-5 text-[14px] font-medium text-[var(--workspace-fg)]">Loading…</p>
        </div>
      }
    >
      <ProjectDashboard projectId={projectId} />
    </Suspense>
  );
}
