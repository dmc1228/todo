-- Create journal_entries table
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  content TEXT DEFAULT '',
  exercised BOOLEAN DEFAULT FALSE,
  played_music BOOLEAN DEFAULT FALSE,
  read BOOLEAN DEFAULT FALSE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date ON journal_entries(user_id, date);

-- Enable RLS
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own journal entries"
  ON journal_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journal entries"
  ON journal_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal entries"
  ON journal_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own journal entries"
  ON journal_entries FOR DELETE
  USING (auth.uid() = user_id);
