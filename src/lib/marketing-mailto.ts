import { mailtoHref } from "@/lib/site";

/** Pre-filled walkthrough request — opens in the user’s mail app (Gmail, Apple Mail, Outlook, etc.). */
export function route5WalkthroughMailto(): string {
  return mailtoHref(
    "Route5 — Book a walkthrough",
    [
      "Hi Neville,",
      "",
      "I'd like to book a Route5 product walkthrough for our team.",
      "",
      "Company / team name:",
      "",
      "Best times to connect (include your timezone):",
      "",
      "What we want to see or roll out (e.g. Desk, task tracker, org):",
      "",
      "Thanks,",
      "[Your name]",
    ].join("\n")
  );
}

export function route5ContactFromWebsiteMailto(): string {
  return mailtoHref(
    "Route5 — Message from the website",
    [
      "Hi Neville,",
      "",
      "I'm writing from the Route5 website:",
      "",
      "",
      "Thanks,",
      "[Your name]",
    ].join("\n")
  );
}
