import AppShell from "@/components/app/AppShell";

/** App routes use Clerk `useAuth` inside `AppShell`; avoid static prerender without a live Clerk session. */
export const dynamic = "force-dynamic";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
