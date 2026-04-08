import ProjectDashboard from "@/components/app/ProjectDashboard";

type Props = { params: Promise<{ projectId: string }> };

export default async function ProjectDetailPage({ params }: Props) {
  const { projectId } = await params;
  return <ProjectDashboard projectId={projectId} />;
}
