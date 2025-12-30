import { useState, useRef } from "react";

interface UseDatePickerReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
}

export function useDatePicker(
  initialDate: Date | null = null,
): UseDatePickerReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate);
  const triggerRef = useRef<HTMLElement>(null);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return {
    isOpen,
    open,
    close,
    triggerRef,
    selectedDate,
    setSelectedDate,
  };
}
