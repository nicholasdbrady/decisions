export type ColorFormat = "name" | "hex" | "rgb" | "hsl" | "gradient" | "described";

export type Rgb = { r: number; g: number; b: number };

export type ParsedColor = { hex: string; format: ColorFormat; stops: string[] };

// CSS named colors; hex values are resolved by the browser, not hard-coded.
const CSS_NAMES = "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkturquoise darkviolet deeppink deepskyblue dimgray dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightpink lightsalmon lightseagreen lightskyblue lightslategray lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen".split(" ");

let context: CanvasRenderingContext2D | null | undefined;
let namedHexes: { name: string; hex: string }[] | null = null;

function canvas(): CanvasRenderingContext2D | null {
  if (context !== undefined) return context;
  context = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  return context;
}

function cssToHex(value: string): string | null {
  const ctx = canvas();
  if (!ctx || typeof CSS === "undefined" || !CSS.supports("color", value)) return null;
  ctx.fillStyle = "#000000";
  ctx.fillStyle = value;
  const out = String(ctx.fillStyle);
  if (out.startsWith("#")) return out.toUpperCase();
  const rgb = out.match(/\d+(\.\d+)?/g)?.map(Number);
  return rgb && rgb.length >= 3 ? rgbToHex({ r: rgb[0], g: rgb[1], b: rgb[2] }) : null;
}

function asSingle(value: string): { hex: string; format: ColorFormat } | null {
  const v = value.trim().replace(/;$/, "");
  if (!v) return null;
  const lower = v.toLowerCase();
  const attempts: [string, ColorFormat][] = [
    [v, lower.startsWith("#") ? "hex" : lower.startsWith("rgb") ? "rgb" : lower.startsWith("hsl") ? "hsl" : "name"],
    [v.replace(/\s+/g, ""), "name"],
    [`#${v}`, "hex"],
    [`rgb(${v})`, "rgb"],
    [`hsl(${v})`, "hsl"],
  ];
  for (const [candidate, format] of attempts) {
    const hex = cssToHex(candidate);
    if (hex) return { hex, format };
  }
  return null;
}

/** Parse the typed text as a CSS color, a list of colors (gradient), or fall back to model values. */
export function parseColorInput(text: string, lunaHex?: string | null, lunaStops: string[] = []): ParsedColor | null {
  const single = asSingle(text);
  if (single) return { ...single, stops: [] };
  const parts = text.split(/\s+(?:to|and|into|→|->)\s+|\s*,\s*(?![^()]*\))/i).map((part) => part.replace(/\bgradient\b/i, "").trim()).filter(Boolean);
  const stops = parts.length >= 2 ? parts.map((part) => asSingle(part)?.hex ?? null) : [];
  if (stops.length >= 2 && stops.every(Boolean)) return { hex: stops[0]!, format: "gradient", stops: stops as string[] };
  const modelStops = lunaStops.map((stop) => asSingle(stop)?.hex).filter((hex): hex is string => Boolean(hex));
  if (modelStops.length >= 2) return { hex: modelStops[0], format: "gradient", stops: modelStops };
  const modelHex = lunaHex ? asSingle(lunaHex)?.hex : null;
  return modelHex ? { hex: modelHex, format: "described", stops: [] } : null;
}

export function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1, 7), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(hex);
  const [rr, gg, bb] = [r / 255, g / 255, b / 255];
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  const d = max - min;
  if (!d) return { h: 0, s: 0, l: Math.round(l * 100) };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === rr ? ((gg - bb) / d) % 6 : max === gg ? (bb - rr) / d + 2 : (rr - gg) / d + 4;
  return { h: Math.round((h * 60 + 360) % 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToHex(h: number, s: number, l: number): string {
  const ss = s / 100;
  const ll = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = ss * Math.min(ll, 1 - ll);
  const f = (n: number) => ll - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex({ r: f(0) * 255, g: f(8) * 255, b: f(4) * 255 });
}

export function formatRgb(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${r}, ${g}, ${b})`;
}

export function formatHsl(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  return `hsl(${h}, ${s}%, ${l}%)`;
}

/** Exact or nearest CSS color keyword. */
export function nearestName(hex: string): { name: string; exact: boolean } {
  if (!namedHexes) namedHexes = CSS_NAMES.map((name) => ({ name, hex: cssToHex(name) ?? "#000000" }));
  const target = hexToRgb(hex);
  let best = namedHexes[0];
  let bestDistance = Infinity;
  for (const entry of namedHexes) {
    const c = hexToRgb(entry.hex);
    const mean = (target.r + c.r) / 2;
    const distance = (2 + mean / 256) * (target.r - c.r) ** 2 + 4 * (target.g - c.g) ** 2 + (2 + (255 - mean) / 256) * (target.b - c.b) ** 2;
    if (distance < bestDistance) {
      best = entry;
      bestDistance = distance;
    }
  }
  return { name: best.name, exact: bestDistance === 0 };
}

/** Tints to shades of one hue, light to dark, including the base. */
export function shadeScale(hex: string, count = 7): string[] {
  const { h, s, l } = hexToHsl(hex);
  const lights = Array.from({ length: count }, (_, i) => 92 - (i * 80) / (count - 1));
  const closest = lights.reduce((best, value, i) => (Math.abs(value - l) < Math.abs(lights[best] - l) ? i : best), 0);
  return lights.map((value, i) => (i === closest ? hex : hslToHex(h, s, value)));
}

/** Evenly spaced hues around the wheel, starting at the base color. */
export function harmony(hex: string, steps: number): string[] {
  const { h, s, l } = hexToHsl(hex);
  return Array.from({ length: steps }, (_, i) => (i === 0 ? hex : hslToHex((h + (360 / steps) * i) % 360, s, l)));
}

export function readableInk(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.6 ? "#171717" : "#ffffff";
}

export function gradientCss(stops: string[]): string {
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}
