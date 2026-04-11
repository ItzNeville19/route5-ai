/**
 * Minimal skeletons for common extraction use cases — user fills or pastes over.
 */
export type ExtractionPreset = {
  id: string;
  label: string;
  /** One line — shown in UI */
  use: string;
  body: string;
};

export const EXTRACTION_PRESETS: ExtractionPreset[] = [
  {
    id: "decision",
    label: "Decision",
    use: "Choose between options, record rationale.",
    body: `## Context

## Options
- A:
- B:

## Decision

## Why
`,
  },
  {
    id: "incident",
    label: "Incident",
    use: "Timeline, impact, follow-ups.",
    body: `## What happened

## Impact

## Timeline

## Root cause (if known)

## Next steps
`,
  },
  {
    id: "meeting",
    label: "Meeting",
    use: "Notes → decisions → owners.",
    body: `## Attendees

## Agenda

## Notes

## Decisions

## Actions (owner / due)
`,
  },
  {
    id: "weekly",
    label: "Weekly",
    use: "Shipped, risks, next week.",
    body: `## Last week

## This week

## Risks / blockers

## Asks
`,
  },
  {
    id: "handoff",
    label: "Handoff",
    use: "Context for the next owner.",
    body: `## Background

## Current state

## Open questions

## Links / refs
`,
  },
  {
    id: "design",
    label: "Design",
    use: "Figma frames, critique, design QA.",
    body: `## File / link

## Frames reviewed

## Feedback (must / should / could)

## Open questions

## Next iteration
`,
  },
];

const byId = new Map(EXTRACTION_PRESETS.map((p) => [p.id, p]));

export function getExtractionPreset(id: string): ExtractionPreset | undefined {
  return byId.get(id);
}
