import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://whiwgzoariryhpeqbgzk.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.argv[2] || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Usage: node scripts/smart-recovery.js YOUR_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Smart rules for inferring original sections based on task properties
function inferOriginalSection(task, sections) {
  const taskName = task.name.toLowerCase();

  // Find main sections
  const mainSections = sections.filter(s => s.context === 'main' || !s.context);

  // Priority-based section inference
  if (task.importance === 'very_important') {
    const highPriority = mainSections.find(s => s.name.toLowerCase().includes('high priority'));
    if (highPriority) return highPriority.id;
  }

  if (task.importance === 'important') {
    const medPriority = mainSections.find(s => s.name.toLowerCase().includes('medium priority'));
    if (medPriority) return medPriority.id;
  }

  if (task.importance === 'normal') {
    const lowPriority = mainSections.find(s => s.name.toLowerCase().includes('low priority'));
    if (lowPriority) return lowPriority.id;
  }

  // Due date based inference
  if (task.due_date) {
    const dueDate = new Date(task.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    // Due today or overdue -> Must Finish Today
    if (diffDays <= 1) {
      const mustFinish = mainSections.find(s => s.name.toLowerCase().includes('must finish today'));
      if (mustFinish) return mustFinish.id;
    }

    // Due in 2-3 days -> Work on Today
    if (diffDays <= 3) {
      const workOn = mainSections.find(s => s.name.toLowerCase().includes('work on today'));
      if (workOn) return workOn.id;
    }

    // Due within a week -> High Priority
    if (diffDays <= 7) {
      const highPriority = mainSections.find(s => s.name.toLowerCase().includes('high priority'));
      if (highPriority) return highPriority.id;
    }
  }

  // Urgent tasks
  if (task.urgent) {
    const urgentSection = mainSections.find(s =>
      s.name.toLowerCase().includes('urgent') ||
      s.name.toLowerCase().includes('must finish')
    );
    if (urgentSection) return urgentSection.id;
  }

  // Project-based tasks -> might belong in specific sections
  if (task.project_id) {
    // Tasks with projects might be in "Focus" or general sections
    const focusSection = mainSections.find(s => s.name.toLowerCase().includes('focus'));
    if (focusSection) return focusSection.id;
  }

  // Default: To Sort or first main section
  const toSort = mainSections.find(s => s.name.toLowerCase().includes('to sort'));
  if (toSort) return toSort.id;

  return mainSections[0]?.id || null;
}

async function smartRecovery() {
  console.log('🔮 Starting Smart Recovery...\n');
  console.log('This will attempt to restore tasks to their original sections based on:');
  console.log('  - Task importance (priority)');
  console.log('  - Due dates');
  console.log('  - Urgent flags');
  console.log('  - Project assignments\n');

  // Get all sections
  const { data: sections } = await supabase
    .from('sections')
    .select('id, name, context, position')
    .order('position');

  const shoppingSections = sections.filter(s => s.context === 'shopping');
  const shoppingSectionIds = shoppingSections.map(s => s.id);

  // Get all tasks currently in shopping sections
  const { data: tasksToRecover } = await supabase
    .from('tasks')
    .select('*')
    .in('section_id', shoppingSectionIds)
    .eq('archived', false);

  if (!tasksToRecover || tasksToRecover.length === 0) {
    console.log('✓ No tasks found in shopping sections. Recovery not needed!');
    return;
  }

  console.log(`Found ${tasksToRecover.length} tasks to recover\n`);

  // Show preview of what will happen
  console.log('📋 Preview of recovery plan:\n');

  const recoveryPlan = [];
  const sectionCounts = {};

  for (const task of tasksToRecover) {
    const targetSectionId = inferOriginalSection(task, sections);
    const targetSection = sections.find(s => s.id === targetSectionId);

    if (!targetSection) continue;

    recoveryPlan.push({
      taskId: task.id,
      taskName: task.name,
      targetSectionId,
      targetSectionName: targetSection.name
    });

    sectionCounts[targetSection.name] = (sectionCounts[targetSection.name] || 0) + 1;
  }

  // Show distribution
  console.log('Distribution of tasks to be recovered:\n');
  for (const [sectionName, count] of Object.entries(sectionCounts)) {
    console.log(`  ${sectionName}: ${count} tasks`);
  }

  console.log('\n📝 Sample tasks (first 15):\n');
  recoveryPlan.slice(0, 15).forEach(p => {
    console.log(`  "${p.taskName}" → ${p.targetSectionName}`);
  });

  if (recoveryPlan.length > 15) {
    console.log(`  ... and ${recoveryPlan.length - 15} more`);
  }

  console.log('\n⚠️  WARNING: This is an intelligent guess based on task properties.');
  console.log('It may not be 100% accurate, but should be close.\n');

  console.log('Proceeding with recovery in 3 seconds...');
  console.log('Press Ctrl+C to cancel\n');

  await new Promise(resolve => setTimeout(resolve, 3000));

  // Execute recovery
  console.log('🔄 Executing recovery...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const plan of recoveryPlan) {
    const { error } = await supabase
      .from('tasks')
      .update({ section_id: plan.targetSectionId })
      .eq('id', plan.taskId);

    if (error) {
      console.error(`❌ Failed to move "${plan.taskName}":`, error.message);
      errorCount++;
    } else {
      successCount++;
    }
  }

  console.log(`\n✅ Recovery complete!`);
  console.log(`   ✓ ${successCount} tasks recovered`);
  if (errorCount > 0) {
    console.log(`   ❌ ${errorCount} tasks failed`);
  }

  console.log('\n💡 Next steps:');
  console.log('  1. Review your task lists in the app');
  console.log('  2. Manually adjust any tasks that are in the wrong section');
  console.log('  3. Shopping sections are now empty and ready for actual shopping items');
}

smartRecovery()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Error:', err);
    process.exit(1);
  });
