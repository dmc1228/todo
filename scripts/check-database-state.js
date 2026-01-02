import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://whiwgzoariryhpeqbgzk.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.argv[2] || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Usage: node scripts/check-database-state.js YOUR_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkDatabaseState() {
  console.log('🔍 Checking current database state...\n');

  // Get all sections
  const { data: sections } = await supabase
    .from('sections')
    .select('id, name, context, position')
    .order('context', { ascending: true })
    .order('position', { ascending: true });

  console.log('📂 All Sections:\n');

  const sectionsByContext = {};
  sections.forEach(s => {
    const ctx = s.context || 'main';
    if (!sectionsByContext[ctx]) sectionsByContext[ctx] = [];
    sectionsByContext[ctx].push(s);
  });

  for (const [context, sects] of Object.entries(sectionsByContext)) {
    console.log(`  ${context.toUpperCase()}:`);
    for (const s of sects) {
      const { count } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('section_id', s.id)
        .eq('archived', false);

      console.log(`    - ${s.name} (${count} tasks)`);
    }
    console.log('');
  }

  // Check for tasks without a valid section
  const validSectionIds = sections.map(s => s.id);
  const { data: orphanedTasks } = await supabase
    .from('tasks')
    .select('id, name, section_id')
    .not('section_id', 'in', `(${validSectionIds.join(',')})`)
    .eq('archived', false);

  if (orphanedTasks && orphanedTasks.length > 0) {
    console.log(`⚠️  Found ${orphanedTasks.length} tasks with invalid section_id`);
  }

  // Show total task distribution
  const { data: allTasks } = await supabase
    .from('tasks')
    .select('id, name, section_id, created_at, updated_at')
    .eq('archived', false)
    .order('created_at', { ascending: false });

  console.log(`\n📊 Total: ${allTasks.length} active tasks\n`);

  // Check if we can infer original sections from task metadata
  console.log('💡 Checking for recovery clues...\n');

  const mainSections = sections.filter(s => s.context === 'main' || !s.context);
  const shoppingSections = sections.filter(s => s.context === 'shopping');

  console.log(`Main sections: ${mainSections.length}`);
  console.log(`Shopping sections: ${shoppingSections.length}`);

  const tasksInShopping = allTasks.filter(t =>
    shoppingSections.find(s => s.id === t.section_id)
  );

  console.log(`\nTasks currently in shopping sections: ${tasksInShopping.length}`);
  console.log(`Tasks in main sections: ${allTasks.length - tasksInShopping.length}`);
}

checkDatabaseState()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
