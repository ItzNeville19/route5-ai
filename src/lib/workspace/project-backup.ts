import { clerkClient } from "@clerk/nextjs/server";
import type { Project } from "@/lib/types";

const PROJECT_BACKUP_KEY = "route5ProjectsBackupV1";
const PROJECT_BACKUP_LIMIT = 64;

export type ProjectBackupItem = {
  id: string;
  name: string;
  iconEmoji: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProjectBackupPayload = {
  updatedAt: string;
  projects: ProjectBackupItem[];
};

function toBackupItem(project: Project): ProjectBackupItem {
  return {
    id: project.id,
    name: project.name,
    iconEmoji: project.iconEmoji ?? null,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

function parseBackup(raw: unknown): ProjectBackupItem[] {
  if (!raw || typeof raw !== "object") return [];
  const payload = raw as Partial<ProjectBackupPayload>;
  if (!Array.isArray(payload.projects)) return [];
  return payload.projects
    .filter((p): p is ProjectBackupItem => {
      if (!p || typeof p !== "object") return false;
      const x = p as Partial<ProjectBackupItem>;
      return (
        typeof x.id === "string" &&
        x.id.length > 0 &&
        typeof x.name === "string" &&
        x.name.trim().length > 0 &&
        (x.iconEmoji === null || x.iconEmoji === undefined || typeof x.iconEmoji === "string") &&
        typeof x.createdAt === "string" &&
        typeof x.updatedAt === "string"
      );
    })
    .slice(0, PROJECT_BACKUP_LIMIT);
}

export async function loadProjectBackupForUser(userId: string): Promise<ProjectBackupItem[]> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const raw = (user.privateMetadata as Record<string, unknown> | undefined)?.[PROJECT_BACKUP_KEY];
    return parseBackup(raw);
  } catch {
    return [];
  }
}

export async function saveProjectBackupForUser(userId: string, projects: Project[]): Promise<void> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const nextProjects = projects.slice(0, PROJECT_BACKUP_LIMIT).map(toBackupItem);
    const existing = (user.privateMetadata as Record<string, unknown> | undefined) ?? {};
    await client.users.updateUserMetadata(userId, {
      privateMetadata: {
        ...existing,
        [PROJECT_BACKUP_KEY]: {
          updatedAt: new Date().toISOString(),
          projects: nextProjects,
        } satisfies ProjectBackupPayload,
      },
    });
  } catch {
    /* non-fatal backup channel */
  }
}
