"use client";

import { Fragment, useId, type ReactNode } from "react";
import {
  basicCatalog,
  createReactComponent,
  type ReactComponentImplementation,
} from "@copilotkit/a2ui-renderer";
import {
  Body1,
  Button as FluentButton,
  Caption1,
  Field as FluentField,
  Input,
  Textarea,
  Title2,
  Title3,
} from "@fluentui/react-components";

/**
 * Restyled A2UI basic components. They keep the basic schemas, so anything the
 * backend already sends still validates, but they drop the inline default
 * styles for classes from `catalog.css` that match the omnibar.
 */

type BuildChild = (id: string, basePath?: string) => ReactNode;
type Render<P> = (args: {
  props: P;
  buildChild: BuildChild;
  context: { componentModel: { id: string } };
}) => ReactNode;
type ChildRef = string | { id: string; basePath?: string };

function override<P>(
  name: string,
  render: Render<P>,
): ReactComponentImplementation {
  const base = basicCatalog.components.get(name);
  if (!base) throw new Error(`A2UI basic catalog has no ${name}`);
  return createReactComponent({ name, schema: base.schema }, render as never);
}

function children(list: unknown, buildChild: BuildChild): ReactNode {
  if (!Array.isArray(list)) return null;
  return (list as ChildRef[]).map((item, index) => {
    if (typeof item === "string")
      return <Fragment key={`${item}-${index}`}>{buildChild(item)}</Fragment>;
    if (item && typeof item === "object" && "id" in item) {
      return (
        <Fragment key={`${item.id}-${index}`}>
          {buildChild(item.id, item.basePath)}
        </Fragment>
      );
    }
    return null;
  });
}

type Layout = { children?: unknown; align?: string; justify?: string };

const Card = override<{ child?: string }>("Card", ({ props, buildChild }) => (
  <div className="jev-card">{props.child ? buildChild(props.child) : null}</div>
));

const Column = override<Layout>("Column", ({ props, buildChild }) => (
  <div
    className="jev-column"
    data-align={props.align}
    data-justify={props.justify}
  >
    {children(props.children, buildChild)}
  </div>
));

const Row = override<Layout>("Row", ({ props, buildChild }) => (
  <div
    className="jev-row"
    data-align={props.align}
    data-justify={props.justify}
  >
    {children(props.children, buildChild)}
  </div>
));

const Text = override<{ text?: string; variant?: string }>(
  "Text",
  ({ props }) => {
    const text = props.text ?? "";
    switch (props.variant) {
      case "h1":
      case "h2":
        return (
          <Title2 as="h2" className="jev-title">
            {text}
          </Title2>
        );
      case "h3":
      case "h4":
      case "h5":
        return (
          <Title3 as="h3" className="jev-subhead">
            {text}
          </Title3>
        );
      case "caption":
        return <Caption1 className="jev-caption">{text}</Caption1>;
      default:
        return <Body1 className="jev-text">{text}</Body1>;
    }
  },
);

const Divider = override<{ axis?: string }>("Divider", ({ props }) => (
  <hr className="jev-divider" data-axis={props.axis ?? "horizontal"} />
));

const Button = override<{
  child?: string;
  variant?: string;
  action?: () => void;
  isValid?: boolean;
}>("Button", ({ props, buildChild }) => {
  const appearance =
    props.variant === "primary"
      ? "primary"
      : props.variant === "borderless"
        ? "subtle"
        : "secondary";
  return (
    <FluentButton
      className="jev-button"
      data-variant={props.variant ?? "default"}
      onClick={props.action}
      disabled={props.isValid === false}
      appearance={appearance}
      shape="circular"
    >
      {props.child ? buildChild(props.child) : null}
    </FluentButton>
  );
});

type Field = {
  label?: string;
  value?: string;
  setValue: (value: string) => void;
  variant?: string;
  validationErrors?: string[];
};

const TextField = override<Field>("TextField", ({ props }) => {
  const id = useId();
  const error = props.validationErrors?.[0];
  const type =
    props.variant === "number"
      ? "number"
      : props.variant === "obscured"
        ? "password"
        : "text";
  return (
    <FluentField
      className="jev-field"
      label={props.label}
      validationState={error ? "error" : "none"}
      validationMessage={error}
    >
      {props.variant === "longText" ? (
        <Textarea
          id={id}
          className="jev-input"
          resize="vertical"
          value={props.value ?? ""}
          onChange={(_, data) => props.setValue(data.value)}
        />
      ) : (
        <Input
          id={id}
          className="jev-input"
          type={type}
          value={props.value ?? ""}
          onChange={(_, data) => props.setValue(data.value)}
        />
      )}
    </FluentField>
  );
});

type Option = { label: string; value: string };
type Picker = {
  label?: string;
  value?: string[];
  setValue: (value: string[]) => void;
  options?: Option[];
  variant?: string;
  displayStyle?: string;
};

/** Clarify labels end in " · 49%". Split them so the share draws as a meter. */
function share(label: string): { name: string; percent: number | null } {
  const match = /^(.*?)\s*·\s*(\d{1,3})%$/.exec(label);
  return match
    ? { name: match[1], percent: Number(match[2]) }
    : { name: label, percent: null };
}

const ChoicePicker = override<Picker>("ChoicePicker", ({ props, context }) => {
  const values = Array.isArray(props.value) ? props.value : [];
  const single = props.variant === "mutuallyExclusive";
  const toggle = (value: string) =>
    props.setValue(
      single
        ? [value]
        : values.includes(value)
          ? values.filter((v) => v !== value)
          : [...values, value],
    );
  const options = props.options ?? [];
  const chips = props.displayStyle === "chips";

  return (
    <fieldset className="jev-picker" data-style={chips ? "chips" : "list"}>
      {props.label ? <legend>{props.label}</legend> : null}
      <div className="jev-picker-options">
        {options.map((option) => {
          const { name, percent } = share(String(option.label));
          const selected = values.includes(option.value);
          return (
            <label
              key={option.value}
              className="jev-option"
              data-selected={selected || undefined}
            >
              <input
                type={single ? "radio" : "checkbox"}
                name={
                  single ? `choice-${context.componentModel.id}` : undefined
                }
                checked={selected}
                onChange={() => toggle(option.value)}
              />
              <span className="jev-option-name">{name}</span>
              {percent !== null ? (
                <span
                  className="jev-option-share"
                  aria-label={`${percent}% likely`}
                >
                  <i>
                    <b
                      style={{
                        transform: `scaleX(${Math.max(percent, 2) / 100})`,
                      }}
                    />
                  </i>
                  <small>{percent}%</small>
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
});

export const basicOverrides = [
  Card,
  Column,
  Row,
  Text,
  Divider,
  Button,
  TextField,
  ChoicePicker,
];
