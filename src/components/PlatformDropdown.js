import { useEffect, useRef, useState } from "react";
import "./PlatformDropdown.css";

function Chevron() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m5.5 7.5 4.5 4.5 4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PlatformDropdown({
  options = [],
  value = "",
  onChange,
  disabled = false,
  ariaLabel = "Choose platform",
  emptyLabel = "No linked platforms",
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className={`dt-platform-picker ${open ? "is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="dt-platform-picker-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="dt-platform-picker-copy">
          <small>SYNCED ACCOUNT</small>
          <strong>{selected?.label || emptyLabel}</strong>
        </span>
        <span className="dt-platform-picker-chevron"><Chevron /></span>
      </button>
      {open && !disabled && options.length > 0 && (
        <div className="dt-platform-picker-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`dt-platform-picker-option ${isSelected ? "is-selected" : ""}`}
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span className="dt-platform-option-mark">{String(option.label || "P").slice(0, 1).toUpperCase()}</span>
                <span>{option.label}</span>
                {isSelected && <span className="dt-platform-option-check" aria-hidden="true">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
