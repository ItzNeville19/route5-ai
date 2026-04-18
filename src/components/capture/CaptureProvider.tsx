"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import CapturePanel from "@/components/capture/CapturePanel";

type CaptureContextValue = {
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: boolean;
};

const CaptureContext = createContext<CaptureContextValue | null>(null);

export function useCapture(): CaptureContextValue {
  const ctx = useContext(CaptureContext);
  if (!ctx) {
    throw new Error("useCapture must be used within CaptureProvider");
  }
  return ctx;
}

export function CaptureProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const openFn = useCallback(() => setOpen(true), []);
  const closeFn = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    const onOpen = () => openFn();
    const onToggle = () => toggle();
    window.addEventListener("route5:capture-open", onOpen);
    window.addEventListener("route5:capture-toggle", onToggle);
    return () => {
      window.removeEventListener("route5:capture-open", onOpen);
      window.removeEventListener("route5:capture-toggle", onToggle);
    };
  }, [openFn, toggle]);

  return (
    <CaptureContext.Provider value={{ open: openFn, close: closeFn, toggle, isOpen: open }}>
      {children}
      <CapturePanel open={open} onClose={closeFn} />
    </CaptureContext.Provider>
  );
}
