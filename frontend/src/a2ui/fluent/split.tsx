"use client";

import {
  Button,
  Field,
  Input,
  makeStyles,
  mergeClasses,
  tokens,
} from "@fluentui/react-components";
import {
  Add20Regular,
  CheckmarkCircle20Regular,
  Clock20Regular,
  Subtract20Regular,
} from "@fluentui/react-icons";
import { FormEvent, useMemo, useState } from "react";

import { CodeEvidence, useCodeEvidenceKey } from "./code-evidence";
import { HeroView } from "./hero";
import { str } from "./tone";

type SplitAction = {
  event: {
    name: "split";
    context: {
      total: string;
      people: string;
      tip_percent: string;
      currency_symbol: string;
    };
  };
};

const useStyles = makeStyles({
  root: {
    display: "grid",
    minWidth: 0,
  },
  controls: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.25fr) minmax(150px, 0.85fr) minmax(0, 1fr)",
    gap: "16px",
    paddingTop: "18px",
    "@media (max-width: 640px)": {
      gridTemplateColumns: "1fr",
      gap: "12px",
    },
  },
  verification: {
    minHeight: "36px",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    gap: "10px 12px",
    paddingTop: "14px",
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
  },
  verificationMain: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
  verificationComplete: {
    color: tokens.colorPaletteGreenForeground1,
  },
  verificationTail: {
    gridColumn: "2",
    gridRow: "1",
    color: tokens.colorNeutralForeground3,
    fontWeight: tokens.fontWeightRegular,
  },
  input: {
    width: "100%",
    "& input": {
      fontVariantNumeric: "tabular-nums",
    },
  },
  people: {
    display: "grid",
    gridTemplateColumns: "36px minmax(0, 1fr) 36px",
    alignItems: "center",
    gap: "6px",
  },
  peopleInput: {
    minWidth: 0,
    width: "100%",
    "& input": {
      textAlign: "center",
      fontVariantNumeric: "tabular-nums",
    },
  },
  step: {
    minWidth: "36px",
    width: "36px",
    height: "32px",
    color: tokens.colorNeutralForeground2,
  },
});

function number(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function count(value: string): number | null {
  const parsed = number(value);
  if (parsed === null || parsed < 1) return null;
  return Math.max(1, Math.round(parsed));
}

function money(symbol: string, value: number) {
  return `${symbol}${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function percent(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function SplitView({
  total,
  people,
  tip,
  symbol,
  streaming,
  verification,
  confidence,
  dispatch,
}: {
  total?: unknown;
  people?: unknown;
  tip?: unknown;
  symbol?: unknown;
  streaming?: unknown;
  verification?: unknown;
  confidence?: unknown;
  dispatch?: (action: SplitAction) => void;
}) {
  const styles = useStyles();
  const codeEvidenceKey = useCodeEvidenceKey();
  const currency = str(symbol) || "$";
  const [bill, setBill] = useState(str(total));
  const [headcount, setHeadcount] = useState(str(people));
  const [tipPercent, setTipPercent] = useState(str(tip) || "0");
  const loading = streaming === true || str(streaming) === "true";
  const verificationState = str(verification);
  const confidenceValue = number(str(confidence));
  const confidenceLabel =
    confidenceValue === null ? "" : `${Math.round(confidenceValue * 100)}%`;
  const verificationComplete =
    verificationState === "verified" || verificationState === "corrected";
  const verificationLabel =
    verificationState === "verified"
      ? "Verified result · 100% confidence"
      : verificationState === "corrected"
        ? "Verified result updated · 100% confidence"
        : verificationState === "confident"
          ? `Fast result · ${confidenceLabel || "confidence assessed"}`
          : verificationState === "unverified"
            ? `Fast result${confidenceLabel ? ` · ${confidenceLabel}` : ""}`
            : verificationState === "assessing"
              ? "Fast result ready · assessing confidence"
              : "Preparing fast result";
  const verificationTail =
    verificationState === "confident" || verificationState === "assessing"
      ? "Verification running"
      : verificationState === "unverified"
        ? "Code verification unavailable"
        : "";

  const result = useMemo(() => {
    const billValue = number(bill);
    const peopleValue = count(headcount);
    const tipValue = number(tipPercent) ?? 0;
    if (billValue === null || peopleValue === null) return null;
    const tipAmount = billValue * tipValue / 100;
    const grandTotal = billValue + tipAmount;
    return {
      bill: billValue,
      people: peopleValue,
      tipPercent: tipValue,
      tipAmount,
      grandTotal,
      each: grandTotal / peopleValue,
    };
  }, [bill, headcount, tipPercent]);

  const recompute = (next?: {
    total?: string;
    people?: string;
    tip?: string;
  }) => {
    dispatch?.({
      event: {
        name: "split",
        context: {
          total: next?.total ?? bill,
          people: next?.people ?? headcount,
          tip_percent: next?.tip ?? tipPercent,
          currency_symbol: currency,
        },
      },
    });
  };

  const changePeople = (delta: number) => {
    const next = String(Math.max(1, (count(headcount) ?? 1) + delta));
    setHeadcount(next);
    recompute({ people: next });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    recompute();
  };

  const context = result
    ? JSON.stringify({
        kind: "parts",
        parts: [
          { label: "Bill", value: result.bill },
          { label: "Tip", value: result.tipAmount },
        ],
      })
    : "";
  const stats = result
    ? JSON.stringify([
        { label: "Bill", value: money(currency, result.bill) },
        {
          label: "Tip",
          value: money(currency, result.tipAmount),
          note: `${percent(result.tipPercent)}% tip`,
        },
        { label: "Total", value: money(currency, result.grandTotal) },
        { label: "People", value: String(result.people) },
      ])
    : "[]";

  return (
    <section
      className={mergeClasses("jev-split", styles.root)}
      aria-label="Split a bill"
    >
      <HeroView
        title="Each person pays"
        value={loading ? "" : result ? money(currency, result.each) : "—"}
        caption={
          loading
            ? ""
            : result
              ? `${result.people} ${result.people === 1 ? "person" : "people"} · ${percent(result.tipPercent)}% tip`
              : "Enter the bill and number of people"
        }
        tone="compute"
        art="split"
        splitCount={count(headcount) ?? 2}
        context={loading ? "" : context}
        contextCaption={
          loading || !result ? "" : `${money(currency, result.grandTotal)} total`
        }
        stats={loading ? "[]" : stats}
      />

      <div
        className={mergeClasses(
          styles.verification,
          verificationComplete && styles.verificationComplete,
        )}
      >
        <span
          className={styles.verificationMain}
          role="status"
          aria-live="polite"
        >
          {verificationComplete ? (
            <CheckmarkCircle20Regular aria-hidden="true" />
          ) : (
            <Clock20Regular aria-hidden="true" />
          )}
          <span>{verificationLabel}</span>
        </span>
        {verificationTail ? (
          <span className={styles.verificationTail}>{verificationTail}</span>
        ) : null}
        {verificationComplete ? (
          <CodeEvidence key={codeEvidenceKey} inline />
        ) : null}
      </div>

      <form className={styles.controls} onSubmit={submit}>
        <Field label="Bill total">
          <Input
            className={styles.input}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            contentBefore={currency}
            value={bill}
            onChange={(_, data) => setBill(data.value)}
            onBlur={() => recompute()}
          />
        </Field>

        <Field label="People">
          <div className={styles.people}>
            <Button
              type="button"
              className={styles.step}
              appearance="subtle"
              icon={<Subtract20Regular />}
              aria-label="Remove one person"
              disabled={(count(headcount) ?? 1) <= 1}
              onClick={() => changePeople(-1)}
            />
            <Input
              className={styles.peopleInput}
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={headcount}
              aria-label="Number of people"
              onChange={(_, data) => setHeadcount(data.value)}
              onBlur={() => recompute()}
            />
            <Button
              type="button"
              className={styles.step}
              appearance="subtle"
              icon={<Add20Regular />}
              aria-label="Add one person"
              onClick={() => changePeople(1)}
            />
          </div>
        </Field>

        <Field label="Tip">
          <Input
            className={styles.input}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            contentAfter="%"
            value={tipPercent}
            onChange={(_, data) => setTipPercent(data.value)}
            onBlur={() => recompute()}
          />
        </Field>
      </form>
    </section>
  );
}
