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

### Hero (approved)

One value that answers the question, with its context. Direction B2 "Header". Prototype: `/a2ui/lab/hero`.

- **Tinted head:** the whole top of the card uses a light wash of the tone: `color-mix(in srgb, <ink> 9%, colorNeutralBackground1)`. It holds the `Title3` lead, then one row: illustration · number · context. The stats sit below on plain `colorNeutralBackground1`.
- **Tones:** Fluent palette pairs, with `*Background2` as the tint and `*Foreground2` as the ink. Rain uses blue, a gain uses green, time uses lavender, and compute uses teal.
- **Illustration:** a 96px drawn SVG in the tone (72px on phones), chosen per reading. It is not an icon tile. Examples: a cloud with drizzle, bars under a rising arrow, a clock at the real time with a morning sun, a split pie.
- **Number:** `fontSizeHero900` semibold, tabular, with a `fontSizeBase500` unit and a `Body1` caption (colored for up/down).
- **Context visual:** always real data, beside the number. Examples: a temperature line over rain-chance bars in the provider's 3-hour forecast steps, a 3-month close line with area, two city day tracks with daylight and a now marker, food and tip split bars. A dot marks "now" or the latest point.
- **Stats:** one even row (`auto-fit, minmax(128px, 1fr)`). A stat gets a shape only when its data has one:
  - a range bar with a marker for where the value sits;
  - a share bar for a percentage;
  - a bearing arrow for wind.

  Each shape has a short plain-language note, for example "Near the high now" or "Light rain by 5 PM". Show only fields the provider returns. Stats with no shape (time, split) stay as plain text.
- **Motion:** a one-time chart wipe (clip-path) and bar growth. No looping motion. Under reduced motion, the final frame shows.
- **States:** Streaming shows the first six words of the lead plus skeletons for the number and the context. Partial drops the caption, the stats and the context.
- **Layout:** below 640px, the context moves under the illustration and the number.

### Ranked (approved)

Comparable rows, best first. Direction B "Bars". Prototype: `/a2ui/lab/ranked`.

- **Head:** a `Title3` lead that states the winner and the margin, then a `Caption1` naming the measure (for example "Change in close, Jun 29 to Sep 29, 2026").
- **Rows:** each row is its own bar: a 48px row on `colorNeutralBackground3`, with the tone wash filling it to `bar` (0..1). The leader fills at 26% and the others at 16%. The name and `sub` sit on the left, the value on the right. `delta` colors the value green or red.
- **Motion:** each fill grows once from the left, 80ms apart. None under reduced motion.
- **Streaming:** rows appear as they arrive. Skeleton rows hold space for the rest.

### Facts (approved)

The fields around an answer, led by the one that answers the question. Direction A4 "Answer first". Prototype: `/a2ui/lab/ranked` → Facts.

- **Question-shaped:** one data set can answer several questions. JEV picks `featured` (the fact that answers this prompt) and `order` (the rest by relevance). Python only supplies the values. Example: "weather in redmond" features the temperature, and "do i need an umbrella tonight" features rain chance from the same data.
- **Head:** the Hero wash holds the `Title3` lead and the featured fact in one row: a 56px Fluent `*48Regular` icon in the ink (44px on phones), the label, a `fontSizeHero800` value (`fontSizeBase600` when the value is words), and a note. The featured shape sits to the right and moves below the figure under 640px.
- **Featured shapes:** a range bar with labelled ends, 3-hour rain-chance slots with percentages and times, a daylight track from a sun to a moon with a now tick, or a parts bar with a legend.
- **Rest:** a Fluent Accordion ("More readings", "Closing detail", "Breakdown") with a count. Collapsed, it previews the first three ranked facts. Tiles use `auto-fill, minmax(176px, 1fr)`: a 16px Fluent icon in the ink with a `Caption1` label, a `fontSizeBase400` semibold value, an optional small shape, and a plain-language note. There are no tile borders or backgrounds.
- **Small shapes:** a share meter, a range with a marker, a gap from an average to the close (tick to marker), a daylight track, parts, and rain slots. Wind uses a bearing arrow as its icon.
- **Icons:** `@fluentui/react-icons` only, in the tone ink. There are no emoji or glyph stand-ins.
- **Streaming:** the lead and the featured fact first, then tiles in relevance order, with skeletons for the rest.

### Strip (approved)

A short sequence read left to right: days, hours, or sessions. Direction A2 "Tiles with scale". Prototype: `/a2ui/lab/strip`.

- **Head:** a `Title3` lead that answers the question (for example "Rain today, then dry and mild through Saturday."), then a `Caption1` with the place, the source, and the measure.
- **Tiles:** equal columns, `minmax(56px, 1fr)`. They scroll sideways with snap only when they do not fit. There are no tile borders. Each tile shows these rows, top to bottom:
  - The label, as a `Caption1`-size semibold label for the current tile.
  - A 24px Fluent weather icon in `colorNeutralForeground2`, or in the tone ink when the tile has a flag.
  - The value, `fontSizeBase500` semibold and tabular (`fontSizeBase400` under 480px).
  - `sub` (the low, "Feels 52°", or a green/red change).
  - A thin 4px track.
  - An optional flag pill: a tint background, ink text, and a 12px Fluent icon, for example a drop with "100%" or a star with "Best".
- **Current:** `current` puts the tile on the Hero wash (9% ink) and sets `aria-current`.
- **Shared scale:** every track uses the strip's one `scale`, so the eye compares shapes, not digits. A `lo`/`hi` item draws its span at 42% ink (full ink when current). A point item (`at`) draws a 10px dot. The current span also shows a "now" dot in `colorNeutralForeground1`.
- **Contract:** add numeric `lo?`, `hi?`, `at?`, `delta?`, and `current?` to Strip items, plus a strip-level `scale` that Python computes from the full set so tracks do not reflow while streaming. `flag` becomes `{ text, tone, icon }`.
- **Motion:** spans grow once from the left and dots pop in, 70ms apart. None under reduced motion.
- **Streaming:** arrived tiles render; skeleton tiles of the same height hold the rest.

### Range (approved)

One value between its low and high. Direction B2 "Answer, split card". Prototype: `/a2ui/lab/strip` → Range.

- **Head:** the `Title3` lead and `Caption1` source sit on the white card (for example "MSFT is 8% below its 52-week high.").
- **Answer band:** below the head, the Hero wash holds the answer. It shows the `fontSizeHero800` tabular value with a muted `unit` (`fontSizeHero700` on phones). Under the value is a 12px rail: a 45% ink fill up to the value and a 20px ink marker ringed in `colorNeutralBackground1`. The ends show the semibold low and high values with `Caption1` labels ("Day low", "52-week high").
- **Accessibility:** the rail is `role="img"`, with a label that states the value and how far it sits between the low and the high.
- **Motion:** the fill grows once and the marker pops in after it. None under reduced motion.
- **Streaming:** the head first; skeleton lines hold the band.

### Panel (approved)

A container that carries one condition through color. Direction B "Split". Prototype: `/a2ui/lab/chips`.

- **Split:** the `Title3` lead and `Caption1` source sit on the white card. Below them, the tone wash (9% ink over `colorNeutralBackground1`) holds the answer: a 48px Fluent `*24Regular` tone icon in the ink (40px on phones), a `fontSizeHero800` tabular value with a muted `unit`, a `colorNeutralForeground2` note, and the chips. This matches Range B2.
- **Tones:** each of the 15 contract tones is a Fluent palette pair (`Background2` tint, `Foreground2` ink) with one icon:

  | Tone | Palette | Icon |
  |---|---|---|
  | neutral | neutral grays | Circle |
  | clear | Marigold | WeatherSunny |
  | clouds | Steel | WeatherCloudy |
  | rain | Blue | WeatherRain |
  | storm | Grape | WeatherThunderstorm |
  | snow | LightTeal | WeatherSnow |
  | fog | Mink | WeatherFog |
  | up | Green | ArrowTrending |
  | down | Red | ArrowTrendingDown |
  | warn | DarkOrange | Warning |
  | time | Lavender | Clock |
  | compute | Teal | Calculator |
  | list | Cornflower | TextBulletListLtr |
  | record | Brown | Bookmark |
  | plan | Purple | TaskListLtr |

  These replace the four-tone `TONES` set used by the lab components so far; rain, up, time and compute keep the same pairs.
- **Choice:** JEV picks the tone from the answer's condition (rain now, a loss, a clock). Unknown tones fall back to neutral.
- **Streaming:** the head first, then the answer, then chips as they arrive.

### Chips (approved)

The short facts beside an answer, inside the Panel band. Prototype: `/a2ui/lab/chips`.

- **Look:** a Fluent `Tag` (`size="small"`, filled) at 28px height with a circular radius and tabular numerals. On the wash the chip is white (`colorNeutralBackground1`) with `colorNeutralForeground1` text and a 16px Fluent icon in the tone ink.
- **Content:** each chip holds one fact from the provider or code, in a few words ("Rain chance 100%", "8% below 52-week high", "Tomorrow there"). JEV picks which facts earn a chip. Chips never invent values.
- **Layout:** a wrapping `ul` with 8px gaps, labelled "Details".
- **Motion:** each chip fades and rises 4px once, 60ms apart. None under reduced motion.
- **Streaming:** arrived chips render; pill skeletons (112 × 28px) hold the rest.

### Clarify (approved)

A required argument was never stated, so the card asks. Direction D "Answer first". Prototype: `/a2ui/lab/clarify`. Case: "what time is it over there right now" gives `time_between` with no `to_city`, and the ranked places are New York 49%, London 30% and Tokyo 7%.

- **Answer first:** when each answer is cheap and has no side effects (a clock, a unit conversion, pure Python), compute it for the top ranked candidates (at most 3). Show those answers before the user picks. A tap only settles which one. When an answer costs an API call or is slow (weather, quotes), keep only the ranked rows without values, or limit it to one preview.
- **Split card:** the `Title3` question on white ("Which place did you mean? Here’s the time in each."). The `Caption1` says why the card asks ("Time difference · the question didn’t name a place"). Below them, the tone wash holds the choices. The card copy never names JEV or any model.
- **Candidate rows:** a white one-tap `button` (radius Medium, `shadow2`, `shadow8` on hover, focus ring `colorStrokeFocus2`) per ranked candidate. On the left: the name (semibold) over a 6px likelihood meter (tint track, ink fill) and a tabular %. On the right: the computed value (tabular, `fontSizeBase600`) over a `Caption1` context line ("Wed · 3 h ahead"). The top candidate is taller (88px, `shadow4`), with a `Text size={500}` name and a `fontSizeHero700` value. The accessible name states all of it: "New York, 49% likely, 12:22 AM Wed, 3 h ahead".
- **The rest:** "Also in the list" places without a share are white circular pills (36px). They are one tap each and show no value.
- **Custom input:** "Somewhere else" is a Fluent `Label` + `Input` (with a `Globe20Regular` icon) + a primary "Use this" `Button` in a `form`. Enter submits. The button is disabled while the field is empty or a request runs. Typed text goes to the resolver: direct match on the key or alias, then JEV, then Luna with web search.
- **States:**
  - **Streaming:** the question first; skeleton rows hold the band.
  - **Working:** a small `Spinner` and a `role="status"` line: "Getting the time in Tokyo…" for a pick, "Looking up “Reykjavik”…" for typed text.
  - **Submitted:** the card becomes the answer in place. The head changes to the approved Panel lead ("Tokyo is 16 hours ahead."), and the band shows the Panel answer (tone icon, Hero800 value, note). Below it: white chips "You picked Tokyo" (checkmark) and "Seattle 9:11 PM", and a transparent "Change place" button (undo icon) that returns to the question.
  - **Not found:** a warning `MessageBar` ("“Reykjavik” is not a place this can compute yet. Pick one below, or type a nearby city.") above the same choices. The field keeps the typed text.
- **Contract:** Clarify options gain an optional `preview: { value, context }`, which Python computes for at most 3 candidates when the capability is marked cheap. `Arg` gains a user-facing `ask` beside the JEV-facing `question`. A2UI mapping: each row and pill is a `Button` with the existing `pick` action, and the field is a `TextField` bound to `/typed` plus a `Button` that sends `bind("typed")`.
- **Motion:** rows fade and rise 4px once, 70ms apart; meters grow once from the left. The answer fades in on submit. None under reduced motion.

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
