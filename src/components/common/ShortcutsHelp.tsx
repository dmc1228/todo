import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import "./ShortcutsHelp.css";

interface ShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  {
    title: "Global",
    shortcuts: [
      { keys: ["⌘", "N"], description: "Quick add task" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
    ],
  },
  {
    title: "Task Selected",
    shortcuts: [
      { keys: ["⌘", "↵"], description: "Complete task" },
      { keys: ["Space"], description: "Open task detail" },
      { keys: ["↵"], description: "Add task below" },
      { keys: ["⌫"], description: "Delete task" },
      { keys: ["↑", "K"], description: "Select previous task" },
      { keys: ["↓", "J"], description: "Select next task" },
      { keys: ["Esc"], description: "Deselect / Close panel" },
    ],
  },
  {
    title: "Tab Sequences",
    shortcuts: [
      { keys: ["⇥", "Q"], description: "Quick add task" },
      { keys: ["⇥", "N"], description: "New section" },
      { keys: ["⇥", "U"], description: "Move to section" },
      { keys: ["⇥", "↵"], description: "Complete task" },
    ],
  },
  {
    title: "Quick Add Syntax",
    shortcuts: [
      { keys: ["*"], description: "Mark as Important" },
      { keys: ["!"], description: "Mark as Urgent" },
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
              {shortcuts.map((category, i) => (
                <div key={i} className="shortcuts-category">
                  <h3 className="category-title">{category.title}</h3>
                  <div className="shortcuts-grid">
                    {category.shortcuts.map((shortcut, j) => (
                      <div key={j} className="shortcut-row">
                        <div className="shortcut-keys">
                          {shortcut.keys.map((key, k) => (
                            <span key={k}>
                              <kbd className="key">{key}</kbd>
                              {k < shortcut.keys.length - 1 && <span className="key-separator">+</span>}
                            </span>
                          ))}
                        </div>
                        <div className="shortcut-description">{shortcut.description}</div>
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
