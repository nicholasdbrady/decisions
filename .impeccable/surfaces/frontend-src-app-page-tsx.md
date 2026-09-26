---
version: 1
slug: "frontend-src-app-page-tsx"
primary_target: "frontend/src/app/page.tsx"
related_targets: ["frontend/src/app/globals.css","frontend/src/app/layout.tsx"]
---

# Command Canvas Surface Brief

## Mode

Operate

## Job and audience

An expert user types a compact natural-language intent and needs the interface to become the right interactive object before a conventional agent response would arrive.

## Outcome and proof

- The active command stays editable and focused.
- JEV selects one of 15 bounded schemas after a 250 ms pause.
- The selected object appears immediately, then GPT-6 Luna enriches its fields.
- The optional Inspector proves why a switch occurred without competing with the primary task.
- Local submission confirms the interaction without external side effects.

## Structural and interaction thesis

The command is not sent away to chat. It is physically composed into the selected object in place. Classification, enrichment, and completion are visible as successive states of one continuous instrument.

The focal moment is the caret-preserving transition from sentence to object. The expert secondary moment is opening the right proof margin to inspect probabilities, hysteresis, latency, provider, and validated state.

## Scope and boundaries

- Desktop-first responsive web surface with a narrow-screen drawer adaptation.
- Fifteen initial object schemas and heterogeneous local history.
- No real integrations, generated executable UI, generic chat transcript, dashboard navigation, or decorative agent avatar.
- The supplied screenshots set the interaction-quality floor but do not dictate the visual identity.

## States and ranges

- Empty, typing, debouncing, classifying, ambiguous, selected, enriching, ready, locally saved, canceled, stale, timed out, unavailable credential, invalid payload, and recovered.
- Inputs range from a few characters to a short paragraph.
- Candidate scores cover all 15 schemas; the Inspector ranks and collapses them without losing access.
- History ranges from empty to dozens of heterogeneous local records.

## Interaction and layout

- One dominant command/object surface.
- Enter enriches immediately or submits when ready; Escape clears.
- Switching uses confidence, margin, and hysteresis rather than winner-takes-all flicker.
- Wide layouts place the Inspector in a secondary right margin; narrow layouts use a dismissible drawer.
- Motion communicates composition, field arrival, threshold crossing, cancellation, and completion; reduced-motion keeps state changes explicit.

## Constraints

- Next.js, React, CopilotKit, AG-UI, Python FastAPI, Microsoft Agent Framework, Foundry GPT-6 Luna, and JEV.
- Full keyboard operation, semantic controls, visible focus, non-color-only state, and reduced motion.
- The approved comp-first direction is binding for visual implementation.

## Direction contract

**THESIS:** Desktop Command Workspace turns a natural-language command into a familiar, reviewable work object without sending the user into a chat transcript. It favors immediate operational clarity over theatrical composition.

**OWN-WORLD:** Cool slate application ground, white work surfaces, precise blue focus and action states, green live status, Inter-style interface typography, 7-18 px corner radii, subtle borders, soft elevation, conventional form controls, probability bars, and compact status badges.

**STORY:** The user types a command, sees JEV identify a bounded intent with confidence, reviews the generated fields, checks the live Inspector when needed, and adds the object to local history from one desktop workspace.

**FIRST VIEWPORT:** At 1600x1000, a 72 px white application header sits above a concise workspace introduction. A large blue-accented command card occupies the left two-thirds and contains command input, detected intent, confidence, schema fields, and local action. A 344 px live Inspector occupies the right. Recent results form a full-width list below. On narrow screens, fields reflow and the Inspector becomes a floating drawer.

**FORM:** User-selected standing canon direction: JEV desktop command workspace, previously labeled Polished AI Command Bar. The prior seed key is unavailable in retained artifacts; `.impeccable/mocks/decision/canon.svg` is the approved visual authority.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
