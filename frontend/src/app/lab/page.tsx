"use client";

import Link from "next/link";
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  ChefHat,
  Clock3,
  Dumbbell,
  Languages,
  Scale,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import "./lab.css";

type Family = "time" | "list" | "compute" | "record" | "plan";

type LaneCopy = {
  jev: string;
  luna: string;
  code: string;
};

const familyClass: Record<Family, string> = {
  time: "lab-family-time",
  list: "lab-family-list",
  compute: "lab-family-compute",
  record: "lab-family-record",
  plan: "lab-family-plan",
};

function PromptBar({ children }: { children: ReactNode }) {
  return (
    <div className="lab-prompt" aria-label="Example omnibar input">
      <span className="lab-prompt-caret" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

function HowItWorks({ lanes }: { lanes: LaneCopy }) {
  const renderLaneText = (text: string) => {
    const parts = text.split(/\b(choice|noul|score)\b/g);
    return parts.map((part, index) =>
      part === "choice" || part === "noul" || part === "score" ? (
        <code key={`${part}-${index}`}>{part}</code>
      ) : (
        <span key={`${part}-${index}`}>{part}</span>
      ),
    );
  };

  return (
    <footer className="lab-how" aria-label="How this card would work">
      <div className="lab-lane">
        <span>JEV decides</span>
        <strong>{renderLaneText(lanes.jev)}</strong>
      </div>
      <div className="lab-lane">
        <span>Luna fills</span>
        <strong>{renderLaneText(lanes.luna)}</strong>
      </div>
      <div className="lab-lane">
        <span>Code computes</span>
        <strong>{renderLaneText(lanes.code)}</strong>
      </div>
    </footer>
  );
}

function CardShell({
  icon,
  label,
  title,
  family,
  phrase,
  lanes,
  children,
}: {
  icon: ReactNode;
  label: string;
  title: string;
  family: Family;
  phrase: string;
  lanes: LaneCopy;
  children: ReactNode;
}) {
  return (
    <article className="lab-card">
      <PromptBar>{phrase}</PromptBar>
      <div className="lab-card-head">
        <span className={`lab-icon-tile ${familyClass[family]}`} aria-hidden="true">
          {icon}
        </span>
        <span className="lab-card-label">{label}</span>
      </div>
      <h2>{title}</h2>
      <div className="lab-card-body">{children}</div>
      <HowItWorks lanes={lanes} />
    </article>
  );
}

function TimeZoneCard() {
  return (
    <CardShell
      icon={<Clock3 size={17} strokeWidth={2.2} />}
      label="Time zone"
      title="Seattle afternoon, Bengaluru night"
      family="time"
      phrase="3pm in Seattle for Priya in Bengaluru"
      lanes={{
        jev: "choice · Seattle zone; choice · Bengaluru zone; none escape",
        luna: "person name, city mentions, meeting intent",
        code: "IANA conversion, day shift, work-hour overlap",
      }}
    >
      <div className="lab-time-panel">
        <div className="lab-clock-row">
          <div>
            <span className="lab-city">Seattle</span>
            <strong>3:00 PM</strong>
            <small>Mon · America/Los_Angeles</small>
          </div>
          <span className="lab-chip">source time</span>
        </div>
        <div className="lab-clock-row">
          <div>
            <span className="lab-city">Priya in Bengaluru</span>
            <strong>3:30 AM</strong>
            <small>Tue · Asia/Kolkata</small>
          </div>
          <span className="lab-chip lab-chip-blue">next day</span>
        </div>
        <div className="lab-overlap" aria-label="24 hour overlap strip">
          <div className="lab-overlap-head">
            <span>Working hours overlap</span>
            <strong>None at 3 PM Seattle</strong>
          </div>
          <div className="lab-strip" aria-hidden="true">
            <span className="lab-work lab-work-seattle" />
            <span className="lab-work lab-work-bengaluru" />
            <span className="lab-now-marker" />
          </div>
          <div className="lab-strip-labels">
            <span>12a</span>
            <span>6a</span>
            <span>12p</span>
            <span>6p</span>
            <span>12a</span>
          </div>
        </div>
      </div>
    </CardShell>
  );
}

const priceOptions = [
  { id: "small", label: "12 oz", price: 4.99, amount: 12 },
  { id: "large", label: "18 oz", price: 6.49, amount: 18 },
];

function ComparePricesCard() {
  const unitPrices = priceOptions.map((option) => ({
    ...option,
    unit: option.price / option.amount,
  }));
  const winner = unitPrices.reduce((best, option) => (option.unit < best.unit ? option : best));
  const loser = unitPrices.find((option) => option.id !== winner.id);
  const savings = loser ? Math.round((1 - winner.unit / loser.unit) * 100) : 0;

  return (
    <CardShell
      icon={<BadgeDollarSign size={17} strokeWidth={2.2} />}
      label="Compare prices"
      title="18 oz wins on unit price"
      family="compute"
      phrase="$4.99 for 12 oz vs $6.49 for 18 oz"
      lanes={{
        jev: "noul · is price comparison; score · confidence per candidate",
        luna: "item quantities, package labels, currency",
        code: "unit price, winner, percent savings",
      }}
    >
      <div className="lab-price-grid">
        {unitPrices.map((option) => (
          <div
            className={`lab-price-option ${option.id === winner.id ? "lab-price-winner" : ""}`}
            key={option.id}
          >
            <span>{option.label}</span>
            <strong>${option.price.toFixed(2)}</strong>
            <small>${option.unit.toFixed(2)} / oz</small>
            {option.id === winner.id ? <b>{savings}% less per oz</b> : null}
          </div>
        ))}
      </div>
    </CardShell>
  );
}

function TranslateCard() {
  const [formality, setFormality] = useState<"casual" | "polite">("polite");
  const translations = {
    polite: {
      text: "駅はどこですか？",
      romanization: "Eki wa doko desu ka?",
      note: "Polite, neutral, safe for asking a stranger.",
    },
    casual: {
      text: "駅どこ？",
      romanization: "Eki doko?",
      note: "Casual and short; use with friends.",
    },
  };
  const current = translations[formality];

  return (
    <CardShell
      icon={<Languages size={17} strokeWidth={2.2} />}
      label="Translate"
      title="Japanese phrase, with tone"
      family="time"
      phrase="how do I say 'where is the train station' in Japanese"
      lanes={{
        jev: "choice · target language; choice · formality; none escape",
        luna: "translated text, romanization, tone note",
        code: "toggle state, language display, copy-safe layout",
      }}
    >
      <div className="lab-translate-panel">
        <div className="lab-segmented" role="group" aria-label="Formality">
          {(["casual", "polite"] as const).map((tone) => (
            <button
              aria-pressed={formality === tone}
              className={formality === tone ? "lab-selected" : ""}
              key={tone}
              onClick={() => setFormality(tone)}
              type="button"
            >
              {tone}
            </button>
          ))}
        </div>
        <p className="lab-translation" lang="ja">
          {current.text}
        </p>
        <p className="lab-romanization">{current.romanization}</p>
        <p className="lab-note">{current.note}</p>
      </div>
    </CardShell>
  );
}

const recipeIngredients = [
  { id: "flour", name: "Flour", qty: 2, unit: "cups" },
  { id: "eggs", name: "Eggs", qty: 3, unit: "" },
  { id: "salt", name: "Salt", qty: 1, unit: "tsp" },
];

const scaleOptions = [0.5, 1, 2, 3] as const;

function formatQuantity(value: number) {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(1).replace(".5", "½").replace("0½", "½");
}

function RecipeScalerCard() {
  const [scale, setScale] = useState<(typeof scaleOptions)[number]>(2);

  return (
    <CardShell
      icon={<ChefHat size={17} strokeWidth={2.2} />}
      label="Recipe scaler"
      title="Quantities resize instantly"
      family="list"
      phrase="double this: 2 cups flour, 3 eggs, 1 tsp salt"
      lanes={{
        jev: "noul · asks to scale quantities; choice · multiplier",
        luna: "ingredient names, base quantities, units",
        code: "fraction math, plural labels, live rescale",
      }}
    >
      <div className="lab-recipe-panel">
        <div className="lab-segmented" role="group" aria-label="Recipe multiplier">
          {scaleOptions.map((option) => (
            <button
              aria-pressed={scale === option}
              className={scale === option ? "lab-selected" : ""}
              key={option}
              onClick={() => setScale(option)}
              type="button"
            >
              ×{option === 0.5 ? "½" : option}
            </button>
          ))}
        </div>
        <ul className="lab-ingredient-list">
          {recipeIngredients.map((item) => (
            <li key={item.id}>
              <span>{item.name}</span>
              <strong>
                {formatQuantity(item.qty * scale)} {item.unit}
              </strong>
            </li>
          ))}
        </ul>
      </div>
    </CardShell>
  );
}

const decisionOptions = [
  {
    id: "seattle",
    name: "Seattle job",
    scores: { pay: 4, commute: 2, family: 2 },
    pros: "Higher pay, stronger role",
    cons: "Longer commute, farther from family",
  },
  {
    id: "austin",
    name: "Stay in Austin",
    scores: { pay: 2, commute: 4, family: 4 },
    pros: "Close to family, simpler life",
    cons: "Less upside",
  },
] as const;

const criteria = [
  { id: "pay", label: "Pay" },
  { id: "commute", label: "Commute" },
  { id: "family", label: "Family" },
] as const;

type Criterion = (typeof criteria)[number]["id"];

function scoreWidth(score: number) {
  return `${Math.max(12, score * 25)}%`;
}

function DecideCard() {
  const [weights, setWeights] = useState<Record<Criterion, number>>({
    pay: 4,
    commute: 3,
    family: 5,
  });
  const totals = useMemo(
    () =>
      decisionOptions.map((option) => {
        const total = criteria.reduce((sum, criterion) => {
          return sum + option.scores[criterion.id] * weights[criterion.id];
        }, 0);
        const max = criteria.reduce((sum, criterion) => sum + 4 * weights[criterion.id], 0);
        return { ...option, total: Math.round((total / max) * 100) };
      }),
    [weights],
  );
  const winner = totals.reduce((best, option) => (option.total > best.total ? option : best));

  return (
    <CardShell
      icon={<Scale size={17} strokeWidth={2.2} />}
      label="Decide"
      title={`${winner.name} leads with current weights`}
      family="plan"
      phrase="should I take the Seattle job or stay in Austin? pay, commute, family"
      lanes={{
        jev: "score · pay; score · commute; score · family; choice · none",
        luna: "option labels, criteria, pros and cons",
        code: "weighted totals, sliders, ranked recommendation",
      }}
    >
      <div className="lab-decision-panel">
        <div className="lab-matrix" role="table" aria-label="Decision score matrix">
          <div className="lab-matrix-row lab-matrix-head" role="row">
            <span role="columnheader">Option</span>
            {criteria.map((criterion) => (
              <span key={criterion.id} role="columnheader">
                {criterion.label}
              </span>
            ))}
            <span role="columnheader">Total</span>
          </div>
          {totals.map((option) => (
            <div className="lab-matrix-row" key={option.id} role="row">
              <span role="cell">
                <strong>{option.name}</strong>
                <small>{option.pros}</small>
              </span>
              {criteria.map((criterion) => (
                <span className="lab-score-cell" key={criterion.id} role="cell">
                  <i aria-label={`${criterion.label} score ${option.scores[criterion.id]} of 4`}>
                    <b style={{ width: scoreWidth(option.scores[criterion.id]) }} />
                  </i>
                </span>
              ))}
              <span className="lab-total-cell" role="cell">
                {option.total}
              </span>
            </div>
          ))}
        </div>
        <div className="lab-weight-grid">
          {criteria.map((criterion) => (
            <label className="lab-weight" key={criterion.id}>
              <span>
                {criterion.label} weight <strong>{weights[criterion.id]}</strong>
              </span>
              <input
                aria-label={`${criterion.label} weight`}
                max="5"
                min="1"
                onChange={(event) =>
                  setWeights((current) => ({
                    ...current,
                    [criterion.id]: Number(event.target.value),
                  }))
                }
                type="range"
                value={weights[criterion.id]}
              />
            </label>
          ))}
        </div>
      </div>
    </CardShell>
  );
}

const workoutSets = [
  { id: "squat-1", exercise: "Squat", reps: 10, weight: 135 },
  { id: "squat-2", exercise: "Squat", reps: 10, weight: 135 },
  { id: "squat-3", exercise: "Squat", reps: 10, weight: 135 },
  { id: "bench-1", exercise: "Bench press", reps: 5, weight: 185 },
  { id: "bench-2", exercise: "Bench press", reps: 5, weight: 185 },
  { id: "bench-3", exercise: "Bench press", reps: 5, weight: 185 },
  { id: "bench-4", exercise: "Bench press", reps: 5, weight: 185 },
  { id: "bench-5", exercise: "Bench press", reps: 5, weight: 185 },
];

function WorkoutLogCard() {
  const [checkedSetIds, setCheckedSetIds] = useState(() => new Set(["squat-1", "bench-1"]));
  const totalVolume = workoutSets.reduce((sum, set) => sum + set.reps * set.weight, 0);
  const completedVolume = workoutSets.reduce(
    (sum, set) => (checkedSetIds.has(set.id) ? sum + set.reps * set.weight : sum),
    0,
  );

  return (
    <CardShell
      icon={<Dumbbell size={17} strokeWidth={2.2} />}
      label="Workout log"
      title="Sets become tracked volume"
      family="record"
      phrase="3x10 squats at 135, bench 5x5 185"
      lanes={{
        jev: "choice · exercise catalog; noul · workout log intent",
        luna: "set groups, rep schemes, weights",
        code: "set rows, completion state, total volume",
      }}
    >
      <div className="lab-workout-panel">
        <div className="lab-volume-summary">
          <span>
            Planned <strong>{totalVolume.toLocaleString()} lb</strong>
          </span>
          <span>
            Checked <strong>{completedVolume.toLocaleString()} lb</strong>
          </span>
        </div>
        <div className="lab-set-table" role="table" aria-label="Workout sets">
          <div className="lab-set-row lab-set-head" role="row">
            <span role="columnheader">Done</span>
            <span role="columnheader">Exercise</span>
            <span role="columnheader">Reps</span>
            <span role="columnheader">Weight</span>
            <span role="columnheader">Volume</span>
          </div>
          {workoutSets.map((set) => (
            <label className="lab-set-row" key={set.id} role="row">
              <span role="cell">
                <input
                  checked={checkedSetIds.has(set.id)}
                  onChange={(event) => {
                    setCheckedSetIds((current) => {
                      const next = new Set(current);
                      if (event.target.checked) {
                        next.add(set.id);
                      } else {
                        next.delete(set.id);
                      }
                      return next;
                    });
                  }}
                  type="checkbox"
                />
              </span>
              <span role="cell">{set.exercise}</span>
              <span role="cell">{set.reps}</span>
              <span role="cell">{set.weight}</span>
              <span role="cell">{(set.reps * set.weight).toLocaleString()}</span>
            </label>
          ))}
        </div>
      </div>
    </CardShell>
  );
}

export default function CardLabPage() {
  return (
    <main className="lab-page">
      <div className="lab-shell">
        <header className="lab-hero">
          <Link className="lab-back-link" href="/">
            Back to omnibar
          </Link>
          <div>
            <h1>Card lab</h1>
            <p>Six cards we could add next. Mock data; not wired to JEV yet.</p>
          </div>
        </header>
        <section className="lab-grid" aria-label="New card concepts">
          <TimeZoneCard />
          <ComparePricesCard />
          <TranslateCard />
          <RecipeScalerCard />
          <DecideCard />
          <WorkoutLogCard />
        </section>
        <aside className="lab-note-card" aria-label="Prototype note">
          <BriefcaseBusiness size={18} strokeWidth={2.1} aria-hidden="true" />
          <p>
            Each concept keeps the model boundary visible: JEV routes, Luna fills structured
            fields, and local code owns deterministic work.
          </p>
        </aside>
      </div>
    </main>
  );
}
