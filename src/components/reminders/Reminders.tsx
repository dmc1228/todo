import { useState } from "react";
import { Circle, CheckCircle2, Trash2, Calendar } from "lucide-react";
import { Reminder } from "../../types";
import "./Reminders.css";

interface RemindersProps {
  reminders: Reminder[];
  onCreateReminder: (name: string, dueDate?: string | null) => Promise<Reminder | null>;
  onCompleteReminder: (id: string) => Promise<void>;
  onUpdateReminder: (id: string, updates: Partial<Reminder>) => Promise<void>;
  onDeleteReminder: (id: string) => Promise<void>;
}

export function Reminders({
  reminders,
  onCreateReminder,
  onCompleteReminder,
  onUpdateReminder: _onUpdateReminder,
  onDeleteReminder,
}: RemindersProps) {
  const [newReminderName, setNewReminderName] = useState("");
  const [newReminderDate, setNewReminderDate] = useState("");
  const [completingId, setCompletingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderName.trim()) return;

    await onCreateReminder(newReminderName.trim(), newReminderDate || null);
    setNewReminderName("");
    setNewReminderDate("");
  };

  const handleComplete = async (id: string) => {
    setCompletingId(id);
    setTimeout(async () => {
      await onCompleteReminder(id);
      setCompletingId(null);
    }, 300);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const reminderDate = new Date(dateStr);
    reminderDate.setHours(0, 0, 0, 0);

    if (reminderDate.getTime() === today.getTime()) return "Today";
    if (reminderDate.getTime() === tomorrow.getTime()) return "Tomorrow";
    if (reminderDate < today) return "Overdue";

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getDateClass = (dateStr: string | null) => {
    if (!dateStr) return "";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reminderDate = new Date(dateStr);
    reminderDate.setHours(0, 0, 0, 0);

    if (reminderDate < today) return "overdue";
    if (reminderDate.getTime() === today.getTime()) return "today";
    return "";
  };

  return (
    <div className="reminders-container">
      <form className="reminder-add-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={newReminderName}
          onChange={(e) => setNewReminderName(e.target.value)}
          placeholder="Add a reminder..."
          className="reminder-input"
        />
        <input
          type="date"
          value={newReminderDate}
          onChange={(e) => setNewReminderDate(e.target.value)}
          className="reminder-date-input"
        />
        <button type="submit" className="reminder-add-btn" disabled={!newReminderName.trim()}>
          Add
        </button>
      </form>

      {reminders.length === 0 ? (
        <div className="reminders-empty">
          <Calendar size={48} strokeWidth={1} />
          <p>No reminders yet</p>
          <span>Add a reminder above to get started</span>
        </div>
      ) : (
        <ul className="reminders-list">
          {reminders.map((reminder) => (
            <li
              key={reminder.id}
              className={`reminder-item ${completingId === reminder.id ? "completing" : ""}`}
            >
              <button
                className="reminder-checkbox"
                onClick={() => handleComplete(reminder.id)}
                aria-label="Complete reminder"
              >
                {completingId === reminder.id ? (
                  <CheckCircle2 size={20} className="checkbox-icon checked" />
                ) : (
                  <Circle size={20} className="checkbox-icon" />
                )}
              </button>

              <div className="reminder-content">
                <span className={`reminder-name ${completingId === reminder.id ? "strikethrough" : ""}`}>
                  {reminder.name}
                </span>
                {reminder.due_date && (
                  <span className={`reminder-date ${getDateClass(reminder.due_date)}`}>
                    {formatDate(reminder.due_date)}
                  </span>
                )}
              </div>

              <button
                className="reminder-delete-btn"
                onClick={() => onDeleteReminder(reminder.id)}
                aria-label="Delete reminder"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
