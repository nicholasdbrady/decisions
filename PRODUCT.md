# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js and React for the browser surface, CopilotKit and AG-UI for agent state and runtime transport, and a Python FastAPI backend using Microsoft Agent Framework.

## Users

The primary user is an expert developer or product designer exploring whether fast typed model decisions can make free-form software feel immediate, legible, and more useful than a conventional chat interface.

## Product Purpose

The prototype turns a short natural-language command into the right interactive object while the user is still typing. JEV selects a bounded UI schema quickly, and a Microsoft Foundry model enriches that object with validated structured fields. Success means the surface feels faster and more direct than chat while every transition remains explainable and safe.

## Positioning

The product separates fast probabilistic intent classification from slower structured enrichment. This lets the interface become the likely tool immediately, then improve its details without waiting for a full agent response or generating executable UI code.

## Operating Context

- The user types into one keyboard-first command canvas.
- JEV classifies after a short pause and selects among application-owned schemas.
- GPT-6 Luna enriches the selected schema after a longer pause and on submission.
- The command surface morphs in place without losing focus.
- An optional Inspector exposes probabilities, switching policy, provider, latency, usage, run state, and validated payloads.
- Submitted results remain local to the prototype.

## Capabilities and Constraints

- Initial schemas: event, reminder, checklist, timer, habit, color, split, expense, convert, random, contact, goal, bookmark, poll, and trip.
- Direct OpenRouter Decisions API is the baseline JEV provider.
- A later experiment uses the Microsoft Foundry admin-connected `openrouter` connection and its `jev-latest` model.
- Microsoft Foundry uses Entra authentication and the `gpt-6-luna` deployment.
- No real calendar, reminder, contact, finance, bookmark, or travel action is allowed in the prototype.
- UI output is a versioned, validated declarative contract. Models cannot emit executable React, HTML, CSS, JavaScript, URLs, or callbacks.
- Deterministic code owns arithmetic, conversion, color transformation, random generation, URL normalization, authorization, and validation.
- Stale classification or enrichment responses must never overwrite newer input.

## Brand Commitments

The supplied screenshots are binding interaction-quality references for immediacy, calm focus, spatial continuity, keyboard fluency, and object-specific controls. They are not a visual identity to copy. The prototype must establish an original, high-craft visual world through Impeccable's comp-first process.

## Evidence on Hand

- Five supplied screenshots demonstrate reminder, time-zone conversion, color exploration, event creation, and multi-candidate states.
- A research brief and implementation plan are stored in the current Copilot session artifacts.
- No production customer data, testimonials, benchmarks, or external integrations exist and none may be fabricated.

## Product Principles

1. Show the useful object before explaining it.
2. Preserve the user's typing flow through every model and state transition.
3. Make uncertainty inspectable instead of hiding it behind confident UI.
4. Bound model freedom with typed contracts and deterministic rules.
5. Earn visual novelty through interaction and craft, not generated-code spectacle.

## Accessibility & Inclusion

The surface must support full keyboard operation, visible focus, semantic controls, reduced motion, responsive wide and narrow layouts, non-color-only status cues, and readable uncertainty and error states.

