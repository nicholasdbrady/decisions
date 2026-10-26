"use client";

import { useState } from "react";

/** A poll is only a poll once it can be voted in; a list of names is a list. */
export function PollWidget({ options, multi }: { options: string[]; multi: boolean }) {
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<Set<string>>(new Set());

  if (!options.length) return <div className="poll-widget"><p className="empty-widget">Name the options to vote between.</p></div>;

  const total = Object.values(votes).reduce((sum, value) => sum + value, 0);
  const leader = Math.max(1, ...Object.values(votes));

  const vote = (option: string) => {
    const chosen = mine.has(option);
    const next = new Set(mine);
    if (chosen) next.delete(option);
    else {
      if (!multi) next.clear();
      next.add(option);
    }
    setMine(next);
    setVotes((current) => {
      const tally = { ...current };
      if (chosen) tally[option] = Math.max(0, (tally[option] ?? 1) - 1);
      else {
        if (!multi) for (const previous of mine) tally[previous] = Math.max(0, (tally[previous] ?? 1) - 1);
        tally[option] = (tally[option] ?? 0) + 1;
      }
      return tally;
    });
  };

  return (
    <div className="poll-widget">
      <div className="poll-rows">
        {options.map((option) => {
          const count = votes[option] ?? 0;
          const share = count / leader;
          const picked = mine.has(option);
          return (
            <button key={option} type="button" className={`poll-row ${picked ? "picked" : ""}`} onClick={() => vote(option)} aria-pressed={picked}>
              <span className="poll-bar" style={{ transform: `scaleX(${share})` }} aria-hidden="true" />
              <span className="poll-name">{option}</span>
              <span className="poll-count">{count || ""}</span>
            </button>
          );
        })}
      </div>
      <small className="poll-total">
        {total ? `${total} vote${total === 1 ? "" : "s"}` : "Tap an option to vote"}
        {multi && total ? " · multi-select" : ""}
      </small>
    </div>
  );
}
