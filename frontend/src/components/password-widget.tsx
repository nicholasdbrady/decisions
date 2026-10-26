"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, RotateCcw } from "lucide-react";

import type { CardDraft } from "@/lib/draft-view";

const SETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*_+-=?~;:.{}<>[]()/\\'`|",
} as const;

type SetId = keyof typeof SETS;
const SET_ORDER: SetId[] = ["uppercase", "lowercase", "numbers", "symbols"];
const SET_LABELS: Record<SetId, string> = { uppercase: "A–Z", lowercase: "a–z", numbers: "0–9", symbols: "!@#$" };

const SIMILAR = new Set("oO0iIlL1|");
const AMBIGUOUS = new Set("~;:.{}<>[]()/\\'`");

function draw(alphabet: string): string {
  const max = alphabet.length;
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const limit = Math.floor(0xffffffff / max) * max;
    const buffer = new Uint32Array(1);
    let value = limit;
    while (value >= limit) {
      crypto.getRandomValues(buffer);
      value = buffer[0];
    }
    return alphabet[value % max];
  }
  return alphabet[Math.floor(Math.random() * max)];
}

/** Entropy in bits — the only honest way to say how strong a password is. */
function strength(length: number, pool: number) {
  const bits = pool > 1 ? Math.round(length * Math.log2(pool)) : 0;
  if (bits >= 128) return { bits, label: "Excellent", step: 4 };
  if (bits >= 90) return { bits, label: "Strong", step: 3 };
  if (bits >= 60) return { bits, label: "Fair", step: 2 };
  return { bits, label: "Weak", step: 1 };
}

export function PasswordWidget({ draft }: { draft: CardDraft }) {
  const [length, setLength] = useState(() => Number(draft.data.length ?? 16));
  const [sets, setSets] = useState<Record<SetId, boolean>>(() => ({
    uppercase: draft.data.uppercase !== false,
    lowercase: draft.data.lowercase !== false,
    numbers: draft.data.numbers !== false,
    symbols: draft.data.symbols !== false,
  }));
  const [excludeSimilar, setExcludeSimilar] = useState(() => draft.data.excludeSimilar === true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(() => draft.data.excludeAmbiguous === true);
  const [spin, setSpin] = useState(0);
  const [copied, setCopied] = useState(false);

  // Luna resolves the asked-for length after first paint; adopt it once.
  const asked = Number(draft.data.length ?? 16);
  const [seenAsked, setSeenAsked] = useState(asked);
  if (seenAsked !== asked) {
    setSeenAsked(asked);
    setLength(asked);
  }

  const alphabet = useMemo(() => {
    let pool = SET_ORDER.filter((id) => sets[id]).map((id) => SETS[id]).join("");
    if (excludeSimilar) pool = [...pool].filter((char) => !SIMILAR.has(char)).join("");
    if (excludeAmbiguous) pool = [...pool].filter((char) => !AMBIGUOUS.has(char)).join("");
    return pool;
  }, [excludeAmbiguous, excludeSimilar, sets]);

  const password = useMemo(() => {
    void spin;
    if (!alphabet.length) return "";
    return Array.from({ length }, () => draw(alphabet)).join("");
  }, [alphabet, length, spin]);

  const copy = useCallback(() => {
    if (!password) return;
    void navigator.clipboard?.writeText(password);
    setCopied(true);
  }, [password]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const toggle = (id: SetId) => setSets((current) => {
    const next = { ...current, [id]: !current[id] };
    // A password needs somewhere to draw from; the last set stays on.
    return SET_ORDER.some((key) => next[key]) ? next : current;
  });

  const score = strength(length, alphabet.length);

  return (
    <div className="password-widget">
      <div className="password-readout">
        <output className="password-value" key={password}>
          {password ? [...password].map((char, index) => (
            <span key={index} className={/\d/.test(char) ? "num" : /[a-z]/i.test(char) ? "" : "sym"}>{char}</span>
          )) : "—"}
        </output>
        <div className="password-tools">
          <button className="copy-button" type="button" onClick={copy} aria-label="Copy password">
            {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          </button>
          <button className="copy-button" type="button" onClick={() => setSpin((value) => value + 1)} aria-label="Generate a new password">
            <RotateCcw size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className={`password-meter step-${score.step}`}>
        <span /><span /><span /><span />
        <small>{score.label} · {score.bits} bits</small>
      </div>

      <label className="password-length">
        <span>Length</span>
        <input type="range" min={4} max={64} value={length} onChange={(event) => setLength(Number(event.target.value))} />
        <b>{length}</b>
      </label>

      <div className="password-sets">
        {SET_ORDER.map((id) => (
          <label key={id} className={sets[id] ? "on" : ""}>
            <input type="checkbox" checked={sets[id]} onChange={() => toggle(id)} />
            <code>{SET_LABELS[id]}</code>
            {id}
          </label>
        ))}
      </div>

      <div className="password-excludes">
        <label>
          <input type="checkbox" checked={excludeSimilar} onChange={() => setExcludeSimilar((value) => !value)} />
          Exclude similar <code>o 0 i l 1</code>
        </label>
        <label>
          <input type="checkbox" checked={excludeAmbiguous} onChange={() => setExcludeAmbiguous((value) => !value)} />
          Exclude ambiguous <code>{"~;:.{}<>[]()/\\'`"}</code>
        </label>
      </div>
    </div>
  );
}
