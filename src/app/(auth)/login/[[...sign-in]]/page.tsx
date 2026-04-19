import { isClerkFullyConfigured } from "@/lib/clerk-env";
import LoginPageClient from "./LoginPageClient";

export default function LoginPage() {
  return <LoginPageClient clerkRuntimeOk={isClerkFullyConfigured()} />;
}
