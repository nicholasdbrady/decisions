"use client";

import "@copilotkit/react-core/v2/styles.css";

import { useEffect } from "react";
import { A2UIProvider, A2UIRenderer, useA2UI } from "@copilotkit/a2ui-renderer";

import { jevCatalog } from "@/a2ui/catalog";
import { JEV_CATALOG_ID } from "@/a2ui/definitions";
import { FluentRoot } from "@/fluent/root";

type Node = Record<string, unknown> & { id: string; component: string };
type Fixture = {
  id: string;
  prompt: string;
  components: Node[];
  data: Record<string, unknown>;
};

const at = (path: string) => ({ path: `/${path}` });
const json = (value: unknown) => JSON.stringify(value);
const event = (name: string, context: Record<string, unknown>) => ({
  event: { name, context },
});

const FIXTURES: Fixture[] = [
  {
    id: "answer",
    prompt: "what is A2UI?",
    components: [
      { id: "root", component: "Card", child: "body" },
      { id: "body", component: "Column", children: ["answer"] },
      {
        id: "answer",
        component: "Answer",
        lead: at("lead"),
        leadSources: at("leadSources"),
        points: at("answerPoints"),
        sources: at("answerSources"),
      },
    ],
    data: {
      lead: "A2UI is an open, declarative format that lets an agent describe a user interface as data while the app renders trusted native components.",
      leadSources: json(["https://a2ui.org/"]),
      answerPoints: json([
        {
          text: "Agents stream a component tree and data model instead of executable UI code.",
          sources: [
            "https://a2ui.org/",
            "https://github.com/a2ui-project/a2ui",
          ],
        },
        {
          text: "The client keeps control of rendering, accessibility, and platform-specific design.",
          sources: [
            "https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/",
          ],
        },
      ]),
      answerSources: json([
        {
          url: "https://a2ui.org/",
          title: "A2UI",
          site: "A2UI",
          description: "A streaming protocol for agent-driven user interfaces.",
        },
        {
          url: "https://github.com/a2ui-project/a2ui",
          title: "a2ui-project/a2ui",
          site: "GitHub",
          description: "The open-source A2UI project.",
          image: "https://opengraph.githubassets.com/1/a2ui-project/a2ui",
        },
        {
          url: "https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/",
          title:
            "Introducing A2UI: An open project for agent-driven interfaces",
          site: "Google Developers Blog",
        },
      ]),
    },
  },
  {
    id: "weather",
    prompt: "weather in redmond",
    components: [
      { id: "root", component: "Card", child: "body" },
      {
        id: "body",
        component: "Column",
        children: ["hero", "range", "chips", "days", "facts"],
      },
      {
        id: "hero",
        component: "Hero",
        title: at("title"),
        value: at("temp"),
        unit: "°F",
        caption: at("condition"),
        tone: "rain",
        art: "rain",
        context: at("forecast"),
        contextCaption: "Rain eases after Wednesday",
        stats: at("weatherStats"),
      },
      {
        id: "range",
        component: "Range",
        low: at("low"),
        high: at("high"),
        value: at("tempNumber"),
        suffix: "°",
        lowLabel: "Day low",
        highLabel: "Day high",
        tone: "rain",
      },
      { id: "chips", component: "Chips", items: at("chips") },
      {
        id: "days",
        component: "Strip",
        items: at("days"),
        scale: at("dayScale"),
        tone: "rain",
      },
      {
        id: "facts",
        component: "Facts",
        title: "What matters now",
        featured: "rain",
        order: at("factOrder"),
        more: "More readings",
        collapsed: true,
        tone: "rain",
        items: at("facts"),
      },
    ],
    data: {
      title: "Light rain in Redmond, clearing by Thursday",
      temp: "60",
      condition: "Feels like 58°",
      tempNumber: 60,
      low: 51,
      high: 64,
      forecast: json({
        kind: "forecast",
        steps: [
          { label: "Now", value: 60, rain: 70 },
          { label: "2 PM", value: 61, rain: 55 },
          { label: "5 PM", value: 59, rain: 35 },
          { label: "8 PM", value: 56, rain: 20 },
        ],
      }),
      weatherStats: json([
        { label: "Humidity", value: "82%", shape: { kind: "meter", pct: 82 } },
        { label: "Wind", value: "8 mph", shape: { kind: "bearing", deg: 220 } },
        { label: "Rain", value: "70%", tone: "rain" },
      ]),
      chips: json([
        { label: "Wind 8 mph", icon: "wind" },
        { label: "Humidity 82%", icon: "drop" },
        { label: "Rain 70%", icon: "umbrella" },
      ]),
      dayScale: json([49, 72]),
      days: json([
        {
          label: "Tue",
          value: "64°",
          sub: "51°",
          icon: "rain",
          lo: 51,
          hi: 64,
          at: 60,
          current: true,
          flag: { text: "70%", tone: "rain", icon: "drop" },
        },
        {
          label: "Wed",
          value: "61°",
          sub: "49°",
          icon: "rain",
          lo: 49,
          hi: 61,
          flag: { text: "40%", tone: "rain", icon: "drop" },
        },
        {
          label: "Thu",
          value: "66°",
          sub: "50°",
          icon: "cloud-sun",
          lo: 50,
          hi: 66,
        },
        { label: "Fri", value: "70°", sub: "52°", icon: "sun", lo: 52, hi: 70 },
        { label: "Sat", value: "72°", sub: "54°", icon: "sun", lo: 54, hi: 72 },
      ]),
      factOrder: json(["wind", "humidity", "sunset", "pressure"]),
      facts: json([
        {
          id: "rain",
          label: "Rain chance",
          value: "70",
          unit: "%",
          icon: "rain",
          note: "Most likely before 2 PM",
          shape: { kind: "meter", pct: 70 },
        },
        {
          id: "wind",
          label: "Wind",
          value: "8 mph",
          icon: "wind",
          bearing: 220,
        },
        { id: "humidity", label: "Humidity", value: "82%", icon: "drop" },
        { id: "sunset", label: "Sunset", value: "6:44 PM", icon: "sunset" },
        { id: "pressure", label: "Pressure", value: "1012 hPa", icon: "gauge" },
      ]),
    },
  },
  {
    id: "stocks",
    prompt: "compare nvda amd and msft over the past three months",
    components: [
      { id: "root", component: "Card", child: "body" },
      {
        id: "body",
        component: "Column",
        children: ["head", "chart", "ranked", "facts"],
      },
      {
        id: "head",
        component: "Header",
        title: at("title"),
        caption: "Three months · Yahoo Finance",
      },
      {
        id: "chart",
        component: "Chart",
        series: at("series"),
        unit: "%",
        caption: "Change since Jul 1, daily close",
      },
      { id: "ranked", component: "Ranked", items: at("ranked"), tone: "up" },
      {
        id: "facts",
        component: "Facts",
        title: "NVDA leads the group",
        featured: "window",
        more: "Closing detail",
        collapsed: true,
        tone: "up",
        items: at("facts"),
      },
    ],
    data: {
      title: "NVDA leads, up 18.4% in three months",
      series: json({
        labels: [
          "Jul 1",
          "Jul 15",
          "Aug 1",
          "Aug 15",
          "Sep 1",
          "Sep 15",
          "Sep 29",
        ],
        series: {
          NVDA: [0, 4.1, 9.8, 6.2, 12.5, 15.1, 18.4],
          MSFT: [0, 1.2, 3.5, 2.1, 4.9, 5.8, 6.2],
          AMD: [0, -2.4, -5.1, -1.3, -3.8, -6.2, -4.7],
        },
      }),
      ranked: json([
        { label: "NVDA", sub: "NVIDIA", value: "$176.20", delta: 18.4, bar: 1 },
        {
          label: "MSFT",
          sub: "Microsoft",
          value: "$512.44",
          delta: 6.2,
          bar: 0.34,
        },
        {
          label: "AMD",
          sub: "Advanced Micro Devices",
          value: "$151.08",
          delta: -4.7,
          bar: 0.26,
        },
      ]),
      facts: json([
        {
          id: "window",
          label: "Window",
          value: "Jul 1 – Sep 29",
          icon: "calendar",
          note: "63 trading sessions",
        },
        { label: "Best day", value: "NVDA +6.1%", icon: "trending-up" },
        { label: "Worst day", value: "AMD −5.3%", icon: "trending-down" },
      ]),
    },
  },
  {
    id: "time",
    prompt: "what time is it in tokyo",
    components: [
      { id: "root", component: "Card", child: "body" },
      { id: "body", component: "Column", children: ["head", "panel", "zones"] },
      {
        id: "head",
        component: "Header",
        title: "Tokyo is 16 hours ahead.",
        caption: "Tokyo · current local time",
      },
      { id: "panel", component: "Panel", tone: "time", child: "panelBody" },
      { id: "panelBody", component: "Column", children: ["now", "timeChips"] },
      {
        id: "now",
        component: "Metric",
        value: at("clock"),
        caption: at("date"),
        icon: "clock",
      },
      { id: "timeChips", component: "Chips", items: at("timeChips") },
      { id: "zones", component: "Ranked", items: at("zones"), tone: "time" },
    ],
    data: {
      clock: "8:15 AM",
      date: "Wednesday, Sep 30 · JST",
      timeChips: json([
        { label: "Tomorrow there", icon: "calendar" },
        { label: "Same day in Seattle", icon: "globe" },
        { label: "JST has no DST", icon: "info" },
      ]),
      zones: json([
        { label: "Tokyo", sub: "JST", value: "8:15 AM Wed", bar: 1 },
        { label: "London", sub: "BST", value: "12:15 AM Wed", bar: 0.65 },
        {
          label: "Seattle",
          sub: "PDT · home",
          value: "4:15 PM Tue",
          bar: 0.35,
        },
      ]),
    },
  },
  {
    id: "split",
    prompt: "split $120 dinner four ways with 20% tip",
    components: [
      { id: "root", component: "Card", child: "body" },
      {
        id: "body",
        component: "Column",
        children: ["hero", "facts", "fields"],
      },
      {
        id: "hero",
        component: "Hero",
        title: "$36 each, tip included",
        value: at("each"),
        caption: "Four people · 20% tip",
        tone: "compute",
        art: "split",
        context: at("parts"),
        contextCaption: "$144 total",
      },
      {
        id: "facts",
        component: "Facts",
        title: "Bill breakdown",
        tone: "compute",
        items: at("billFacts"),
      },
      {
        id: "fields",
        component: "Row",
        align: "end",
        children: ["bill", "people"],
      },
      {
        id: "bill",
        component: "TextField",
        label: "Bill",
        value: at("bill"),
        variant: "number",
      },
      {
        id: "people",
        component: "TextField",
        label: "People",
        value: at("people"),
        variant: "number",
      },
    ],
    data: {
      each: "$36.00",
      bill: "120",
      people: "4",
      parts: json({
        kind: "parts",
        parts: [
          { label: "Bill", value: 120 },
          { label: "Tip", value: 24 },
        ],
      }),
      billFacts: json([
        { label: "Bill", value: "$120.00", icon: "receipt" },
        { label: "Tip", value: "$24.00", note: "20%", icon: "sparkles" },
        { label: "People", value: "4", icon: "people" },
        { label: "Each", value: "$36.00", icon: "calculator" },
      ]),
    },
  },
  {
    id: "clarify",
    prompt: "what time is it over there",
    components: [
      { id: "root", component: "Card", child: "body" },
      { id: "body", component: "Column", children: ["head", "panel"] },
      {
        id: "head",
        component: "Header",
        title: "Which place do you mean?",
        caption: "Pick one to see the local time, or name another place.",
      },
      { id: "panel", component: "Panel", tone: "time", child: "choices" },
      {
        id: "choices",
        component: "Column",
        children: [
          "hint",
          "newYork",
          "london",
          "tokyo",
          "also",
          "pills",
          "other",
        ],
      },
      {
        id: "hint",
        component: "Text",
        variant: "caption",
        text: "Most likely from context",
      },
      {
        id: "newYork",
        component: "Button",
        variant: "borderless",
        child: "newYorkChoice",
        action: event("pick", { argument: "to_city", value: "new_york" }),
      },
      {
        id: "newYorkChoice",
        component: "Choice",
        name: "New York",
        share: 0.49,
        value: "12:22 AM",
        context: "Wed · 3 h ahead",
        top: true,
      },
      {
        id: "london",
        component: "Button",
        variant: "borderless",
        child: "londonChoice",
        action: event("pick", { argument: "to_city", value: "london" }),
      },
      {
        id: "londonChoice",
        component: "Choice",
        name: "London",
        share: 0.3,
        value: "5:22 AM",
        context: "Wed · 8 h ahead",
      },
      {
        id: "tokyo",
        component: "Button",
        variant: "borderless",
        child: "tokyoChoice",
        action: event("pick", { argument: "to_city", value: "tokyo" }),
      },
      {
        id: "tokyoChoice",
        component: "Choice",
        name: "Tokyo",
        share: 0.07,
        value: "1:22 PM",
        context: "Wed · 16 h ahead",
      },
      {
        id: "also",
        component: "Text",
        variant: "caption",
        text: "Also in the list",
      },
      {
        id: "pills",
        component: "Row",
        children: ["paris", "sydney", "berlin"],
      },
      {
        id: "paris",
        component: "Button",
        variant: "default",
        child: "parisLabel",
        action: event("pick", { argument: "to_city", value: "paris" }),
      },
      { id: "parisLabel", component: "Text", text: "Paris" },
      {
        id: "sydney",
        component: "Button",
        variant: "default",
        child: "sydneyLabel",
        action: event("pick", { argument: "to_city", value: "sydney" }),
      },
      { id: "sydneyLabel", component: "Text", text: "Sydney" },
      {
        id: "berlin",
        component: "Button",
        variant: "default",
        child: "berlinLabel",
        action: event("pick", { argument: "to_city", value: "berlin" }),
      },
      { id: "berlinLabel", component: "Text", text: "Berlin" },
      {
        id: "other",
        component: "Row",
        align: "end",
        children: ["typed", "use"],
      },
      {
        id: "typed",
        component: "TextField",
        label: "Another place",
        value: at("typed"),
      },
      {
        id: "use",
        component: "Button",
        child: "useLabel",
        variant: "primary",
        action: event("pick", { argument: "to_city", typed: at("typed") }),
      },
      { id: "useLabel", component: "Text", text: "Use this" },
    ],
    data: { typed: "" },
  },
];

function ops(fixture: Fixture): Array<Record<string, unknown>> {
  const surfaceId = `gallery-${fixture.id}`;
  return [
    {
      version: "v0.9",
      createSurface: { surfaceId, catalogId: JEV_CATALOG_ID },
    },
    {
      version: "v0.9",
      updateComponents: { surfaceId, components: fixture.components },
    },
    {
      version: "v0.9",
      updateDataModel: { surfaceId, path: "/", value: fixture.data },
    },
  ];
}

function Paint() {
  const { processMessages, clearSurfaces } = useA2UI();
  useEffect(() => {
    clearSurfaces();
    processMessages(FIXTURES.flatMap(ops));
  }, [processMessages, clearSurfaces]);
  return null;
}

export default function GalleryPage() {
  return (
    <FluentRoot>
      <main className="omnibar-page gallery-page">
        <header className="gallery-intro">
          <h1>One vocabulary, many answers</h1>
          <p>
            Every card is composed from the same approved Fluent parts. JEV
            chooses which part shows each field as the data arrives.
          </p>
        </header>
        <A2UIProvider catalog={jevCatalog}>
          <Paint />
          <div className="gallery-grid">
            {FIXTURES.map((fixture) => (
              <article
                key={fixture.id}
                className="omnibar-shell has-card gallery-item"
              >
                <div className="gallery-prompt">{fixture.prompt}</div>
                <section className="live-card a2ui-card">
                  <A2UIRenderer surfaceId={`gallery-${fixture.id}`} />
                </section>
              </article>
            ))}
          </div>
        </A2UIProvider>
      </main>
    </FluentRoot>
  );
}
