const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://whiwgzoariryhpeqbgzk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoaXdnem9hcmlyeWhwZXFiZ3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzMjk1NDQsImV4cCI6MjA1MDkwNTU0NH0.RGsMHANIby7vzVSg6qv6Sw_jaMD8JgCXIaTU6hbxFNs';

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
  // You need to provide your user_id here
  // You can find it by logging into your app and checking the browser console
  const USER_ID = process.argv[2];

  if (!USER_ID) {
    console.error('Please provide your user_id as an argument:');
    console.error('node scripts/add-reminders.js YOUR_USER_ID');
    console.error('\nTo find your user_id:');
    console.error('1. Log into your app');
    console.error('2. Open browser console (F12)');
    console.error('3. Run: await supabase.auth.getUser()');
    console.error('4. Copy the "id" field from the response');
    process.exit(1);
  }

  console.log(`Adding ${reminders.length} reminders...`);

  const remindersToInsert = reminders.map(name => ({
    name,
    due_date: null,
    completed: false,
    user_id: USER_ID
  }));

  const { data, error } = await supabase
    .from('reminders')
    .insert(remindersToInsert)
    .select();

  if (error) {
    console.error('Error adding reminders:', error);
  } else {
    console.log(`✓ Successfully added ${data?.length || 0} reminders!`);
  }
}

addReminders();
