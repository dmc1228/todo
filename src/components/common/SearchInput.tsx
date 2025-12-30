import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import "./SearchInput.css";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  resultCount?: number;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchInput({
  value,
  onChange,
  resultCount,
  placeholder = "Search tasks...",
  autoFocus = false,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<number>();

  // Focus on mount if autoFocus is true
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Debounce the search input
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      onChange(localValue);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [localValue, onChange]);

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleClear = () => {
    setLocalValue("");
    onChange("");
    inputRef.current?.focus();
  };

  const showResultCount = localValue.trim() !== "" && resultCount !== undefined;

  return (
    <div className="search-input-container">
      <div className="search-input-wrapper">
        <Search size={16} className="search-icon" />
        <input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder={placeholder}
          className="search-input"
        />
        {localValue && (
          <button
            onClick={handleClear}
            className="search-clear-button"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {showResultCount && (
        <div className="search-result-count">
          {resultCount === 0
            ? "No tasks found"
            : `${resultCount} task${resultCount === 1 ? "" : "s"}`}
        </div>
      )}
    </div>
  );
}
