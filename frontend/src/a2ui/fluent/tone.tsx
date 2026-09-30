"use client";

import {
  createContext,
  useContext,
  type ComponentType,
  type CSSProperties,
} from "react";
import { tokens } from "@fluentui/react-components";
import {
  Airplane20Regular,
  Airplane24Regular,
  Airplane48Regular,
  ArrowTrending20Regular,
  ArrowTrending24Regular,
  ArrowTrendingDown20Regular,
  ArrowTrendingDown24Regular,
  ArrowUndo20Regular,
  ArrowUndo24Regular,
  Bookmark20Regular,
  Bookmark24Regular,
  Briefcase20Regular,
  Briefcase24Regular,
  Briefcase48Regular,
  Calculator20Regular,
  Calculator24Regular,
  CalendarLtr20Regular,
  CalendarLtr24Regular,
  CalendarLtr48Regular,
  Checkmark20Regular,
  Checkmark24Regular,
  CheckmarkCircle20Regular,
  CheckmarkCircle24Regular,
  CheckmarkCircle48Regular,
  Circle20Regular,
  Circle24Regular,
  Circle48Regular,
  Clock20Regular,
  Clock24Regular,
  Clock48Regular,
  DataBarVertical20Regular,
  DataBarVertical24Regular,
  Drop20Regular,
  Drop24Regular,
  Drop48Regular,
  Food20Regular,
  Food24Regular,
  Food48Regular,
  Gauge20Regular,
  Gauge24Regular,
  Globe20Regular,
  Globe24Regular,
  Globe48Regular,
  Info20Regular,
  Info24Regular,
  Info48Regular,
  Location20Regular,
  Location24Regular,
  Location48Regular,
  Money20Regular,
  Money24Regular,
  People20Regular,
  People24Regular,
  People48Regular,
  Receipt20Regular,
  Receipt24Regular,
  Receipt48Regular,
  Sparkle20Regular,
  Sparkle24Regular,
  Sparkle48Regular,
  Star20Regular,
  Star24Regular,
  Star48Regular,
  TaskListLtr20Regular,
  TaskListLtr24Regular,
  Temperature20Regular,
  Temperature24Regular,
  Temperature48Regular,
  TextBulletListLtr20Regular,
  TextBulletListLtr24Regular,
  Timer20Regular,
  Timer24Regular,
  Timer48Regular,
  Trophy20Regular,
  Trophy24Regular,
  Trophy48Regular,
  Umbrella20Regular,
  Umbrella24Regular,
  Warning20Regular,
  Warning24Regular,
  Warning48Regular,
  WeatherCloudy20Regular,
  WeatherCloudy24Regular,
  WeatherCloudy48Regular,
  WeatherDrizzle20Regular,
  WeatherDrizzle24Regular,
  WeatherDrizzle48Regular,
  WeatherFog20Regular,
  WeatherFog24Regular,
  WeatherFog48Regular,
  WeatherMoon20Regular,
  WeatherMoon24Regular,
  WeatherMoon48Regular,
  WeatherPartlyCloudyDay20Regular,
  WeatherPartlyCloudyDay24Regular,
  WeatherPartlyCloudyDay48Regular,
  WeatherRain20Regular,
  WeatherRain24Regular,
  WeatherRain48Regular,
  WeatherSnow20Regular,
  WeatherSnow24Regular,
  WeatherSnow48Regular,
  WeatherSqualls20Regular,
  WeatherSqualls24Regular,
  WeatherSqualls48Regular,
  WeatherSunny20Regular,
  WeatherSunny24Regular,
  WeatherSunny48Regular,
  WeatherSunnyHigh20Regular,
  WeatherSunnyHigh24Regular,
  WeatherSunnyHigh48Regular,
  WeatherThunderstorm20Regular,
  WeatherThunderstorm24Regular,
  WeatherThunderstorm48Regular,
} from "@fluentui/react-icons";

/**
 * Shared vocabulary for the Fluent 2 catalog: the 15 tones, the named icons,
 * and the parsers every renderer uses. Tones and icons are closed sets so a
 * model can only name things we can draw; unknown names fall back to neutral
 * and to no icon (or the tone's own icon where the spec asks for one).
 */

export type Icon = ComponentType<{
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean;
}>;

/** One drawing at the three sizes Fluent designs: 20 (also drawn at 16), 24, and 48. */
type Sized = { s20: Icon; s24: Icon; s48?: Icon };

const sized = (s20: Icon, s24: Icon, s48?: Icon): Sized => ({ s20, s24, s48 });

export const ICONS: Record<string, Sized> = {
  alert: sized(Warning20Regular, Warning24Regular, Warning48Regular),
  briefcase: sized(Briefcase20Regular, Briefcase24Regular, Briefcase48Regular),
  calculator: sized(Calculator20Regular, Calculator24Regular),
  calendar: sized(
    CalendarLtr20Regular,
    CalendarLtr24Regular,
    CalendarLtr48Regular,
  ),
  chart: sized(DataBarVertical20Regular, DataBarVertical24Regular),
  check: sized(
    CheckmarkCircle20Regular,
    CheckmarkCircle24Regular,
    CheckmarkCircle48Regular,
  ),
  checkmark: sized(Checkmark20Regular, Checkmark24Regular),
  circle: sized(Circle20Regular, Circle24Regular, Circle48Regular),
  clock: sized(Clock20Regular, Clock24Regular, Clock48Regular),
  cloud: sized(
    WeatherCloudy20Regular,
    WeatherCloudy24Regular,
    WeatherCloudy48Regular,
  ),
  "cloud-sun": sized(
    WeatherPartlyCloudyDay20Regular,
    WeatherPartlyCloudyDay24Regular,
    WeatherPartlyCloudyDay48Regular,
  ),
  dollar: sized(Money20Regular, Money24Regular),
  drizzle: sized(
    WeatherDrizzle20Regular,
    WeatherDrizzle24Regular,
    WeatherDrizzle48Regular,
  ),
  drop: sized(Drop20Regular, Drop24Regular, Drop48Regular),
  droplets: sized(Drop20Regular, Drop24Regular, Drop48Regular),
  fog: sized(WeatherFog20Regular, WeatherFog24Regular, WeatherFog48Regular),
  food: sized(Food20Regular, Food24Regular, Food48Regular),
  gauge: sized(Gauge20Regular, Gauge24Regular),
  globe: sized(Globe20Regular, Globe24Regular, Globe48Regular),
  info: sized(Info20Regular, Info24Regular, Info48Regular),
  list: sized(TextBulletListLtr20Regular, TextBulletListLtr24Regular),
  moon: sized(WeatherMoon20Regular, WeatherMoon24Regular, WeatherMoon48Regular),
  people: sized(People20Regular, People24Regular, People48Regular),
  pin: sized(Location20Regular, Location24Regular, Location48Regular),
  plan: sized(TaskListLtr20Regular, TaskListLtr24Regular),
  plane: sized(Airplane20Regular, Airplane24Regular, Airplane48Regular),
  rain: sized(WeatherRain20Regular, WeatherRain24Regular, WeatherRain48Regular),
  receipt: sized(Receipt20Regular, Receipt24Regular, Receipt48Regular),
  record: sized(Bookmark20Regular, Bookmark24Regular),
  snow: sized(WeatherSnow20Regular, WeatherSnow24Regular, WeatherSnow48Regular),
  sparkles: sized(Sparkle20Regular, Sparkle24Regular, Sparkle48Regular),
  star: sized(Star20Regular, Star24Regular, Star48Regular),
  storm: sized(
    WeatherThunderstorm20Regular,
    WeatherThunderstorm24Regular,
    WeatherThunderstorm48Regular,
  ),
  sun: sized(
    WeatherSunny20Regular,
    WeatherSunny24Regular,
    WeatherSunny48Regular,
  ),
  sunrise: sized(
    WeatherSunnyHigh20Regular,
    WeatherSunnyHigh24Regular,
    WeatherSunnyHigh48Regular,
  ),
  sunset: sized(
    WeatherMoon20Regular,
    WeatherMoon24Regular,
    WeatherMoon48Regular,
  ),
  thermometer: sized(
    Temperature20Regular,
    Temperature24Regular,
    Temperature48Regular,
  ),
  timer: sized(Timer20Regular, Timer24Regular, Timer48Regular),
  "trending-down": sized(
    ArrowTrendingDown20Regular,
    ArrowTrendingDown24Regular,
  ),
  "trending-up": sized(ArrowTrending20Regular, ArrowTrending24Regular),
  trophy: sized(Trophy20Regular, Trophy24Regular, Trophy48Regular),
  umbrella: sized(Umbrella20Regular, Umbrella24Regular),
  undo: sized(ArrowUndo20Regular, ArrowUndo24Regular),
  users: sized(People20Regular, People24Regular, People48Regular),
  wind: sized(
    WeatherSqualls20Regular,
    WeatherSqualls24Regular,
    WeatherSqualls48Regular,
  ),
};

/** The Fluent design closest to `size`, drawn at exactly `size` pixels. */
export function Glyph({
  name,
  size = 16,
  color,
  className,
}: {
  name: unknown;
  size?: number;
  color?: string;
  className?: string;
}) {
  const set = ICONS[str(name).toLowerCase()];
  if (!set) return null;
  const Drawn =
    size > 32 ? (set.s48 ?? set.s24) : size > 20 ? set.s24 : set.s20;
  return (
    <Drawn
      aria-hidden
      className={className}
      style={{ width: size, height: size, flexShrink: 0, color }}
    />
  );
}

export const hasIcon = (name: unknown) => str(name).toLowerCase() in ICONS;

export const TONE_NAMES = [
  "neutral",
  "clear",
  "clouds",
  "rain",
  "storm",
  "snow",
  "fog",
  "up",
  "down",
  "warn",
  "time",
  "compute",
  "list",
  "record",
  "plan",
] as const;

export type Tone = (typeof TONE_NAMES)[number];

const palette = (name: string) => ({
  tint: (tokens as Record<string, string>)[`colorPalette${name}Background2`],
  ink: (tokens as Record<string, string>)[`colorPalette${name}Foreground2`],
});

/** Each tone is a Fluent palette pair (Background2 tint, Foreground2 ink) with one icon. */
export const TONES: Record<Tone, { tint: string; ink: string; icon: string }> =
  {
    neutral: {
      tint: tokens.colorNeutralBackground3,
      ink: tokens.colorNeutralForeground2,
      icon: "circle",
    },
    clear: { ...palette("Marigold"), icon: "sun" },
    clouds: { ...palette("Steel"), icon: "cloud" },
    rain: { ...palette("Blue"), icon: "rain" },
    storm: { ...palette("Grape"), icon: "storm" },
    snow: { ...palette("LightTeal"), icon: "snow" },
    fog: { ...palette("Mink"), icon: "fog" },
    up: { ...palette("Green"), icon: "trending-up" },
    down: { ...palette("Red"), icon: "trending-down" },
    warn: { ...palette("DarkOrange"), icon: "alert" },
    time: { ...palette("Lavender"), icon: "clock" },
    compute: { ...palette("Teal"), icon: "calculator" },
    list: { ...palette("Cornflower"), icon: "list" },
    record: { ...palette("Brown"), icon: "record" },
    plan: { ...palette("Purple"), icon: "plan" },
  };

export function toneOf(value: unknown): Tone | null {
  const name = str(value).toLowerCase();
  return (TONE_NAMES as readonly string[]).includes(name)
    ? (name as Tone)
    : null;
}

/** The Hero wash: a light mix of the tone ink over the card background. */
export const wash = (tone: Tone, pct = 9) =>
  `color-mix(in srgb, ${TONES[tone].ink} ${pct}%, ${tokens.colorNeutralBackground1})`;

/** A Panel hands its tone to everything inside it, so children need not repeat it. */
export const ToneContext = createContext<Tone | null>(null);

/** A component's own tone wins, then the enclosing Panel's, then neutral. */
export function useTone(own?: unknown): Tone {
  const inherited = useContext(ToneContext);
  return toneOf(own) ?? inherited ?? "neutral";
}

/** True inside a Panel band, where surfaces sit on the wash rather than on white. */
export function useOnWash(): boolean {
  return useContext(ToneContext) !== null;
}

/** The renderer resolves bindings before calling us; the prop type stays the union. */
export function str(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

export function num(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value !== ""
        ? Number(value)
        : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

/** Records travel as JSON strings, so a partial paint can hold invalid JSON. */
export function records<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  try {
    const parsed = JSON.parse(str(value)) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/** One JSON object, or null when it has not arrived or does not parse. */
export function record<T extends object>(value: unknown): T | null {
  if (value && typeof value === "object" && !Array.isArray(value))
    return value as T;
  try {
    const parsed = JSON.parse(str(value)) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as T)
      : null;
  } catch {
    return null;
  }
}

/** Card sections that paint edge to edge carry this class; `catalog.css` bleeds them. */
export const BLEED = "jev-bleed";
