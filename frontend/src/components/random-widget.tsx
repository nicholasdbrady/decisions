"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";

import { type CardDraft, type RandomKind } from "@/lib/draft-view";

/** Crypto-grade when the browser offers it; chance deserves better than Math.random. */
function roll(max: number): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const limit = Math.floor(0xffffffff / max) * max;
    const buffer = new Uint32Array(1);
    let value = limit;
    while (value >= limit) {
      crypto.getRandomValues(buffer);
      value = buffer[0];
    }
    return value % max;
  }
  return Math.floor(Math.random() * max);
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = roll(index + 1);
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 25], [72, 25], [28, 50], [72, 50], [28, 75], [72, 75]],
};

function Die({ value, sides, held, onToggle }: { value: number; sides: number; held?: boolean; onToggle?: () => void }) {
  const pips = sides === 6 ? PIPS[value] : null;
  const face = (
    <>
      {pips ? (
        <>
          <svg viewBox="0 0 100 100" aria-hidden="true">
            {pips.map(([cx, cy], index) => <circle key={index} cx={cx} cy={cy} r="12" />)}
          </svg>
          <i className="sr-only">{value}</i>
        </>
      ) : (
        <b>{value}</b>
      )}
    </>
  );
  if (!onToggle) return <span className="die" data-sides={sides}>{face}</span>;
  return (
    <button type="button" className={`die ${held ? "held" : ""}`} data-sides={sides} onClick={onToggle} aria-pressed={held} aria-label={`${value}${held ? ", held" : ""}`}>
      {face}
    </button>
  );
}

/** Dice you can hold and re-roll — the shape every dice game actually needs. */
function DiceTray({ count, sides, modifier }: { count: number; sides: number; modifier: number }) {
  const [dice, setDice] = useState<number[]>(() => Array.from({ length: count }, () => roll(sides) + 1));
  const [held, setHeld] = useState<boolean[]>(() => Array.from({ length: count }, () => false));
  const [rolls, setRolls] = useState(1);

  const signature = `${count}:${sides}`;
  const [seen, setSeen] = useState(signature);
  if (seen !== signature) {
    setSeen(signature);
    setDice(Array.from({ length: count }, () => roll(sides) + 1));
    setHeld(Array.from({ length: count }, () => false));
    setRolls(1);
  }

  const canHold = count > 1;
  const again = () => {
    setDice((current) => current.map((value, index) => (canHold && held[index] ? value : roll(sides) + 1)));
    setRolls((value) => value + 1);
  };

  const total = dice.reduce((sum, value) => sum + value, 0) + modifier;
  const counts = new Map<number, number>();
  for (const value of dice) counts.set(value, (counts.get(value) ?? 0) + 1);
  const best = Math.max(...counts.values());
  const ofAKind = count >= 3 && best >= 3 ? (best === count ? `${count} of a kind` : `${best} of a kind`) : null;

  return (
    <>
      <div className="random-stage">
        <div className="dice-tray">
          {dice.map((value, index) => (
            <Die key={index} value={value} sides={sides} held={held[index]} onToggle={canHold ? () => setHeld((current) => current.map((on, at) => (at === index ? !on : on))) : undefined} />
          ))}
        </div>
        {count > 1 || modifier ? (
          <strong className="random-total">{total}<small>{count}d{sides}{modifier ? (modifier > 0 ? ` + ${modifier}` : ` − ${Math.abs(modifier)}`) : ""}</small></strong>
        ) : null}
      </div>
      {ofAKind ? <span className="dice-note">{ofAKind}</span> : null}
      <div className="random-actions">
        <button className="secondary-pill roll-again" type="button" onClick={again}>
          <RotateCcw size={14} aria-hidden="true" /> Roll {rolls > 1 ? `· roll ${rolls + 1}` : "again"}
        </button>
        {canHold ? <small className="random-hint">{held.some(Boolean) ? "Held dice keep their face" : "Tap a die to hold it"}</small> : null}
      </div>
    </>
  );
}

/** A wheel that actually spins and lands on the slice it says it landed on. */
function Wheel({ options, bottle }: { options: string[]; bottle: boolean }) {
  const [turn, setTurn] = useState(0);
  const [winner, setWinner] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const slice = 360 / Math.max(1, options.length);
  // A bottle needs no names: with none, it simply lands on a free direction.
  const free = bottle && !options.length;

  // Wedges drawn from the same slice maths the pointer lands by, with a hairline
  // at every boundary so neighbouring slices stay separate even on odd counts.
  const wedges = options
    .flatMap((_, index) => {
      const start = index * slice;
      const fill = index % 2 ? "var(--surface)" : "var(--warm-page-deep)";
      return [
        `var(--warm-line) ${start}deg ${start + 0.6}deg`,
        `${fill} ${start + 0.6}deg ${start + slice}deg`,
      ];
    })
    .join(", ");

  const spin = () => {
    const target = free ? 0 : roll(options.length);
    // Land the chosen slice under the pointer at the top, after four full turns.
    const landing = free ? 1440 + roll(360) : 1440 - target * slice - slice / 2;
    setTurn((current) => current + landing - (current % 360));
    setWinner(free ? null : target);
    setSpinning(true);
    window.setTimeout(() => setSpinning(false), 2200);
  };

  return (
    <>
      <div className="random-stage wheel-stage">
        <div className="wheel-shell">
          <span className="wheel-pointer" aria-hidden="true" />
          <div className="wheel" style={{ transform: `rotate(${turn}deg)`, background: bottle ? "var(--soft)" : `conic-gradient(${wedges})` }}>
            {bottle ? <span className="bottle" aria-hidden="true" /> : options.map((option, index) => {
              const angle = index * slice + slice / 2;
              // Labels past the horizon are flipped so they read outward instead of upside down.
              const flipped = angle > 90 && angle < 270;
              return (
                <span
                  key={option}
                  className={flipped ? "wheel-slice is-flipped" : "wheel-slice"}
                  style={{ transform: `rotate(${angle}deg)` }}
                >
                  <b>{option}</b>
                </span>
              );
            })}
            <span className="wheel-hub" aria-hidden="true" />
          </div>
        </div>
        {winner !== null && !spinning ? <strong className="wheel-winner">{options[winner]}</strong> : null}
      </div>
      <div className="random-actions">
        <button className="secondary-pill roll-again" type="button" onClick={spin} disabled={spinning}>
          <RotateCcw size={14} aria-hidden="true" /> {spinning ? "Spinning…" : bottle ? "Spin the bottle" : "Spin"}
        </button>
      </div>
    </>
  );
}

/** Face-down cards you turn one at a time, so an order is revealed, not listed. */
function OrderReveal({ options }: { options: string[] }) {
  const [order, setOrder] = useState(() => shuffled(options));
  const [shown, setShown] = useState(0);

  const signature = options.join("|");
  const [seen, setSeen] = useState(signature);
  if (seen !== signature) { setSeen(signature); setOrder(shuffled(options)); setShown(0); }

  const redeal = () => { setOrder(shuffled(options)); setShown(0); };

  return (
    <>
      <div className="random-stage order-stage">
        {order.map((name, index) => (
          <button
            key={name}
            type="button"
            className={`order-card ${index < shown ? "up" : ""}`}
            onClick={() => setShown((value) => Math.max(value, index + 1))}
            disabled={index > shown}
          >
            <small>{index + 1}</small>
            <b>{index < shown ? name : "?"}</b>
          </button>
        ))}
      </div>
      <div className="random-actions">
        <button className="secondary-pill roll-again" type="button" onClick={redeal}>
          <RotateCcw size={14} aria-hidden="true" /> Deal again
        </button>
        {shown < order.length ? <small className="random-hint">Turn the next card</small> : null}
      </div>
    </>
  );
}

/** Straws of honest, hidden length: you only learn yours by drawing it. */
function Sticks({ options }: { options: string[] }) {
  const count = Math.max(3, Math.min(10, options.length || 5));
  const [short, setShort] = useState(() => roll(count));
  const [drawn, setDrawn] = useState<number[]>([]);

  const reset = () => { setShort(roll(count)); setDrawn([]); };
  const loser = drawn.includes(short);

  return (
    <>
      <div className="random-stage stick-stage">
        {Array.from({ length: count }, (_, index) => {
          const pulled = drawn.includes(index);
          return (
            <button
              key={index}
              type="button"
              className={`stick ${pulled ? "pulled" : ""} ${pulled && index === short ? "short" : ""}`}
              onClick={() => !pulled && !loser && setDrawn((current) => [...current, index])}
              disabled={pulled || loser}
              aria-label={options[index] ? `Stick for ${options[index]}` : `Stick ${index + 1}`}
            >
              <span style={{ transform: `scaleY(${pulled && index === short ? 0.38 : 1})` }} />
              {options[index] ? <small>{options[index]}</small> : null}
            </button>
          );
        })}
      </div>
      {loser ? <strong className="stick-verdict">{options[short] ? `${options[short]} drew the short stick` : "Short stick"}</strong> : null}
      <div className="random-actions">
        <button className="secondary-pill roll-again" type="button" onClick={reset}>
          <RotateCcw size={14} aria-hidden="true" /> New bundle
        </button>
        {!loser ? <small className="random-hint">Draw until the short one shows</small> : null}
      </div>
    </>
  );
}

/** Even sides, with the remainder spread rather than dumped on one team. */
function Teams({ options, teams }: { options: string[]; teams: number }) {
  const [spin, setSpin] = useState(0);
  const sides = useMemo(() => {
    void spin;
    const groups: string[][] = Array.from({ length: Math.min(teams, Math.max(1, options.length)) }, () => []);
    shuffled(options).forEach((name, index) => groups[index % groups.length].push(name));
    return groups;
  }, [options, spin, teams]);

  return (
    <>
      <div className="random-stage team-stage">
        {sides.map((group, index) => (
          <div key={index} className="team">
            <small>Team {index + 1}</small>
            <ul>{group.map((name) => <li key={name}>{name}</li>)}</ul>
          </div>
        ))}
      </div>
      <div className="random-actions">
        <button className="secondary-pill roll-again" type="button" onClick={() => setSpin((value) => value + 1)}>
          <RotateCcw size={14} aria-hidden="true" /> Redraw teams
        </button>
      </div>
    </>
  );
}

// A full deck, so a draw and a blackjack hand come from the same honest source.
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS = [
  { id: "spades", glyph: "♠", red: false },
  { id: "hearts", glyph: "♥", red: true },
  { id: "diamonds", glyph: "♦", red: true },
  { id: "clubs", glyph: "♣", red: false },
];

type Card = { rank: string; suit: (typeof SUITS)[number]; id: string };

function freshDeck(): Card[] {
  return shuffled(SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit, id: `${rank}${suit.id}` }))));
}

function PlayingCard({ card, facedown }: { card: Card; facedown?: boolean }) {
  if (facedown) return <span className="playing-card down" aria-label="Face-down card" />;
  return (
    <span className={`playing-card ${card.suit.red ? "red" : ""}`} aria-label={`${card.rank} of ${card.suit.id}`}>
      <b>{card.rank}</b>
      <i>{card.suit.glyph}</i>
    </span>
  );
}

function handTotal(cards: Card[]): number {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.rank === "A") { aces += 1; total += 11; }
    else if (["K", "Q", "J", "10"].includes(card.rank)) total += 10;
    else total += Number(card.rank);
  }
  while (total > 21 && aces > 0) { total -= 10; aces -= 1; }
  return total;
}

type BlackjackPhase = "player" | "dealer" | "done";

type Table = { deck: Card[]; player: Card[]; dealer: Card[]; phase: BlackjackPhase };

function freshTable(): Table {
  const fresh = freshDeck();
  const player = [fresh[0], fresh[2]];
  const dealer = [fresh[1], fresh[3]];
  // A natural needs no decision; the hand is already over.
  const phase: BlackjackPhase = handTotal(player) === 21 ? "done" : "player";
  return { player, dealer, deck: fresh.slice(4), phase };
}

function Blackjack() {
  const [table, setTable] = useState<Table>(freshTable);
  const { deck, player, dealer, phase } = table;

  const deal = () => setTable(freshTable());

  const playerTotal = handTotal(player);
  const dealerTotal = handTotal(dealer);

  const settle = (hand: Card[], pile: Card[]) => {
    let dealerHand = [...dealer];
    let remaining = [...pile];
    // The house stands on 17, as it must.
    while (handTotal(dealerHand) < 17 && remaining.length && handTotal(hand) <= 21) {
      dealerHand = [...dealerHand, remaining[0]];
      remaining = remaining.slice(1);
    }
    setTable({ deck: remaining, player: hand, dealer: dealerHand, phase: "done" });
  };

  const hit = () => {
    const [next, ...rest] = deck;
    if (!next) return;
    const hand = [...player, next];
    if (handTotal(hand) >= 21) settle(hand, rest);
    else setTable({ ...table, player: hand, deck: rest });
  };

  const outcome = (() => {
    if (phase !== "done") return null;
    if (playerTotal > 21) return "Bust — dealer wins";
    if (dealerTotal > 21) return "Dealer busts — you win";
    if (playerTotal === 21 && player.length === 2) return "Blackjack";
    if (playerTotal > dealerTotal) return "You win";
    if (playerTotal < dealerTotal) return "Dealer wins";
    return "Push";
  })();

  const hidden = phase === "player";

  return (
    <div className="blackjack">
      <div className="bj-seat">
        <small>Dealer{hidden ? "" : ` · ${dealerTotal}`}</small>
        <div className="bj-hand">
          {dealer.map((card, index) => <PlayingCard key={card.id} card={card} facedown={hidden && index === 1} />)}
        </div>
      </div>
      <div className="bj-seat">
        <small>You · {playerTotal}</small>
        <div className="bj-hand">
          {player.map((card) => <PlayingCard key={card.id} card={card} />)}
        </div>
      </div>
      {outcome ? <strong className="bj-outcome">{outcome}</strong> : null}
      <div className="bj-actions">
        {phase === "player" ? (
          <>
            <button className="secondary-pill" type="button" onClick={hit}>Hit</button>
            <button className="secondary-pill" type="button" onClick={() => settle(player, deck)}>Stand</button>
          </>
        ) : (
          <button className="secondary-pill" type="button" onClick={deal}><RotateCcw size={14} aria-hidden="true" /> Deal again</button>
        )}
      </div>
    </div>
  );
}

type RollResult = {
  numbers?: number[];
  coin?: string;
  pick?: string | null;
  order?: string[];
  cards?: Card[];
};

export function RandomWidget({ draft, kind }: { draft: CardDraft; kind: RandomKind }) {
  const count = Math.min(5, Math.max(1, Number(draft.data.count ?? 2)));
  const sides = Math.max(2, Number(draft.data.sides ?? 6));
  const modifier = Number(draft.data.modifier ?? 0);
  const low = Number(draft.data.low ?? 1);
  const high = Number(draft.data.high ?? 100);
  const draws = Math.min(20, Math.max(1, Number(draft.data.draws ?? 1)));
  const teams = Math.min(8, Math.max(2, Number(draft.data.teams ?? 2)));
  const options = useMemo(() => (draft.data.options as string[] | undefined) ?? [], [draft.data.options]);

  const [spin, setSpin] = useState(0);
  const again = () => setSpin((value) => value + 1);

  const result = useMemo<RollResult>(() => {
    void spin;
    switch (kind) {
      case "number": {
        const span = Math.max(1, Math.abs(high - low) + 1);
        const base = Math.min(low, high);
        const wanted = Math.min(draws, span);
        const seen = new Set<number>();
        while (seen.size < wanted) seen.add(base + roll(span));
        return { numbers: [...seen] };
      }
      case "coin": return { coin: roll(2) === 0 ? "Heads" : "Tails" };
      case "pick": return { pick: options.length ? options[roll(options.length)] : null };
      case "shuffle": return { order: shuffled(options) };
      case "cards": return { cards: freshDeck().slice(0, draws) };
      default: return {};
    }
  }, [draws, high, kind, low, options, spin]);

  // Kinds that own their whole interaction, not just a result to re-roll.
  if (kind === "blackjack") return <div className="random-widget"><Blackjack /></div>;
  if (kind === "dice") return <div className="random-widget"><DiceTray count={count} sides={sides} modifier={modifier} /></div>;
  if (kind === "sticks") return <div className="random-widget"><Sticks options={options} /></div>;
  if (kind === "wheel" || kind === "bottle") {
    // A bottle always spins; only a wheel needs names to divide into slices.
    if (kind === "wheel" && !options.length) return <div className="random-widget"><p className="empty-widget">Name what the wheel chooses between.</p></div>;
    return <div className="random-widget"><Wheel options={options} bottle={kind === "bottle"} /></div>;
  }
  if (kind === "order") {
    if (!options.length) return <div className="random-widget"><p className="empty-widget">Name who is taking a turn.</p></div>;
    return <div className="random-widget"><OrderReveal options={options} /></div>;
  }
  if (kind === "teams") {
    if (options.length < 2) return <div className="random-widget"><p className="empty-widget">Name the people to divide up.</p></div>;
    return <div className="random-widget"><Teams options={options} teams={teams} /></div>;
  }

  return (
    <div className="random-widget">
      <div className="random-stage" key={spin}>
        {kind === "number" && result.numbers ? (
          <div className="number-draw">
            {result.numbers.map((value) => <strong key={value}>{value}</strong>)}
            <small>out of {Math.min(low, high)}–{Math.max(low, high)}</small>
          </div>
        ) : null}

        {kind === "coin" && result.coin ? (
          <span className={`coin-disc ${result.coin.toLowerCase()}`} aria-label={result.coin}>
            <b aria-hidden="true">{result.coin === "Heads" ? "H" : "T"}</b>
            <small aria-hidden="true">{result.coin}</small>
          </span>
        ) : null}

        {kind === "pick" ? (
          options.length ? <div className="pick-list">{options.map((option) => <span key={option} className={option === result.pick ? "chosen" : ""}>{option}</span>)}</div>
            : <p className="empty-widget">Name the things to choose between.</p>
        ) : null}

        {kind === "shuffle" && result.order ? (
          options.length ? <ol className="shuffle-list">{result.order.map((option) => <li key={option}>{option}</li>)}</ol>
            : <p className="empty-widget">Name the things to shuffle.</p>
        ) : null}

        {kind === "cards" && result.cards ? <div className="bj-hand">{result.cards.map((card) => <PlayingCard key={card.id} card={card} />)}</div> : null}
      </div>

      <button className="secondary-pill roll-again" type="button" onClick={again}>
        <RotateCcw size={14} aria-hidden="true" /> {kind === "coin" ? "Flip again" : kind === "cards" ? "Draw again" : "Again"}
      </button>
    </div>
  );
}
