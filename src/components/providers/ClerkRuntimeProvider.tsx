"use client";

import { createContext, useContext, type ReactNode } from "react";

const ClerkRuntimeContext = createContext(false);

/**
 * Server computes `enabled` from {@link isClerkFullyConfigured} so the client never
 * mounts Clerk when `CLERK_SECRET_KEY` is missing (avoids 500s from Clerk on every route).
 */
export function ClerkRuntimeProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  return (
    <ClerkRuntimeContext.Provider value={enabled}>{children}</ClerkRuntimeContext.Provider>
  );
}

export function useClerkRuntimeEnabled(): boolean {
  return useContext(ClerkRuntimeContext);
}
