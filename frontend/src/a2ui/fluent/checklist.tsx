"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import {
  Button,
  Caption1,
  Checkbox,
  Input,
  makeStyles,
  mergeClasses,
  ProgressBar,
  Text,
  tokens,
} from "@fluentui/react-components";
import { Add20Regular, Delete20Regular } from "@fluentui/react-icons";

import { str } from "./tone";

const useStyles = makeStyles({
  root: {
    display: "grid",
    rowGap: "10px",
    minWidth: 0,
  },
  progress: {
    display: "grid",
    gridTemplateColumns: "auto minmax(80px, 1fr)",
    alignItems: "center",
    columnGap: "12px",
  },
  count: {
    color: tokens.colorNeutralForeground3,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
  bar: {
    height: "4px",
  },
  list: {
    display: "grid",
    rowGap: "4px",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr) auto",
    alignItems: "center",
    columnGap: "6px",
    minWidth: 0,
    minHeight: "44px",
    padding: "2px 4px 2px 8px",
    borderRadius: tokens.borderRadiusMedium,
    transitionProperty: "background-color",
    transitionDuration: tokens.durationFaster,
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground2,
    },
    ":focus-within": {
      backgroundColor: tokens.colorNeutralBackground2,
    },
  },
  checkbox: {
    flexShrink: 0,
  },
  taskInput: {
    minWidth: 0,
    width: "100%",
    backgroundColor: "transparent",
    "& input": {
      minWidth: 0,
      paddingInline: "4px",
      color: tokens.colorNeutralForeground1,
      fontSize: tokens.fontSizeBase300,
    },
  },
  completedInput: {
    "& input": {
      color: tokens.colorNeutralForeground3,
      textDecorationLine: "line-through",
      textDecorationThickness: "1px",
    },
  },
  remove: {
    color: tokens.colorNeutralForeground3,
    opacity: 0.55,
    transitionProperty: "opacity, color, background-color",
    transitionDuration: tokens.durationFaster,
    ":hover": {
      color: tokens.colorPaletteRedForeground1,
      opacity: 1,
    },
    ":focus-visible": {
      opacity: 1,
    },
  },
  empty: {
    margin: "4px 8px",
    color: tokens.colorNeutralForeground3,
  },
  add: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    columnGap: "8px",
    marginTop: "4px",
    paddingTop: "10px",
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  addInput: {
    minWidth: 0,
    width: "100%",
  },
  addButton: {
    minWidth: "72px",
  },
});

type Item = { id: string; text: string };

function strings(value: unknown): string[] {
  try {
    const parsed = JSON.parse(str(value));
    return Array.isArray(parsed)
      ? parsed.map((item) => str(item).trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

export function ChecklistView(props: { items?: unknown; done?: unknown }) {
  const styles = useStyles();
  const initialItems = useMemo(() => strings(props.items), [props.items]);
  const initialDone = useMemo(() => strings(props.done), [props.done]);
  const nextId = useRef(initialItems.length);
  const [items, setItems] = useState<Item[]>(() =>
    initialItems.map((text, index) => ({ id: `task-${index}`, text })),
  );
  const [checked, setChecked] = useState<Set<string>>(
    () =>
      new Set(
        initialItems.flatMap((text, index) =>
          initialDone.includes(text) ? [`task-${index}`] : [],
        ),
      ),
  );
  const [draft, setDraft] = useState("");
  const completed = items.filter((item) => checked.has(item.id)).length;

  const addItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const id = `task-${nextId.current++}`;
    setItems((current) => [...current, { id, text }]);
    setDraft("");
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
    setChecked((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  };

  return (
    <section className={styles.root} aria-label="Checklist">
      <div className={styles.progress}>
        <Caption1 className={styles.count}>
          {items.length === 0
            ? "No tasks yet"
            : `${completed} of ${items.length} done`}
        </Caption1>
        <ProgressBar
          className={styles.bar}
          color="success"
          max={Math.max(items.length, 1)}
          value={completed}
          aria-label={`${completed} of ${items.length} tasks completed`}
        />
      </div>
      {items.length === 0 ? (
        <Text className={styles.empty}>Add the first task below.</Text>
      ) : (
        <ul className={styles.list}>
          {items.map((item, index) => {
            const isChecked = checked.has(item.id);
            return (
              <li key={item.id} className={styles.row}>
                <Checkbox
                  className={styles.checkbox}
                  checked={isChecked}
                  aria-label={`${isChecked ? "Mark incomplete" : "Mark complete"}: ${item.text}`}
                  indicator={
                    isChecked
                      ? {
                          style: {
                            backgroundColor:
                              tokens.colorPaletteGreenForeground1,
                            borderColor: tokens.colorPaletteGreenForeground1,
                          },
                        }
                      : undefined
                  }
                  onChange={(_, data) => {
                    setChecked((current) => {
                      const next = new Set(current);
                      if (data.checked === true) next.add(item.id);
                      else next.delete(item.id);
                      return next;
                    });
                  }}
                />
                <Input
                  appearance="underline"
                  className={mergeClasses(
                    styles.taskInput,
                    isChecked && styles.completedInput,
                  )}
                  value={item.text}
                  aria-label={`Edit task ${index + 1}`}
                  onChange={(_, data) => {
                    setItems((current) =>
                      current.map((candidate) =>
                        candidate.id === item.id
                          ? { ...candidate, text: data.value }
                          : candidate,
                      ),
                    );
                  }}
                />
                <Button
                  appearance="subtle"
                  className={styles.remove}
                  icon={<Delete20Regular />}
                  aria-label={`Remove ${item.text || `task ${index + 1}`}`}
                  onClick={() => removeItem(item.id)}
                />
              </li>
            );
          })}
        </ul>
      )}
      <form className={styles.add} onSubmit={addItem}>
        <Input
          appearance="underline"
          className={styles.addInput}
          value={draft}
          placeholder="Add a task"
          aria-label="New checklist task"
          onChange={(_, data) => setDraft(data.value)}
        />
        <Button
          appearance="subtle"
          className={styles.addButton}
          icon={<Add20Regular />}
          type="submit"
          disabled={!draft.trim()}
        >
          Add
        </Button>
      </form>
    </section>
  );
}
