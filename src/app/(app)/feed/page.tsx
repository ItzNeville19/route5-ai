import type { Metadata } from "next";
import CommitmentFeed from "@/components/feed/CommitmentFeed";

export const metadata: Metadata = {
  title: "Feed",
  description: "Every commitment across your organization.",
};

export default function FeedPage() {
  return <CommitmentFeed />;
}
