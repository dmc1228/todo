import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://whiwgzoariryhpeqbgzk.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.argv[2] || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Usage: node scripts/complete-shopping-items.js YOUR_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function completeShoppingItems() {
  console.log('🛒 Completing all shopping list items...\n');

  // Get all shopping sections
  const { data: sections, error: sectionsError } = await supabase
    .from('sections')
    .select('id, name')
    .eq('context', 'shopping');

  if (sectionsError) {
    console.error('❌ Error fetching sections:', sectionsError.message);
    return;
  }

  if (!sections || sections.length === 0) {
    console.log('No shopping sections found.');
    return;
  }

  console.log(`Found ${sections.length} shopping sections\n`);

  const shoppingSectionIds = sections.map(s => s.id);

  // Get all active (not completed) tasks in shopping sections
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, name, section_id')
    .in('section_id', shoppingSectionIds)
    .eq('archived', false)
    .is('completed_at', null);

  if (tasksError) {
    console.error('❌ Error fetching tasks:', tasksError.message);
    return;
  }

  if (!tasks || tasks.length === 0) {
    console.log('✓ No active items to complete!');
    return;
  }

  console.log(`Found ${tasks.length} items to complete:\n`);
  tasks.forEach((task, i) => {
    const section = sections.find(s => s.id === task.section_id);
    console.log(`  ${i + 1}. ${task.name} (${section?.name || 'Unknown'})`);
  });

  console.log('\n⚠️  Proceeding in 3 seconds...');
  console.log('Press Ctrl+C to cancel\n');

  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('✓ Completing items...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const task of tasks) {
    const { error } = await supabase
      .from('tasks')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', task.id);

    if (error) {
      console.error(`❌ Failed to complete "${task.name}":`, error.message);
      errorCount++;
    } else {
      successCount++;
    }
  }

  console.log(`\n✅ Complete!`);
  console.log(`   ✓ ${successCount} items completed`);
  if (errorCount > 0) {
    console.log(`   ❌ ${errorCount} errors`);
  }

  console.log('\n💡 Refresh your app to see the changes!');
}

completeShoppingItems()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Error:', err);
    process.exit(1);
  });
