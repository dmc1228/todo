import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { Task } from "../../types";
import "./SmartShoppingInput.css";

interface SmartShoppingInputProps {
  sectionId: string;
  allTasks: Task[]; // All tasks including completed/archived
  onAddTask: (sectionId: string, rawInput: string) => Promise<Task | null>;
  onUnarchiveTask: (taskId: string) => void;
  disabled?: boolean;
}

export function SmartShoppingInput({
  sectionId,
  allTasks,
  onAddTask,
  onUnarchiveTask,
  disabled,
}: SmartShoppingInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [searchResults, setSearchResults] = useState<Task[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter tasks in this section by search input
  useEffect(() => {
    if (!inputValue.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const searchLower = inputValue.toLowerCase();

    // Get all tasks in shopping sections (both active and completed)
    const shoppingTasks = allTasks.filter(
      (t) => t.section_id === sectionId
    );

    // Find matching tasks
    const matches = shoppingTasks.filter((task) =>
      task.name.toLowerCase().includes(searchLower)
    );

    // Sort: active tasks first, then completed, then by name
    matches.sort((a, b) => {
      const aCompleted = !!a.completed_at;
      const bCompleted = !!b.completed_at;

      if (aCompleted !== bCompleted) {
        return aCompleted ? 1 : -1; // Active tasks first
      }

      return a.name.localeCompare(b.name);
    });

    setSearchResults(matches);
    setShowDropdown(matches.length > 0);
    setSelectedIndex(-1);
  }, [inputValue, allTasks, sectionId]);

  // Check if exact match exists
  const exactMatch = searchResults.find(
    (task) => task.name.toLowerCase() === inputValue.toLowerCase()
  );

  // Check if any active (non-completed) task matches
  const activeMatch = searchResults.find(
    (task) =>
      task.name.toLowerCase() === inputValue.toLowerCase() &&
      !task.completed_at
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      // If there's a keyboard selection, handle it
      if (selectedIndex >= 0 && searchResults[selectedIndex]) {
        handleSelectTask(searchResults[selectedIndex]);
        return;
      }

      // If exact match exists but is archived, unarchive it
      if (exactMatch && exactMatch.completed_at) {
        onUnarchiveTask(exactMatch.id);
        setInputValue("");
        setShowDropdown(false);
        return;
      }

      // If exact match exists and is active, just clear input (it's already on the list)
      if (activeMatch) {
        setInputValue("");
        setShowDropdown(false);
        // Maybe flash the existing item to show it's already there?
        return;
      }

      // Otherwise, add new task
      if (inputValue.trim()) {
        onAddTask(sectionId, inputValue.trim());
        setInputValue("");
        setShowDropdown(false);
      }
    } else if (e.key === "Escape") {
      setInputValue("");
      setShowDropdown(false);
      setSelectedIndex(-1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < searchResults.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    }
  };

  const handleSelectTask = (task: Task) => {
    if (task.completed_at) {
      // Unarchive the task
      onUnarchiveTask(task.id);
    }
    // If task is already active, do nothing (it's already on the list)

    setInputValue("");
    setShowDropdown(false);
    setSelectedIndex(-1);
  };

  const handleBlur = () => {
    // Delay to allow click events on dropdown items
    setTimeout(() => {
      setShowDropdown(false);
      setSelectedIndex(-1);
    }, 200);
  };

  return (
    <div className="smart-shopping-input-container">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={() => {
          if (inputValue.trim() && searchResults.length > 0) {
            setShowDropdown(true);
          }
        }}
        placeholder="Add item or search existing..."
        disabled={disabled}
        className="smart-shopping-input"
      />

      {showDropdown && searchResults.length > 0 && (
        <div ref={dropdownRef} className="smart-shopping-dropdown">
          {searchResults.map((task, index) => (
            <button
              key={task.id}
              className={`smart-shopping-result ${selectedIndex === index ? "selected" : ""} ${task.completed_at ? "completed" : "active"}`}
              onClick={() => handleSelectTask(task)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="result-name">{task.name}</span>
              {task.completed_at ? (
                <span className="result-status completed">✓ Click to add back</span>
              ) : (
                <span className="result-status active">Already on list</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
