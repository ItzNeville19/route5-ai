"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type WorkspaceChromeActionsValue = {
  newTaskOpen: boolean;
  runAgentOpen: boolean;
  sendUpdateOpen: boolean;
  openNewTask: () => void;
  closeNewTask: () => void;
  openRunAgent: () => void;
  closeRunAgent: () => void;
  openSendUpdate: () => void;
  closeSendUpdate: () => void;
};

const WorkspaceChromeActionsContext = createContext<WorkspaceChromeActionsValue | null>(null);

export function WorkspaceChromeActionsProvider({ children }: { children: ReactNode }) {
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [runAgentOpen, setRunAgentOpen] = useState(false);
  const [sendUpdateOpen, setSendUpdateOpen] = useState(false);

  const openNewTask = useCallback(() => setNewTaskOpen(true), []);
  const closeNewTask = useCallback(() => setNewTaskOpen(false), []);
  const openRunAgent = useCallback(() => setRunAgentOpen(true), []);
  const closeRunAgent = useCallback(() => setRunAgentOpen(false), []);
  const openSendUpdate = useCallback(() => setSendUpdateOpen(true), []);
  const closeSendUpdate = useCallback(() => setSendUpdateOpen(false), []);

  const value = useMemo(
    (): WorkspaceChromeActionsValue => ({
      newTaskOpen,
      runAgentOpen,
      sendUpdateOpen,
      openNewTask,
      closeNewTask,
      openRunAgent,
      closeRunAgent,
      openSendUpdate,
      closeSendUpdate,
    }),
    [
      newTaskOpen,
      runAgentOpen,
      sendUpdateOpen,
      openNewTask,
      closeNewTask,
      openRunAgent,
      closeRunAgent,
      openSendUpdate,
      closeSendUpdate,
    ]
  );

  return (
    <WorkspaceChromeActionsContext.Provider value={value}>{children}</WorkspaceChromeActionsContext.Provider>
  );
}

export function useWorkspaceChromeActions(): WorkspaceChromeActionsValue {
  const ctx = useContext(WorkspaceChromeActionsContext);
  if (!ctx) {
    throw new Error("useWorkspaceChromeActions must be used within WorkspaceChromeActionsProvider");
  }
  return ctx;
}
