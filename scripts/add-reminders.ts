import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://whiwgzoariryhpeqbgzk.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoaXdnem9hcmlyeWhwZXFiZ3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzMjk1NDQsImV4cCI6MjA1MDkwNTU0NH0.RGsMHANIby7vzVSg6qv6Sw_jaMD8JgCXIaTU6hbxFNs';

const supabase = createClient(supabaseUrl, supabaseKey);

const reminders = [
  "Work on in our relationship: What can I do to be a better partner to Gh?",
  "Say something nice about D today. About the pregnancy.",
  "Do the hardest thing first in the morning",
  "Meditate 15 minutes",
  "Write",
  "Yoga",
  "Lift (to prevent injury and be able to age well)",
  "Music (Guitar exercises, songs, Bach cello suites)",
  "Core exercises",
  "What would I do if I only had 5 years left? What seeds would I plant if I knew I'd love to 100?",
  "Read chapters and articles without touching phone",
  "What am I learning right now? Beginners mind.",
  "Short walk outside morning and evening",
  "I should be spending 90% of my time on projects I really care about. Wind down time on things like the house.",
  "Do the things I care about for 20 minutes every day. Reading, writing, lifting, basketball, stretching/yoga",
  "What is the most important thing to do today?",
  "Date nights, weekends away, check ins, gratitudes",
  "Ask weekly what is a hard thing I'll do"
];

async function addReminders() {
  // First, get the current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('Not authenticated. Please log in first.');
    console.error('You need to be logged in to add reminders.');
    return;
  }

  console.log(`Adding ${reminders.length} reminders for user: ${user.email}`);

  const remindersToInsert = reminders.map(name => ({
    name,
    due_date: null,
    completed: false,
    user_id: user.id
  }));

  const { data, error } = await supabase
    .from('reminders')
    .insert(remindersToInsert)
    .select();

  if (error) {
    console.error('Error adding reminders:', error);
  } else {
    console.log(`Successfully added ${data?.length || 0} reminders!`);
  }
}

addReminders();
