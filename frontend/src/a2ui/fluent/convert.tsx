"use client";

import { ArrowSwapRegular } from "@fluentui/react-icons";
import { useId, useState } from "react";

import { str } from "./tone";

type Option = { label: string; value: string };
type ConvertAction = {
  event: {
    name: "convert";
    context: { value: string; from: string; to: string };
  };
};

function optionsOf(value: unknown): Option[] {
  try {
    const parsed = JSON.parse(str(value)) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (option): option is Option =>
        !!option &&
        typeof option === "object" &&
        typeof option.label === "string" &&
        typeof option.value === "string",
    );
  } catch {
    return [];
  }
}

export function ConvertView({
  value,
  result,
  from,
  to,
  options,
  dispatch,
}: {
  value?: unknown;
  result?: unknown;
  from?: unknown;
  to?: unknown;
  options?: unknown;
  dispatch?: (action: ConvertAction) => void;
}) {
  const resolvedValue = str(value);
  const resolvedFrom = str(from);
  const resolvedTo = str(to);
  const choices = optionsOf(options);
  const amountId = useId();
  const [amount, setAmount] = useState(resolvedValue);
  const [source, setSource] = useState(resolvedFrom);
  const [target, setTarget] = useState(resolvedTo);

  const convert = (next?: {
    amount?: string;
    source?: string;
    target?: string;
  }) => {
    dispatch?.({
      event: {
        name: "convert",
        context: {
          value: next?.amount ?? amount,
          from: next?.source ?? source,
          to: next?.target ?? target,
        },
      },
    });
  };

  const swap = () => {
    setSource(target);
    setTarget(source);
    convert({ source: target, target: source });
  };

  return (
    <section className="jev-convert" aria-label="Unit conversion">
      <div className="jev-convert-side">
        <label htmlFor={amountId}>From</label>
        <input
          id={amountId}
          className="jev-convert-value"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          onBlur={() => convert()}
          onKeyDown={(event) => {
            if (event.key === "Enter") convert();
          }}
        />
        <select
          aria-label="Convert from"
          value={source}
          onChange={(event) => {
            setSource(event.target.value);
            convert({ source: event.target.value });
          }}
        >
          {choices.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <button
        className="jev-convert-swap"
        type="button"
        aria-label="Swap units"
        onClick={swap}
      >
        <ArrowSwapRegular />
      </button>

      <div className="jev-convert-side jev-convert-result">
        <span className="jev-convert-label">To</span>
        <output className="jev-convert-value">{str(result) || "—"}</output>
        <select
          aria-label="Convert to"
          value={target}
          onChange={(event) => {
            setTarget(event.target.value);
            convert({ target: event.target.value });
          }}
        >
          {choices.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
