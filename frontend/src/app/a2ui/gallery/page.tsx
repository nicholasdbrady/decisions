"use client";

import "@copilotkit/react-core/v2/styles.css";

import { useEffect } from "react";
import { A2UIProvider, A2UIRenderer, useA2UI } from "@copilotkit/a2ui-renderer";

import { jevCatalog } from "@/a2ui/catalog";
import { JEV_CATALOG_ID } from "@/a2ui/definitions";

/**
 * Every JEV catalog component, painted from plain A2UI v0.9 operations with no
 * agent in the loop. The fixtures use the same wire shapes the backend sends,
 * so a component that looks right here looks right in the omnibar.
 */

type Node = Record<string, unknown> & { id: string; component: string };
type Fixture = { id: string; prompt: string; components: Node[]; data: Record<string, unknown> };

const at = (path: string) => ({ path: `/${path}` });
const json = (value: unknown) => JSON.stringify(value);

const FIXTURES: Fixture[] = [
  {
    id: "weather",
    prompt: "weather in redmond",
    components: [
      { id: "root", component: "Card", child: "body" },
      { id: "body", component: "Column", children: ["head", "sky", "more"] },
      { id: "head", component: "Header", kind: "Weather", title: at("title"), icon: "cloud-sun", tone: "time", source: "Open-Meteo" },
      { id: "sky", component: "Panel", tone: at("tone"), child: "sky_body" },
      { id: "sky_body", component: "Column", children: ["now", "today", "chips", "days"] },
      { id: "now", component: "Hero", value: at("temp"), unit: "°F", caption: at("condition"), icon: "rain" },
      { id: "today", component: "Range", low: at("low"), high: at("high"), value: at("tempNumber"), unit: "°", caption: "Today" },
      { id: "chips", component: "Chips", items: at("chips") },
      { id: "days", component: "Strip", items: at("days") },
      { id: "more", component: "Facts", title: "More readings", collapsed: true, items: at("facts") },
    ],
    data: {
      title: "Light rain in Redmond, clearing by Thursday",
      tone: "rain",
      temp: "60",
      condition: "Light rain · feels like 58°",
      tempNumber: 60,
      low: 51,
      high: 64,
      chips: json([
        { label: "Wind 8 mph", icon: "wind" },
        { label: "Humidity 82%", icon: "droplets" },
        { label: "Rain 70%", icon: "umbrella" },
      ]),
      days: json([
        { label: "Tue", value: "64°", sub: "51°", icon: "rain", flag: "70%" },
        { label: "Wed", value: "61°", sub: "49°", icon: "rain", flag: "40%" },
        { label: "Thu", value: "66°", sub: "50°", icon: "cloud-sun" },
        { label: "Fri", value: "70°", sub: "52°", icon: "sun" },
        { label: "Sat", value: "72°", sub: "54°", icon: "sun" },
        { label: "Sun", value: "68°", sub: "53°", icon: "cloud" },
      ]),
      facts: json([
        { label: "Sunrise", value: "7:03 AM" },
        { label: "Sunset", value: "6:44 PM" },
        { label: "UV index", value: "2" },
        { label: "Pressure", value: "1012 hPa" },
        { label: "Visibility", value: "9 mi" },
        { label: "Dew point", value: "54°" },
      ]),
    },
  },
  {
    id: "stocks",
    prompt: "compare nvda amd and msft over the past three months",
    components: [
      { id: "root", component: "Card", child: "body" },
      { id: "body", component: "Column", children: ["head", "chart", "ranked", "more"] },
      { id: "head", component: "Header", kind: "Markets", title: at("title"), icon: "trending-up", tone: "up", source: "Yahoo Finance" },
      { id: "chart", component: "Chart", series: at("series"), unit: "%", caption: "Change since Jul 1, daily close" },
      { id: "ranked", component: "Ranked", items: at("ranked") },
      { id: "more", component: "Facts", title: "Closing detail", collapsed: true, items: at("facts") },
    ],
    data: {
      title: "NVDA leads, up 18.4% in three months",
      series: json({
        labels: ["Jul 1", "Jul 15", "Aug 1", "Aug 15", "Sep 1", "Sep 15", "Sep 29"],
        series: {
          NVDA: [0, 4.1, 9.8, 6.2, 12.5, 15.1, 18.4],
          MSFT: [0, 1.2, 3.5, 2.1, 4.9, 5.8, 6.2],
          AMD: [0, -2.4, -5.1, -1.3, -3.8, -6.2, -4.7],
        },
      }),
      ranked: json([
        { label: "NVDA", sub: "NVIDIA", value: "$176.20", delta: 18.4, bar: 1 },
        { label: "MSFT", sub: "Microsoft", value: "$512.44", delta: 6.2, bar: 0.34 },
        { label: "AMD", sub: "Advanced Micro Devices", value: "$151.08", delta: -4.7, bar: 0.26 },
      ]),
      facts: json([
        { label: "Window", value: "Jul 1 – Sep 29" },
        { label: "Sessions", value: "63" },
        { label: "Best day", value: "NVDA +6.1%" },
        { label: "Worst day", value: "AMD −5.3%" },
      ]),
    },
  },
  {
    id: "time",
    prompt: "what time is it in tokyo",
    components: [
      { id: "root", component: "Card", child: "body" },
      { id: "body", component: "Column", children: ["head", "panel", "zones"] },
      { id: "head", component: "Header", kind: "Time zones", title: at("title"), icon: "globe", tone: "time" },
      { id: "panel", component: "Panel", tone: "time", child: "panel_body" },
      { id: "panel_body", component: "Column", children: ["now"] },
      { id: "now", component: "Hero", value: at("clock"), caption: at("date"), icon: "clock", aside: "+16 h", asideCaption: "from Seattle" },
      { id: "zones", component: "Ranked", caption: "Also now", items: at("zones") },
    ],
    data: {
      title: "Tokyo is 16 hours ahead",
      clock: "8:15 AM",
      date: "Wednesday, Sep 30 · JST",
      zones: json([
        { label: "Seattle", sub: "PDT · home", value: "4:15 PM Tue" },
        { label: "London", sub: "BST", value: "12:15 AM Wed" },
        { label: "Tokyo", sub: "JST", value: "8:15 AM Wed" },
      ]),
    },
  },
  {
    id: "split",
    prompt: "split $120 dinner four ways with 20% tip",
    components: [
      { id: "root", component: "Card", child: "body" },
      { id: "body", component: "Column", children: ["head", "each", "parts", "fields"] },
      { id: "head", component: "Header", kind: "Split bill", icon: "receipt", tone: "compute" },
      { id: "each", component: "Hero", value: at("each"), caption: "each, tip included", icon: "users", aside: at("total"), asideCaption: "Total" },
      { id: "parts", component: "Facts", items: at("parts") },
      { id: "fields", component: "Row", align: "end", children: ["bill", "people"] },
      { id: "bill", component: "TextField", label: "Bill", value: at("bill"), variant: "number" },
      { id: "people", component: "TextField", label: "People", value: at("people"), variant: "number" },
    ],
    data: {
      each: "$36.00",
      total: "$144.00",
      bill: "120",
      people: "4",
      parts: json([
        { label: "Bill", value: "$120.00" },
        { label: "Tip 20%", value: "$24.00" },
        { label: "People", value: "4" },
        { label: "Each", value: "$36.00" },
      ]),
    },
  },
  {
    id: "clarify",
    prompt: "what time is it over there",
    components: [
      { id: "root", component: "Card", child: "body" },
      { id: "body", component: "Column", children: ["head", "pick", "other"] },
      { id: "head", component: "Header", kind: "Needs one detail", title: "Which place do you mean?", subtitle: "JEV is not sure enough to guess. Pick one or name it.", icon: "pin", tone: "warn" },
      {
        id: "pick",
        component: "ChoicePicker",
        label: "Likely places",
        value: at("pick"),
        variant: "mutuallyExclusive",
        options: [
          { label: "New York · 49%", value: "new_york" },
          { label: "London · 30%", value: "london" },
          { label: "Tokyo · 7%", value: "tokyo" },
        ],
      },
      { id: "other", component: "Row", align: "end", children: ["typed", "use"] },
      { id: "typed", component: "TextField", label: "Another place", value: at("typed") },
      { id: "use", component: "Button", child: "use_label", variant: "primary", action: { event: { name: "clarify", context: {} } } },
      { id: "use_label", component: "Text", text: "Use this" },
    ],
    data: { pick: [], typed: "" },
  },
];

function ops(fixture: Fixture): Array<Record<string, unknown>> {
  const surfaceId = `gallery-${fixture.id}`;
  return [
    { version: "v0.9", createSurface: { surfaceId, catalogId: JEV_CATALOG_ID } },
    { version: "v0.9", updateComponents: { surfaceId, components: fixture.components } },
    { version: "v0.9", updateDataModel: { surfaceId, path: "/", value: fixture.data } },
  ];
}

function Paint() {
  const { processMessages, clearSurfaces } = useA2UI();
  useEffect(() => {
    // StrictMode runs effects twice; createSurface rejects a surface that exists.
    clearSurfaces();
    processMessages(FIXTURES.flatMap(ops));
  }, [processMessages, clearSurfaces]);
  return null;
}

export default function GalleryPage() {
  return (
    <main className="omnibar-page gallery-page">
      <header className="gallery-intro">
        <span className="jev-kind">A2UI catalog</span>
        <h1>One vocabulary, many answers</h1>
        <p>
          Every card here is composed from the same generic parts. JEV chooses which part shows which
          field when the data arrives.
        </p>
      </header>
      <A2UIProvider catalog={jevCatalog}>
        <Paint />
        <div className="gallery-grid">
          {FIXTURES.map((fixture) => (
            <article key={fixture.id} className="omnibar-shell has-card gallery-item">
              <div className="gallery-prompt">{fixture.prompt}</div>
              <section className="live-card a2ui-card">
                <A2UIRenderer surfaceId={`gallery-${fixture.id}`} />
              </section>
            </article>
          ))}
        </div>
      </A2UIProvider>
    </main>
  );
}
