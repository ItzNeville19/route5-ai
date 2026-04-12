/**
 * Minimal skeletons for common extraction use cases — user fills or pastes over.
 */
export type ExtractionPresetCategory = "product" | "gtm" | "ops";

export type ExtractionPreset = {
  id: string;
  label: string;
  /** One line — shown in UI */
  use: string;
  body: string;
  category: ExtractionPresetCategory;
};

export const EXTRACTION_PRESETS: ExtractionPreset[] = [
  {
    id: "decision",
    label: "Decision",
    use: "Choose between options, record rationale.",
    category: "product",
    body: `## Context

## Options
- A:
- B:

## Decision

## Why
`,
  },
  {
    id: "spec",
    label: "Spec / PRD",
    use: "Problem, scope, success metrics.",
    category: "product",
    body: `## Problem

## Goals & non-goals

## User story

## Requirements (must / should / could)

## Success metrics

## Open questions
`,
  },
  {
    id: "handoff",
    label: "Handoff",
    use: "Context for the next owner.",
    category: "product",
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
    category: "product",
    body: `## File / link

## Frames reviewed

## Feedback (must / should / could)

## Open questions

## Next iteration
`,
  },
  {
    id: "sales-call",
    label: "Sales call",
    use: "Discovery notes → next step.",
    category: "gtm",
    body: `## Account / contact

## Context & pain

## What we showed

## Objections & answers

## Budget / timing / champion

## Next step (owner / date)
`,
  },
  {
    id: "crm",
    label: "Account note",
    use: "Stakeholders, health, follow-ups.",
    category: "gtm",
    body: `## Account

## Stakeholders

## Recent touchpoints

## Health (1–5) & why

## Risks / competitors mentioned

## Next actions
`,
  },
  {
    id: "competitive",
    label: "Competitive",
    use: "Battlecard / win-loss.",
    category: "gtm",
    body: `## Competitor

## Positioning (them vs us)

## When we win

## When we lose

## Landmines / proof to use

## Talk track
`,
  },
  {
    id: "incident",
    label: "Incident",
    use: "Timeline, impact, follow-ups.",
    category: "ops",
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
    category: "ops",
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
    category: "ops",
    body: `## Last week

## This week

## Risks / blockers

## Asks
`,
  },
  {
    id: "retro",
    label: "Retro",
    use: "What went well / improve / actions.",
    category: "ops",
    body: `## What went well

## What slowed us down

## Ideas to try

## Action items (owner / due)
`,
  },
];

export const PRESET_CATEGORY_ORDER: ExtractionPresetCategory[] = ["product", "gtm", "ops"];

const byId = new Map(EXTRACTION_PRESETS.map((p) => [p.id, p]));

export function getExtractionPreset(id: string): ExtractionPreset | undefined {
  return byId.get(id);
}
