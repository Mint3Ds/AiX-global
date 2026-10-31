"use client";

import { useEffect, useRef } from "react";

export type ChoiceOption = {
  value: string;
  label: string;
  description?: string;
};

/** Small, keyboard-friendly menu for choices where the native OS popup feels out of place. */
export function ChoiceMenu({
  label,
  value,
  options,
  onChange,
  disabled = false,
  className = "",
}: {
  label: string;
  value: string;
  options: ChoiceOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (
        details.current?.open &&
        event.target instanceof Node &&
        !details.current.contains(event.target)
      )
        details.current.open = false;
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, []);

  const close = (restoreFocus = false) => {
    if (!details.current) return;
    details.current.open = false;
    if (restoreFocus)
      details.current.querySelector<HTMLElement>("summary")?.focus();
  };

  return (
    <div className={`choice-menu-field ${className}`.trim()}>
      <span className="choice-menu-label">{label}</span>
      <details
        className="choice-menu"
        ref={details}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            close(true);
          } else if (
            event.key === "ArrowDown" &&
            event.target instanceof HTMLElement &&
            event.target.tagName === "SUMMARY"
          ) {
            event.preventDefault();
            details.current!.open = true;
            requestAnimationFrame(() =>
              details.current
                ?.querySelector<HTMLButtonElement>(".choice-menu-options button")
                ?.focus(),
            );
          }
        }}
      >
        <summary
          aria-label={`${label}: ${selected?.label || "Choose"}`}
          aria-disabled={disabled}
          onClick={(event) => {
            if (disabled) event.preventDefault();
          }}
        >
          <span className="choice-menu-current">{selected?.label || "Choose"}</span>
          <span className="choice-menu-caret" aria-hidden="true" />
        </summary>
        <div className="choice-menu-options" role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              type="button"
              role="option"
              key={option.value}
              className={option.value === value ? "selected" : ""}
              aria-selected={option.value === value}
              disabled={disabled}
              onClick={() => {
                onChange(option.value);
                close();
              }}
            >
              <span>{option.label}</span>
              {option.description && <small>{option.description}</small>}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
