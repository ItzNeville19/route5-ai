import Stripe from "stripe";
import { appBaseUrl as resolveAppBaseUrl } from "@/lib/app-base-url";

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY?.trim();
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripe = new Stripe(key, {
      typescript: true,
    });
  }
  return stripe;
}

export const appBaseUrl = resolveAppBaseUrl;
