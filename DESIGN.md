---
name: JEV
description: A warm omnibar surface that turns natural language into one live local card.
colors:
  page: "#f7f5f0"
  surface: "#fffdfa"
  ink: "#171717"
  muted: "#68635c"
  line: "#ddd7cc"
  focus: "#3b82f6"
  soft: "#f0ede7"
typography:
  body:
    fontFamily: 'Geist, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  command:
    fontFamily: 'Geist, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'
    fontSize: "21px"
    fontWeight: 460
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: 'Geist, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'
    fontSize: "28px"
    fontWeight: 650
    lineHeight: 1.06
    letterSpacing: "-0.035em"
rounded:
  omnibar: "24px"
  card-control: "16px"
  chip: "999px"
spacing:
  chip-gap: "8px"
  card-padding: "20px"
---

# Design System: JEV Omnibar Card

## Overview

**Creative North Star: “One sentence becomes one object.”**

JEV is no longer a slate desktop workspace. The surface is a warm, centered command object: a single omnibar sits near the top third of the page and progressively grows into exactly one live card. The visual world is quiet, tactile, and keyboard-first. It treats the typed sentence as the product, not as chat input or form setup.

## Core interaction

- The omnibar placeholder is exactly: “Type a plan, a list, a color or a sum. It becomes a card. Press / to see all 19 card types.”
- No card appears until the classifier has accepted enough evidence, a local deterministic parser has enough evidence, or the user locks a type with Tab or the slash menu.
- The card grows from the same white surface as the input. Focus never leaves the command line.
- Empty metadata is a dashed chip with a single plus icon labeled `Add …`; filled metadata is a solid warm-grey chip with a semantic icon or initial avatar.
- Enter commits a compact local row below the omnibar. Esc clears text, card, overrides, and lock.
- `/` as the first character opens the 19-card menu with icon, name, and example. Arrow keys and Enter select and lock a type.
- The Inspector is closed by default and slides in from the right; on mobile it becomes a bottom drawer.

## Tokens

- **Page:** `#f7f5f0`, warm off-white.
- **Surface:** `#fffdfa`, used for the omnibar, card, menu, and drawer.
- **Ink:** `#171717`, used for primary text and the commit button.
- **Muted:** `#68635c`, used for secondary labels and hints.
- **Line:** `#ddd7cc`, used for warm dividers and borders.
- **Focus:** `#3b82f6`, used only for the omnibar border, focus rings, and Inspector probability bars.
- **Soft fill:** `#f0ede7`, used for filled chips and local widgets.
- **Radius:** 24px for the omnibar shell, 16px for widgets, full pills for chips and command actions.
- **Elevation:** one soft offset shadow, `0 22px 70px rgb(54 45 31 / 13%), 0 4px 18px rgb(54 45 31 / 8%)`.

## Components

### Omnibar shell

A 640–720px wide white surface with a 2px blue border, 24px radius, large command text, a leading 16-dot matrix glyph, and a soft warm shadow. The dots sit idle at rest and pulse while JEV is classifying or fields are resolving, travelling in one of four patterns — rows, diagonal, ripple, spiral — chosen fresh for each query. When a card is live, the shell expands downward through a short clipped reveal.

### Live card

The card has a header with a small tinted icon tile and uppercase type label, a large derived title, wrapping chips, a schema-specific widget, and a footer with `Esc`, `Tab`, and the black pill commit action.

### Chips

Chips are the parser’s proof. They never invent content. Empty chips are dashed and clickable. Filled chips are solid and can be clicked into an inline input. Manual chip edits override parsed values until the command is cleared.

### Widgets

All 21 card types have a native widget:

1. **Event:** title plus date, time, place, people chips; video platforms use the video icon.
2. **Reminder:** task title with when and repeat chips.
3. **Shopping:** checkable grocery rows; meal/dish phrases call `/api/expand` per provider in parallel, render JEV as soon as it returns, then prefer Foundry unless the user picked a provider; dish mode toggles send `dish_modes`.
4. **Checklist:** checkable task rows with due chip.
5. **Timer:** raw phrase title, parsed label header, 150px SVG blue countdown ring, mm:ss/h:mm:ss numerals, start/pause/resume/reset controls, and `duration · label` committed summary.
6. **Countdown:** computed days-left result.
7. **Habit:** cadence, time of day, and streak chips.
8. **Note:** body summary with tag chips.
9. **Calc:** safe arithmetic result.
10. **Split:** total, people, tip chips with computed per-person share.
11. **Expense:** amount, merchant, category, date chips.
12. **Convert:** a two-sided instrument. A category select filters both unit dropdowns; the amount is editable, the units are swappable, and the result carries a copy button. Every change recomputes against `/api/convert` (pint for units, live rates for currency). No chip row — the controls are the fields.
13. **Random:** JEV names the game through `/api/decide` — dice, number, coin, wheel, bottle, pick, shuffle, order, teams, sticks, cards, blackjack — and the widget becomes it, never a phrase table. A dice tray you tap to hold faces between rolls, so Yahtzee is played rather than reported, with a roll counter and an n-of-a-kind note. A spun wheel whose wedges come from the same slice maths the pointer lands by; the same wheel, unlabelled, is the spun bottle, and a bottle needs no names to spin. A minted number, a coin disc, a chosen option lit against the rest, a shuffled order, face-down cards turned one at a time to reveal a turn order, a round-robin team deal, hidden-length straws you draw until the short one shows, real playing cards, or a dealt blackjack table with the hole card down and Hit/Stand against a dealer that stands on 17. Every draw is crypto-backed with rejection sampling, and re-rollable in place.
14. **Color:** swatches, hex, variants, and contrast-minded palette display.
15. **Contact:** name with phone, email, company chips.
16. **Goal:** outcome with metric, target, deadline chips.
17. **Bookmark:** URL, favicon, title/host, tags.
18. **Poll:** a poll you can actually answer. Option rows are vote buttons; a bar grows behind each one, scaled against the current leader, so the first vote fills its row and later votes rescale the field. Single-select moves your vote, multi-select accumulates it, and the footer counts the total instead of instructing you twice.
19. **Trip:** destination with dates, travelers, lodging chips.
20. **Weather:** four shapes, chosen by JEV through `/api/decide`, never by a phrase table. *Now* shows the current reading alone. *Hourly* shows a strip of three-hour steps with rain chances. *Daily* shows the span Luna resolved — a weekend, a work week, a holiday — with its own high and low. *Advice* leads with a verdict ("Yes — bring a layer") and the numbers that earned it, from JEV's rain, warm, and wind axes. Every step is bucketed in the place's own timezone, not the server's. A question that names no place is asked about Redmond, WA.
21. **Password:** a generator, not a printout. A crypto-drawn secret is set in mono with numbers and symbols tinted apart so it can be read aloud, over a four-segment strength meter labelled in bits. Length is a 4–64 slider that adopts the length you asked for; the four character sets are toggles that refuse to turn the last one off, and two further toggles drop look-alike and ambiguous characters. Copy confirms with a checkmark; every control redraws immediately.

### Committed rows

Rows sit below the omnibar, each with a small icon tile, summary, muted type label, and delete button revealed on hover/focus. They persist in localStorage.

### Inspector

The Inspector shows live classification probabilities, evidence, clarification, latency, selected schema, and decision reason. For shopping expansion it shows JEV, Foundry GPT-6 Luna, and optional Foundry GPT-6 Luna + web search side by side with per-provider pending/error states, latency, item counts, source links, and a provider selector. Foundry is preferred; JEV is fallback.

## Motion and accessibility

- One authored motion: the card expands from the omnibar in 150–220ms using an ease-out clip reveal.
- Reduced-motion users get immediate state changes.
- All interactive controls are real buttons or inputs with visible focus rings.
- The card region uses polite live semantics without acting like chat.
- Mobile keeps the omnibar full-width with 16px page margins and turns the Inspector into a bottom drawer.

## Do and don’t

### Do
- Keep one live card, not a feed of generated UI.
- Derive every chip from typed text, manual edits, deterministic computations, or expansion output.
- Preserve the typing flow through classification, expansion, and commit.
- Keep uncertainty inspectable but out of the main flow.

### Don’t
- Use generic AI purple, gradient text, emoji icons, or placeholder values that the user did not type.
- Show a card for under-evidenced text like `dinner`.
- Call shopping expansion for plain `buy milk, eggs`.
- Touch backend files or print backend secrets.
