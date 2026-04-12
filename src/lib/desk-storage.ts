/** Persist Desk capture text per project — survives refresh and tab switches. */

export function deskCaptureStorageKey(projectId: string): string {
  return `route5:deskCapture:v1:${projectId}`;
}
