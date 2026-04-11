import { notFound } from "next/navigation";
import {
  ALL_MARKETPLACE_APPS,
  getMarketplaceAppById,
} from "@/lib/marketplace-catalog";
import MarketplaceAppLaunchClient from "@/components/marketplace/MarketplaceAppLaunchClient";

export function generateStaticParams() {
  return ALL_MARKETPLACE_APPS.map((a) => ({ appId: a.id }));
}

export default async function MarketplaceAppPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;
  const app = getMarketplaceAppById(appId);
  if (!app) notFound();
  return <MarketplaceAppLaunchClient app={app} />;
}
