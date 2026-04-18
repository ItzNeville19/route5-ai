export function appBaseUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "http://localhost:3000";
  return base.startsWith("http") ? base : `https://${base}`;
}
