import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { Check, Loader } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { parseQuickAdd } from "../../lib/taskParser";
import { Project } from "../../types";
import { format } from "date-fns";
import "./QuickAddInput.css";

interface QuickAddInputProps {
  sectionId: string;
  projects: Project[];
  onTaskCreated?: () => void;
  autoFocus?: boolean;
  onCreate: (sectionId: string, rawInput: string) => Promise<void>;
}

export function QuickAddInput({
  sectionId,
  onTaskCreated,
  autoFocus = false,
  onCreate,
}: QuickAddInputProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [batchCount, setBatchCount] = useState(0);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const parsed = input ? parseQuickAdd(input) : null;

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      await onCreate(sectionId, input);

      // Show success animation
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1000);

      // Clear input
      setInput("");

      // Callback
      onTaskCreated?.();
    } catch (err) {
      setError("Failed to create task");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      setInput("");
      inputRef.current?.blur();
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData("text");

    // Check if the pasted text contains multiple lines
    const lines = pastedText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length > 1) {
      // Prevent default paste behavior
      e.preventDefault();

      setIsLoading(true);
      setError(null);

      try {
        // Create a task for each line
        let successCount = 0;
        for (const line of lines) {
          try {
            await onCreate(sectionId, line);
            successCount++;
          } catch (err) {
            console.error("Failed to create task from line:", line, err);
          }
        }

        // Show batch success
        setBatchCount(successCount);
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setBatchCount(0);
        }, 2000);

        // Clear input
        setInput("");

        // Callback
        onTaskCreated?.();
      } catch (err) {
        setError("Failed to create tasks from list");
      } finally {
        setIsLoading(false);
      }
    }
    // If only one line, allow normal paste behavior
  };

  return (
    <div className="quick-add-container">
      <div className={`quick-add-input-wrapper ${focused ? "focused" : ""}`}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="New task"
          disabled={isLoading}
          className="quick-add-input"
        />

        {isLoading && (
          <div className="quick-add-icon loading">
            <Loader size={16} className="spinner" />
          </div>
        )}

        <AnimatePresence>
          {showSuccess && (
            <motion.div
              className="quick-add-icon success"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
            >
              <Check size={16} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showSuccess && batchCount > 1 && (
          <motion.div
            className="quick-add-batch-success"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
          >
            Created {batchCount} tasks from pasted list
          </motion.div>
        )}

        {focused && parsed && input && (
          <motion.div
            className="quick-add-preview"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
          >
            <div className="preview-row">
              <span className="preview-label">Name:</span>
              <span className="preview-value">{parsed.name}</span>
            </div>

            {parsed.importance !== "normal" && (
              <div className="preview-row">
                <span className="preview-label">Importance:</span>
                <span className={`preview-badge ${parsed.importance}`}>
                  {parsed.importance === "very_important"
                    ? "Urgent"
                    : "Important"}
                </span>
              </div>
            )}

            {parsed.tags.length > 0 && (
              <div className="preview-row">
                <span className="preview-label">Tags:</span>
                <div className="preview-tags">
                  {parsed.tags.map((tag) => (
                    <span key={tag} className="preview-tag">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {parsed.project && (
              <div className="preview-row">
                <span className="preview-label">Project:</span>
                <span className="preview-value">{parsed.project}</span>
              </div>
            )}

            {parsed.dueDate && (
              <div className="preview-row">
                <span className="preview-label">Due:</span>
                <span className="preview-value">
                  {format(parsed.dueDate, "MMM d, yyyy")}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {error && <div className="quick-add-error">{error}</div>}
    </div>
  );
}
