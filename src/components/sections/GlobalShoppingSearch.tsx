import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { Search } from "lucide-react";
import { Task, Section } from "../../types";
import "./GlobalShoppingSearch.css";

interface GlobalShoppingSearchProps {
  allTasks: Task[];
  sections: Section[];
  onAddTask: (sectionId: string, rawInput: string) => Promise<Task | null>;
  onUnarchiveTask: (taskId: string) => void;
  disabled?: boolean;
}

export function GlobalShoppingSearch({
  allTasks,
  sections,
  onAddTask,
  onUnarchiveTask,
  disabled,
}: GlobalShoppingSearchProps) {
  const [inputValue, setInputValue] = useState("");
  const [searchResults, setSearchResults] = useState<Task[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get section name for a task
  const getSectionName = (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    return section?.name || "Unknown";
  };

  // Filter tasks across ALL shopping sections by search input
  useEffect(() => {
    if (!inputValue.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const searchLower = inputValue.toLowerCase();

    // Search ALL tasks (across all shopping sections, including completed)
    const matches = allTasks.filter((task) =>
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
  }, [inputValue, allTasks]);

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

      // If exact match exists but is completed, unarchive it
      if (exactMatch && exactMatch.completed_at) {
        onUnarchiveTask(exactMatch.id);
        setInputValue("");
        setShowDropdown(false);
        return;
      }

      // If exact match exists and is active, just clear input
      if (activeMatch) {
        setInputValue("");
        setShowDropdown(false);
        return;
      }

      // Otherwise, add new task to "To Sort" section or first section
      if (inputValue.trim()) {
        const toSortSection = sections.find(
          (s) => s.name.toLowerCase() === "to sort"
        );
        const targetSection = toSortSection || sections[0];

        if (targetSection) {
          onAddTask(targetSection.id, inputValue.trim());
          setInputValue("");
          setShowDropdown(false);
        }
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
      // Unarchive the task in its original section
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
    <div className={`global-shopping-search-container ${showDropdown && searchResults.length > 0 ? "has-results" : ""}`}>
      <div className="global-shopping-search-wrapper">
        <Search size={20} className="global-search-icon" />
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
          placeholder="Search shopping list or add new item..."
          disabled={disabled}
          className="global-shopping-search-input"
        />
      </div>

      {showDropdown && searchResults.length > 0 && (
        <div ref={dropdownRef} className="global-shopping-dropdown">
          {searchResults.slice(0, 10).map((task, index) => (
            <button
              key={task.id}
              className={`global-shopping-result ${selectedIndex === index ? "selected" : ""} ${task.completed_at ? "completed" : "active"}`}
              onClick={() => handleSelectTask(task)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="result-main">
                <span className="result-name">{task.name}</span>
                <span className="result-section">{getSectionName(task.section_id)}</span>
              </div>
              {task.completed_at ? (
                <span className="result-status completed">Click to add back</span>
              ) : (
                <span className="result-status active">On list</span>
              )}
            </button>
          ))}
          {searchResults.length > 10 && (
            <div className="more-results">
              +{searchResults.length - 10} more results
            </div>
          )}
        </div>
      )}
    </div>
  );
}
