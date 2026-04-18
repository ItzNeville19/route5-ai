"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type OnboardingFlowContextValue = {
  orgName: string;
  setOrgName: (v: string) => void;
};

const OnboardingFlowContext = createContext<OnboardingFlowContextValue | null>(
  null
);

export function OnboardingFlowProvider({ children }: { children: ReactNode }) {
  const [orgName, setOrgName] = useState("");
  const value = useMemo(
    () => ({ orgName, setOrgName }),
    [orgName]
  );
  return (
    <OnboardingFlowContext.Provider value={value}>
      {children}
    </OnboardingFlowContext.Provider>
  );
}

export function useOnboardingFlow(): OnboardingFlowContextValue {
  const v = useContext(OnboardingFlowContext);
  if (!v) {
    throw new Error("useOnboardingFlow must be used within OnboardingFlowProvider");
  }
  return v;
}
