import { isClerkFullyConfigured } from "@/lib/clerk-env";
import SignUpPageClient from "./SignUpPageClient";

export default function SignUpPage() {
  return <SignUpPageClient clerkRuntimeOk={isClerkFullyConfigured()} />;
}
