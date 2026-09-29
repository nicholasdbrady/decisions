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

## A2UI catalog (Fluent 2)

The `/a2ui` omnibar builds its cards from a catalog of generic components that JEV composes at run time. New catalog components use public Fluent 2 (`@fluentui/react-components` v9, `webLightTheme`, Griffel `makeStyles` with `tokens`). Charts will use `@fluentui/react-charts`. `FluentRoot` (`frontend/src/fluent/root.tsx`) is the App Router style registry.

Each component is prototyped at `/a2ui/lab/<component>` with real content and the Complete, Streaming, and missing-data states. Nick approves each one before it is added to the catalog.

### Answer (approved)

General questions with cited sources. Prototype: `/a2ui/lab/answer`.

- The omnibar shows the question, so the card does not repeat it. The card opens on the answer.
- **Lead:** one or two sentences in `Title3`, the full width of the card, with no measure cap.
- **Points:** a bulleted list in `Body1`, with small brand-colored dots.
- **Citations:** every source is an inline chip with a favicon and a short domain. There are no numbered marks and no separate source list. The last word of a sentence stays on the same line as its first chip. When you hover over or focus a chip, a popover shows the Open Graph preview (image, site, title, description). A click opens the page in a new tab.
- **Featured page:** one Open Graph card for the most-cited source. Ties go to a page that has an image, then to a page that has a description. When the page has no image, the card shows only text, with no empty image tile.
- **Streaming:** a caret at the end of the last point, and a skeleton where the featured card will appear.
- The card fits its content; it never stretches to fill its container.

### Graph: comparison (approved)

Column, bar, clustered column, and stacked column charts. Prototype: `/a2ui/lab/graph`. Only the chart types that `@fluentui/react-charts` supports are in scope.

- **Card:** the same layout as the Answer card: a `Title3` lead that states the finding, then the chart, then the source footer with a favicon.
- **Client-only:** Fluent charts access `document` when the module loads. Load them with `next/dynamic` and `ssr: false`.
- **Colors:** `DataVizPalette` tokens converted with `getColorFromToken`. JEV makes one choice per chart:
  - **Palette:** each series keeps the same color in every chart.
  - **Semantic:** `success` for gains and `error` for losses.
  - Semantic is offered only for single-series charts (column, bar). Brand colors are out of scope.
- **Labels:** column charts show signed `%` value labels. The bar chart hides its value labels, because Fluent ignores `barLabel` there, and shows `%` ticks instead. Stacked axes show `0` with no unit.
- **Tooltips:** the x value is the short key (ticker) and the legend is the full name (company), so no value appears twice.

### Graph: trend (approved)

Line, area, stacked area, and zone charts. Prototype: `/a2ui/lab/graph?family=trend`.

- **Line:** several series rebased to 0% at the start, so series with different prices can be compared. Dots show only on hover.
- **Area:** one quantity, filled to zero (`mode="tozeroy"`) with a gradient. The axis starts at zero.
- **Stacked area:** the parts of a total over time. The top edge is the total.
- **Zone:** Fluent has no zone chart type. Use a line chart with a pale `colorFillBars` band over the period that the lead names. Fluent paints fill bars at full strength, so pass a translucent color. Set `yMinValue` so the line fills the plot.
- **Axes:** dates are shown as `Mon D`. Fluent reduces the tick density on narrow screens.
- **Leads:** computed from the data, never hard-coded. Series keep their comparison colors.

### Graph: composition (approved)

Pie, donut, funnel, and stacked funnel charts. Prototype: `/a2ui/lab/graph?family=composition`. Treemaps are not a Fluent chart type.

- **Pie and donut:** both use `DonutChart`. A pie has `innerRadius={0}` and percent labels. A donut puts the total in `valueInsideDonut`. Use semantic colors for up/down splits.
- **Funnel:** each stage is a subset of the stage before it. Stages fade from the series color, so the legend reads as an ordered sequence. Fluent shows stage names only in the legend, and it Title-Cases them.
- **Stacked funnel:** the same stages, split by series, using the series colors.
- **Sizing:** funnels default to 350px wide. Measure the card width with a `ResizeObserver` and pass it as `width`. Add 48px of padding below the funnel, because Fluent draws the legend outside the chart height.

### Graph: specialized (approved)

Combo and Sankey charts. Prototype: `/a2ui/lab/graph?family=specialized`. Sankey is the closest Fluent chart to a ribbon chart. Waterfall charts are not a Fluent chart type.

- **Combo:** `VerticalBarChart` with `lineData` and `useSecondaryYScale`. Fluent formats both axes with one function, so scale the series into ranges that do not overlap (for example, volume in billions and price in dollars) and select the unit by magnitude. Set `secondaryYScaleOptions` to rounded bounds.
- **Sankey:** use for flows between states. Nodes take semantic or series colors. Streams are drawn as outlines and fill with a gradient on hover. Pass the measured card width. `reflowProps={{ mode: "min-width" }}` makes the chart scroll sideways on narrow screens.

### Graph: custom (approved)

KPI, gauge, heat map, and scatter charts. Prototype: `/a2ui/lab/graph?family=custom`. Maps and free-form vector graphics are not Fluent chart types.

- **KPI:** tiles show the name, the latest value in `Title2`, the change in semantic color, and a sparkline. Fluent's `Sparkline` crashes under React StrictMode and pins the y-axis at zero, so use an inline SVG polyline scaled from the minimum to the maximum.
- **Gauge:** `single-segment`, with the value and the range in the sublabel. Min and max labels are hidden because they have no units.
- **Heat map:** a diverging scale (`error` → neutral → `success`), symmetric around zero, with a domain set by the largest absolute value. Use `Date` values on the time axis so Fluent keeps the order across legend bands. When the card is narrower than 560px, rotate the grid: time runs down the side with 36px rows, and there is no horizontal scroll.
- **Scatter:** two measures for each item. The lead states the relationship in plain words (for example, "same way on 43 of 64 days") before giving the coefficient.
- **Lab chrome:** the family tabs wrap on narrow screens.

### Media: video (approved)

One Video card with three modes. JEV picks the mode. Prototype: `/a2ui/lab/video`.

- **Single:** one video answers the question. The lead, a 16:9 player, then the title and a meta line (red channel mark, channel, date, views).
- **Chapters:** opens on the chapter JEV picked. The lead names the timestamp. A chapter rail sits beside the player; below 720px it goes under the player. Clicking a chapter seeks the player. The active row uses `colorBrandBackground2` and scrolls into view inside the rail only.
- **Playlist:** one video plays and the rest wait in a thumbnail rail. The rail header shows the count and total time. The lead summarizes the set.
- **Player:** a thumbnail facade with a play button and a duration badge (`start / total` when it opens on a chapter). Press play to swap in a `youtube-nocookie` iframe with `enablejsapi`, then seek with a postMessage `seekTo`. Nothing loads from YouTube before that.
- **Streaming:** a skeleton holds the 16:9 frame so the layout does not shift.

### Media: image (approved)

One Image card with five modes. JEV picks the mode. Prototype: `/a2ui/lab/image`.

- **Every mode:** the lead, then the media, then a caption with the credit line: author · license · source link. Images use their real aspect ratio with `width` and `height` set, so nothing shifts while they load. Clicking an image opens a Fluent `Dialog` viewer with the caption and credit. When there is a set, the viewer shows `n / total`, has previous and next buttons, and the arrow keys step through the set.
- **Single:** one image at its own aspect ratio.
- **Gallery:** a mosaic with one hero tile (2fr, two rows) and four tiles. Below 560px the hero spans the full width. Tiles crop with `object-fit: cover`, and the viewer shows the whole image.
- **Carousel:** an ordered sequence in a native scroll-snap track (16:9 slides) with a count, dots (the active dot widens), and previous and next buttons. The arrow keys also move it. The caption follows the current slide.
- **Vector:** SVGs are shown whole (`contain`) on a white plate beside a facts list, never cropped. The viewer opens the original file.
- **Animation:** a GIF with a Pause/Play button. Pause copies the current frame to a canvas, so the picture holds still. With `prefers-reduced-motion`, it starts paused.
- **Thumbnails:** request only standard CDN steps (for example, Commons 500, 960, 1280).

### Media: audio (approved)

One Audio card with two modes. JEV picks the mode. Prototype: `/a2ui/lab/audio`.

- **Player:** on a `colorNeutralBackground3` panel, a 48px round brand play button beside a waveform, with the time (`0:06 / 0:26`) and a Half speed toggle below. The waveform is 120 RMS peaks computed on the server from the real file. It is stretched so the noise floor sits near the baseline. Played bars use `colorBrandForeground1`, and a playhead marks the position.
- **Waveform = seek bar:** `role="slider"` with `aria-valuetext`. Click or drag to seek, arrow keys skip 5 seconds, and Home and End jump to the ends. Progress uses `requestAnimationFrame` while playing.
- **Track:** the lead, the player, then the name · type (*species*) and the credit: recordist · date recorded · license · source.
- **Playlist:** one player above a numbered queue (name, type, mini waveform, duration). Picking a row plays it, and each track leads into the next. The active row uses `colorBrandBackground2`, a brand mini waveform, and an equalizer in place of the number. The equalizer pauses with playback and is static under reduced motion. Below 480px the mini waveform is hidden.
- **Streaming:** a skeleton the height of the player.

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
