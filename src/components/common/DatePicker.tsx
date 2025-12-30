import { useState, useEffect, RefObject } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  addWeeks,
} from "date-fns";
import "./DatePicker.css";

interface DatePickerProps {
  selectedDate: Date | null;
  onChange: (date: Date | null) => void;
  onClose: () => void;
  triggerRef: RefObject<HTMLElement>;
}

export function DatePicker({
  selectedDate,
  onChange,
  onClose,
  triggerRef,
}: DatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Calculate position
  useEffect(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const pickerHeight = 400;
    const pickerWidth = 320;

    let top = rect.bottom + 8;
    let left = rect.left;

    // Flip above if not enough space below
    if (window.innerHeight - rect.bottom < pickerHeight) {
      top = rect.top - pickerHeight - 8;
    }

    // Adjust horizontal position if too close to edge
    if (window.innerWidth - rect.left < pickerWidth) {
      left = window.innerWidth - pickerWidth - 16;
    }

    setPosition({ top, left });
  }, [triggerRef]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest(".date-picker") &&
        !target.closest(".date-picker-trigger")
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Enter" && selectedDate) {
        onChange(selectedDate);
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, selectedDate, onChange]);

  const handleQuickSelect = (date: Date | null) => {
    onChange(date);
    onClose();
  };

  const handleDateSelect = (date: Date) => {
    onChange(date);
    onClose();
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const currentDay = day;
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isSelected = selectedDate && isSameDay(day, selectedDate);
        const isTodayDate = isToday(day);

        days.push(
          <button
            key={day.toString()}
            onClick={() => handleDateSelect(currentDay)}
            className={`
              calendar-day
              ${!isCurrentMonth ? "other-month" : ""}
              ${isSelected ? "selected" : ""}
              ${isTodayDate ? "today" : ""}
            `}
          >
            {format(day, "d")}
          </button>,
        );
        day = addDays(day, 1);
      }

      rows.push(
        <div key={day.toString()} className="calendar-week">
          {days}
        </div>,
      );
      days = [];
    }

    return rows;
  };

  const pickerContent = (
    <AnimatePresence>
      <motion.div
        className="date-picker"
        style={{ top: position.top, left: position.left }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
      >
        <div className="date-picker-quick">
          <button
            onClick={() => handleQuickSelect(new Date())}
            className="quick-button"
          >
            Today
          </button>
          <button
            onClick={() => handleQuickSelect(addDays(new Date(), 1))}
            className="quick-button"
          >
            Tomorrow
          </button>
          <button
            onClick={() => handleQuickSelect(addWeeks(new Date(), 1))}
            className="quick-button"
          >
            +1 Week
          </button>
          <button
            onClick={() => handleQuickSelect(null)}
            className="quick-button"
          >
            Clear
          </button>
        </div>

        <div className="calendar-header">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="calendar-nav"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="calendar-month">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="calendar-nav"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="calendar-weekdays">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
            <div key={day} className="weekday">
              {day}
            </div>
          ))}
        </div>

        <div className="calendar-grid">{renderCalendar()}</div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(pickerContent, document.body);
}
