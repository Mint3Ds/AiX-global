"use client";

import React, { useEffect, useId, useRef, useState } from "react";

export type DropdownOption<T extends string | number = string> = {
  value: T;
  label: React.ReactNode;
  meta?: React.ReactNode;
};

export interface CustomDropdownProps<T extends string | number = string> {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  sectionLabel?: string;
  ariaLabel?: string;
  disabled?: boolean;
  align?: "left" | "right";
  fullWidth?: boolean;
  renderTriggerContent?: (selected: DropdownOption<T> | undefined) => React.ReactNode;
  className?: string;
}

export function CustomDropdown<T extends string | number = string>({
  value,
  options,
  onChange,
  sectionLabel,
  ariaLabel,
  disabled = false,
  align = "right",
  fullWidth = false,
  renderTriggerContent,
  className = "",
}: CustomDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

  const selectedOption =
    options.find((opt) => String(opt.value) === String(value)) ?? options[0];

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const currentIndex = options.findIndex(
        (opt) => String(opt.value) === String(value),
      );
      const delta = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex =
        (currentIndex + delta + options.length) % Math.max(1, options.length);
      if (options[nextIndex]) {
        onChange(options[nextIndex].value);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`clarity-dropdown ${open ? "is-open" : ""} ${fullWidth ? "clarity-dropdown-full" : ""} ${className}`.trim()}
      onClick={(event) => {
        // Prevent synthetic <label> click forwarding when nested inside a <label>
        if (event.target !== triggerRef.current && !triggerRef.current?.contains(event.target as Node)) {
          event.preventDefault();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        className={`clarity-dropdown-trigger bg-white border border-slate-200/90 rounded-lg px-3.5 py-1.5 shadow-2xs hover:border-slate-300 hover:bg-slate-50/60 ${
          open ? "is-open ring-2 ring-slate-900/5 border-slate-300" : ""
        }`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!disabled) setOpen((prev) => !prev);
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="clarity-dropdown-trigger-content">
          {renderTriggerContent
            ? renderTriggerContent(selectedOption)
            : selectedOption?.label}
        </span>
        <svg
          className={`clarity-dropdown-chevron text-slate-400 transition-transform duration-150 ${
            open ? "is-open rotate-180" : ""
          }`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={sectionLabel || ariaLabel || "Options"}
          className={`clarity-dropdown-menu clarity-dropdown-align-${align} absolute right-0 mt-2 min-w-[220px] bg-white border border-slate-200/90 rounded-xl p-1.5 shadow-lg shadow-slate-900/5 transition ease-out duration-100 origin-top-right`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          {sectionLabel && (
            <div className="clarity-dropdown-header px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {sectionLabel}
            </div>
          )}
          <div className="clarity-dropdown-list">
            {options.map((option) => {
              const isSelected = String(option.value) === String(value);
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`clarity-dropdown-item px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${
                    isSelected
                      ? "is-selected text-slate-900 bg-slate-100/80 font-medium"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-normal"
                  }`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onChange(option.value);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                >
                  <span className="clarity-dropdown-item-label">
                    {option.label}
                  </span>
                  <span className="clarity-dropdown-item-right">
                    {option.meta !== undefined && option.meta !== null && (
                      <span className="clarity-dropdown-item-meta text-xs text-slate-400">
                        {option.meta}
                      </span>
                    )}
                    {isSelected && (
                      <svg
                        className="clarity-dropdown-check text-slate-900"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

