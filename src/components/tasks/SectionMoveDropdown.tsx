import { useEffect, useRef } from "react";
import { Section } from "../../types";
import "./SectionMoveDropdown.css";

interface SectionMoveDropdownProps {
  isOpen: boolean;
  sections: Section[];
  currentSectionId: string | null;
  onSelectSection: (sectionId: string) => void;
  onClose: () => void;
}

export function SectionMoveDropdown({
  isOpen,
  sections,
  currentSectionId,
  onSelectSection,
  onClose,
}: SectionMoveDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="section-move-overlay">
      <div className="section-move-dropdown" ref={dropdownRef}>
        <div className="section-move-header">Move to Section</div>
        <div className="section-move-list">
          {sections.map((section) => (
            <button
              key={section.id}
              className={`section-move-item ${section.id === currentSectionId ? "current" : ""}`}
              onClick={() => {
                if (section.id !== currentSectionId) {
                  onSelectSection(section.id);
                }
                onClose();
              }}
            >
              <span className="section-move-name">{section.name}</span>
              {section.id === currentSectionId && (
                <span className="section-move-current-badge">Current</span>
              )}
            </button>
          ))}
        </div>
        <div className="section-move-footer">
          <span className="section-move-hint">Press Escape to cancel</span>
        </div>
      </div>
    </div>
  );
}
