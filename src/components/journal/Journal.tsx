import { useState, useEffect, useCallback, useRef } from "react";
import {
  format,
  parseISO,
  subDays,
  addDays,
  isToday,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Music,
  BookOpen,
  TrendingUp,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import "./Journal.css";

interface JournalEntry {
  id: string;
  date: string;
  content: string;
  exercised: boolean;
  played_music: boolean;
  read: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface WeeklyStats {
  exercised: number;
  played_music: number;
  read: number;
}

export function Journal() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(() =>
    format(new Date(), "yyyy-MM-dd"),
  );
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [content, setContent] = useState("");
  const [exercised, setExercised] = useState(false);
  const [playedMusic, setPlayedMusic] = useState(false);
  const [read, setRead] = useState(false);
  const [saving, setSaving] = useState(false);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    exercised: 0,
    played_music: 0,
    read: 0,
  });
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadEntry = useCallback(
    async (date: string) => {
      if (!user) return;

      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", date)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading journal entry:", error);
        return;
      }

      if (data) {
        setEntry(data);
        setContent(data.content || "");
        setExercised(data.exercised || false);
        setPlayedMusic(data.played_music || false);
        setRead(data.read || false);
      } else {
        setEntry(null);
        setContent("");
        setExercised(false);
        setPlayedMusic(false);
        setRead(false);
      }
    },
    [user],
  );

  const loadWeeklyStats = useCallback(async () => {
    if (!user) return;

    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday

    const { data, error } = await supabase
      .from("journal_entries")
      .select("exercised, played_music, read")
      .eq("user_id", user.id)
      .gte("date", format(weekStart, "yyyy-MM-dd"))
      .lte("date", format(weekEnd, "yyyy-MM-dd"));

    if (error) {
      console.error("Error loading weekly stats:", error);
      return;
    }

    if (data) {
      const stats = data.reduce(
        (acc, entry) => ({
          exercised: acc.exercised + (entry.exercised ? 1 : 0),
          played_music: acc.played_music + (entry.played_music ? 1 : 0),
          read: acc.read + (entry.read ? 1 : 0),
        }),
        { exercised: 0, played_music: 0, read: 0 },
      );
      setWeeklyStats(stats);
    }
  }, [user]);

  useEffect(() => {
    loadEntry(currentDate);
    loadWeeklyStats();
  }, [currentDate, loadEntry, loadWeeklyStats]);

  const saveEntry = async () => {
    if (!user) return;

    setSaving(true);
    try {
      if (entry) {
        // Update existing entry
        const { error } = await supabase
          .from("journal_entries")
          .update({
            content,
            exercised,
            played_music: playedMusic,
            read,
            updated_at: new Date().toISOString(),
          })
          .eq("id", entry.id);

        if (error) throw error;
      } else {
        // Create new entry
        const { error } = await supabase.from("journal_entries").insert({
          date: currentDate,
          content,
          exercised,
          played_music: playedMusic,
          read,
          user_id: user.id,
        });

        if (error) throw error;
      }

      await loadEntry(currentDate);
      await loadWeeklyStats();
    } catch (error) {
      console.error("Error saving journal entry:", error);
    } finally {
      setSaving(false);
    }
  };

  // Auto-save functionality
  useEffect(() => {
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save (2 seconds after last change)
    autoSaveTimeoutRef.current = setTimeout(() => {
      if (content || exercised || playedMusic || read) {
        saveEntry();
      }
    }, 2000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [content, exercised, playedMusic, read]);

  const goToPreviousDay = () => {
    const prevDate = subDays(parseISO(currentDate), 1);
    setCurrentDate(format(prevDate, "yyyy-MM-dd"));
  };

  const goToNextDay = () => {
    const nextDate = addDays(parseISO(currentDate), 1);
    setCurrentDate(format(nextDate, "yyyy-MM-dd"));
  };

  const goToToday = () => {
    setCurrentDate(format(new Date(), "yyyy-MM-dd"));
  };

  const handleContentChange = (value: string) => {
    setContent(value);
  };

  const handleHabitToggle = (habit: "exercised" | "playedMusic" | "read") => {
    switch (habit) {
      case "exercised":
        setExercised(!exercised);
        break;
      case "playedMusic":
        setPlayedMusic(!playedMusic);
        break;
      case "read":
        setRead(!read);
        break;
    }
  };

  const displayDate = parseISO(currentDate);
  const isCurrentDayToday = isToday(displayDate);

  return (
    <div className="journal-container">
      <div className="journal-main">
        <div className="journal-header">
          <div className="journal-nav">
            <button className="journal-nav-btn" onClick={goToPreviousDay}>
              <ChevronLeft size={20} />
            </button>
            <div className="journal-date">
              <span className="journal-date-main">
                {format(displayDate, "EEEE, MMMM d, yyyy")}
              </span>
              {isCurrentDayToday && (
                <span className="journal-today-badge">Today</span>
              )}
            </div>
            <button className="journal-nav-btn" onClick={goToNextDay}>
              <ChevronRight size={20} />
            </button>
          </div>
          {!isCurrentDayToday && (
            <button className="journal-today-btn" onClick={goToToday}>
              Go to Today
            </button>
          )}
        </div>

        <div className="journal-habits">
          <h3 className="habits-title">Daily Habits</h3>
          <div className="habits-grid">
            <button
              className={`habit-button ${exercised ? "active" : ""}`}
              onClick={() => handleHabitToggle("exercised")}
            >
              <Dumbbell size={24} />
              <span>Exercise</span>
            </button>
            <button
              className={`habit-button ${playedMusic ? "active" : ""}`}
              onClick={() => handleHabitToggle("playedMusic")}
            >
              <Music size={24} />
              <span>Music</span>
            </button>
            <button
              className={`habit-button ${read ? "active" : ""}`}
              onClick={() => handleHabitToggle("read")}
            >
              <BookOpen size={24} />
              <span>Reading</span>
            </button>
          </div>
        </div>

        <div className="journal-content">
          <h3 className="content-title">Journal Entry</h3>
          <textarea
            className="journal-textarea"
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="What's on your mind today?"
            rows={10}
          />
        </div>

        <div className="journal-footer">
          <div className="journal-save-status">
            {saving ? "Saving..." : "Auto-saved"}
          </div>
        </div>
      </div>

      <div className="journal-stats">
        <div className="stats-header">
          <TrendingUp size={20} />
          <h3>This Week</h3>
        </div>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-icon exercise">
              <Dumbbell size={20} />
            </div>
            <div className="stat-info">
              <div className="stat-label">Exercise</div>
              <div className="stat-value">{weeklyStats.exercised}/7 days</div>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon music">
              <Music size={20} />
            </div>
            <div className="stat-info">
              <div className="stat-label">Music</div>
              <div className="stat-value">
                {weeklyStats.played_music}/7 days
              </div>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon reading">
              <BookOpen size={20} />
            </div>
            <div className="stat-info">
              <div className="stat-label">Reading</div>
              <div className="stat-value">{weeklyStats.read}/7 days</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
