import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://whiwgzoariryhpeqbgzk.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.argv[2] || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY not provided\n');
  console.log('Usage:');
  console.log('  node scripts/undo-shopping-organization.js YOUR_SERVICE_ROLE_KEY\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function undoShoppingOrganization() {
  console.log('🔄 Undoing shopping list organization...\n');

  // Get all shopping sections
  const { data: shoppingSections, error: sectionsError } = await supabase
    .from('sections')
    .select('id, name, context')
    .eq('context', 'shopping');

  if (sectionsError) {
    console.error('❌ Error fetching shopping sections:', sectionsError);
    return;
  }

  if (!shoppingSections || shoppingSections.length === 0) {
    console.log('⚠️  No shopping sections found.');
    return;
  }

  const shoppingSectionIds = shoppingSections.map(s => s.id);
  console.log(`Found ${shoppingSections.length} shopping sections\n`);

  // Get all tasks currently in shopping sections
  const { data: tasksInShopping, error: tasksError } = await supabase
    .from('tasks')
    .select('id, name, section_id')
    .in('section_id', shoppingSectionIds);

  if (tasksError) {
    console.error('❌ Error fetching tasks:', tasksError);
    return;
  }

  console.log(`Found ${tasksInShopping.length} tasks in shopping sections\n`);

  if (tasksInShopping.length === 0) {
    console.log('✓ No tasks to move back. All done!');
    return;
  }

  // Find the main "To Sort" section or create one
  let { data: toSortSection } = await supabase
    .from('sections')
    .select('id, name, context')
    .eq('context', 'main')
    .ilike('name', '%to sort%')
    .single();

  // If no "To Sort" section, get the first main section
  if (!toSortSection) {
    const { data: mainSections } = await supabase
      .from('sections')
      .select('id, name, context')
      .eq('context', 'main')
      .order('position')
      .limit(1);

    if (mainSections && mainSections.length > 0) {
      toSortSection = mainSections[0];
    }
  }

  if (!toSortSection) {
    console.error('❌ No main section found to move tasks to!');
    console.log('Please create a main section first.');
    return;
  }

  console.log(`Moving all tasks to: "${toSortSection.name}"\n`);
  console.log('Tasks being moved:');
  tasksInShopping.slice(0, 20).forEach(t => {
    console.log(`  - ${t.name}`);
  });
  if (tasksInShopping.length > 20) {
    console.log(`  ... and ${tasksInShopping.length - 20} more`);
  }
  console.log('\n');

  // Move all tasks back to the main section
  let successCount = 0;
  let errorCount = 0;

  for (const task of tasksInShopping) {
    const { error } = await supabase
      .from('tasks')
      .update({ section_id: toSortSection.id })
      .eq('id', task.id);

    if (error) {
      console.error(`❌ Failed to move "${task.name}":`, error.message);
      errorCount++;
    } else {
      successCount++;
    }
  }

  console.log(`\n✅ Undo complete!`);
  console.log(`   ✓ ${successCount} tasks moved back to "${toSortSection.name}"`);
  if (errorCount > 0) {
    console.log(`   ❌ ${errorCount} tasks failed to move`);
  }

  console.log('\n📊 Shopping sections are now empty:');
  for (const section of shoppingSections) {
    console.log(`   - ${section.name}: 0 items`);
  }
}

undoShoppingOrganization()
  .then(() => {
    console.log('\n✅ All non-shopping tasks have been restored!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Error:', err);
    process.exit(1);
  });
