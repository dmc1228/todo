import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import "./ShortcutsHelp.css";

interface ShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  description: string;
}

interface ShortcutCategory {
  title: string;
  shortcuts: Shortcut[];
}

const shortcuts: ShortcutCategory[] = [
  {
    title: "Global",
    shortcuts: [
      { keys: ["⇥", "Q"], description: "Quick add task" },
      { keys: ["/"], description: "Focus search" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
    ],
  },
  {
    title: "Task Selected",
    shortcuts: [
      { keys: ["⇥", "↵"], description: "Complete task" },
      { keys: ["↵"], description: "Open task detail" },
      { keys: ["⌫"], description: "Delete task" },
      { keys: ["↑", "K"], description: "Select previous task" },
      { keys: ["↓", "J"], description: "Select next task" },
      { keys: ["Esc"], description: "Deselect / Close panel" },
    ],
  },
  {
    title: "Tab Sequences (Asana-style)",
    shortcuts: [
      { keys: ["⇥", "D"], description: "Set due date" },
      { keys: ["⇥", "P"], description: "Assign to project" },
      { keys: ["⇥", "T"], description: "Add tags" },
      { keys: ["⇥", "S"], description: "Move to section" },
    ],
  },
  {
    title: "Quick Add Syntax",
    shortcuts: [
      { keys: ["*"], description: "Mark as Important" },
      { keys: ["!"], description: "Mark as Urgent" },
      { keys: ["*!"], description: "Important & Urgent" },
      { keys: ["#tag"], description: "Add tag" },
      { keys: ["p:Name"], description: "Assign project" },
      { keys: ["@date"], description: "Set due date" },
    ],
  },
];

export function ShortcutsHelp({ isOpen, onClose }: ShortcutsHelpProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="shortcuts-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="shortcuts-modal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shortcuts-header">
              <h2 className="shortcuts-title">Keyboard Shortcuts</h2>
              <button onClick={onClose} className="shortcuts-close">
                <X size={20} />
              </button>
            </div>

            <div className="shortcuts-content">
              {shortcuts.map((category, categoryIndex) => (
                <div key={categoryIndex} className="shortcuts-category">
                  <h3 className="category-title">{category.title}</h3>
                  <div className="shortcuts-grid">
                    {category.shortcuts.map((shortcut, shortcutIndex) => (
                      <div key={shortcutIndex} className="shortcut-row">
                        <div className="shortcut-keys">
                          {shortcut.keys.map((key, keyIndex) => (
                            <span key={keyIndex}>
                              <kbd className="key">{key}</kbd>
                              {keyIndex < shortcut.keys.length - 1 && (
                                <span className="key-separator">+</span>
                              )}
                            </span>
                          ))}
                        </div>
                        <div className="shortcut-description">
                          {shortcut.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="shortcuts-footer">
              <p className="shortcuts-note">
                Press <kbd className="key">?</kbd> anytime to show this dialog
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
