import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://whiwgzoariryhpeqbgzk.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.argv[2] || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Usage: node scripts/restore-from-screenshots.js YOUR_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Exact task mappings from screenshots
const taskMappings = {
  'Work On Today': [
    'Subaru registration',
    'IDonation appointment - Seattle? Lisbon?',
    'Take LW to pool',
    'Trusted Housesitters',
    'Email Katrina',
    'add shira to healthcare',
    'Set up Healthcare',
    'Airbnb extra day',
    '**WILLS**',
  ],

  'High Priority': [
    'Message monisha and Nolan',
    'Progress outline',
    'Check if odoco closed',
    'Call chase',
    'Dresser and Bookshelf anchors',
    '**plan east coast time',
    'Improve my website',
    'Applet that shows local respiratory sickness rates',
    'Set up new to do list app',
    'Print photos or book',
    'AK summer house?',
    'Automate bathroom fan',
    'Set up API billing',
    'Renew Global entry',
    'Schedule appointment at arete',
    'Subaru quote',
    'Move all recurring payments to new card',
    'Cancel other alaska card',
    'Board for queen mattress',
    'Add pass through fans in bedrooms?',
    'FSA (health and childcare)',
    'Ask futon shop for eta',
    'Anchorage yoga',
    'Bed frame - LLM or local carpenter vs',
    'Move money to Shira\'s account',
    'Post mattress on marketplace',
    '*wills',
  ],

  'Medium Priority': [
    'Cancel northrim statements',
    'Potassium permanganate filters',
    'add JT to CRM',
    'Email friends about New York',
    'Respond to Seth',
    'Set up llm tools to find ideal home and cabin. And Auto monitor.',
    'Thule riser',
    'Print photos',
    'Lithuanian passport',
    'Window wrap',
    'Cabin purchase',
    'Better kitchen range hood',
    'Caleb refund',
    'Schedule photographer 9072448410',
    'Library card',
    'Haters bill',
    'Salmonfest',
    'Activated carbon',
    'Move 401go to vanguard',
    'dog vaccine appointments',
  ],

  'Low priority': [
    'Car registration',
    'Hot water dispenser',
    'Vanguard charitable',
  ],
};

// Shopping items to move to shopping list (categorized)
const shoppingItems = {
  'Produce': [],
  'Bakery': [],
  'Deli & Prepared Foods': [],
  'Meat & Seafood': [],
  'Dairy & Eggs': [],
  'Frozen Foods': [],
  'Pantry & Canned Goods': [],
  'Snacks & Chips': [],
  'Beverages': [],
  'Condiments & Sauces': [],
  'Baking & Cooking': [],
  'Cereal & Breakfast': [],
  'Health & Beauty': [],
  'Household & Cleaning': [],
  'Pet Supplies': [],
};

function normalizeTaskName(name) {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

function findMatchingSection(taskName, taskMappings) {
  const normalized = normalizeTaskName(taskName);

  for (const [sectionName, tasks] of Object.entries(taskMappings)) {
    for (const mappedTask of tasks) {
      if (normalizeTaskName(mappedTask) === normalized) {
        return sectionName;
      }
    }
  }

  return null;
}

async function restoreFromScreenshots() {
  console.log('📸 Restoring tasks from screenshots...\n');

  // Get all sections
  const { data: sections } = await supabase
    .from('sections')
    .select('id, name, context')
    .order('position');

  if (!sections) {
    console.error('❌ Failed to fetch sections');
    return;
  }

  console.log(`Found ${sections.length} sections\n`);

  // Create section name to ID map
  const sectionMap = new Map();
  sections.forEach(s => {
    const nameLower = s.name.toLowerCase();
    sectionMap.set(nameLower, s.id);
  });

  // Get all active tasks
  const { data: allTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('archived', false);

  if (!allTasks || allTasks.length === 0) {
    console.log('✓ No tasks found');
    return;
  }

  console.log(`Found ${allTasks.length} tasks to organize\n`);

  // Categorize tasks
  const moves = [];
  const unmappedTasks = [];

  for (const task of allTasks) {
    const targetSectionName = findMatchingSection(task.name, taskMappings);

    if (targetSectionName) {
      const targetSectionId = sectionMap.get(targetSectionName.toLowerCase());
      if (targetSectionId) {
        moves.push({
          taskId: task.id,
          taskName: task.name,
          targetSectionName,
          targetSectionId,
        });
      } else {
        console.log(`⚠️  Section not found: "${targetSectionName}"`);
        unmappedTasks.push(task.name);
      }
    } else {
      unmappedTasks.push(task.name);
    }
  }

  // Show summary
  console.log('📊 Recovery Plan:\n');

  const sectionCounts = {};
  moves.forEach(m => {
    sectionCounts[m.targetSectionName] = (sectionCounts[m.targetSectionName] || 0) + 1;
  });

  console.log('Tasks to be moved:');
  for (const [sectionName, count] of Object.entries(sectionCounts)) {
    console.log(`  ${sectionName}: ${count} tasks`);
  }

  console.log(`\nUnmapped tasks (will stay in current section): ${unmappedTasks.length}`);
  if (unmappedTasks.length > 0) {
    console.log('\nUnmapped tasks (first 20):');
    unmappedTasks.slice(0, 20).forEach(name => {
      console.log(`  - ${name}`);
    });
    if (unmappedTasks.length > 20) {
      console.log(`  ... and ${unmappedTasks.length - 20} more`);
    }
  }

  console.log('\n📝 Sample moves (first 20):\n');
  moves.slice(0, 20).forEach(m => {
    console.log(`  "${m.taskName}" → ${m.targetSectionName}`);
  });
  if (moves.length > 20) {
    console.log(`  ... and ${moves.length - 20} more`);
  }

  console.log('\n⚠️  Proceeding in 3 seconds...');
  console.log('Press Ctrl+C to cancel\n');

  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('🔄 Executing moves...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const move of moves) {
    const { error } = await supabase
      .from('tasks')
      .update({ section_id: move.targetSectionId })
      .eq('id', move.taskId);

    if (error) {
      console.error(`❌ Failed to move "${move.taskName}":`, error.message);
      errorCount++;
    } else {
      successCount++;
    }
  }

  console.log(`\n✅ Restore Complete!`);
  console.log(`   ✓ ${successCount} tasks moved to original sections`);
  console.log(`   ⚠️  ${unmappedTasks.length} tasks not in screenshots (left in place)`);
  if (errorCount > 0) {
    console.log(`   ❌ ${errorCount} errors`);
  }

  // Show final distribution
  console.log('\n📊 Final Main Sections Distribution:\n');
  const mainSections = sections.filter(s => s.context === 'main' || !s.context);
  for (const section of mainSections) {
    const { count } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('section_id', section.id)
      .eq('archived', false);

    if (count > 0) {
      console.log(`   ${section.name}: ${count} tasks`);
    }
  }

  console.log('\n💡 Next steps:');
  console.log('  1. Refresh your app to see the restored organization');
  console.log('  2. Any unmapped tasks are likely shopping items or new tasks');
  console.log('  3. Run move-to-shopping.js to organize shopping items if needed');
}

restoreFromScreenshots()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Error:', err);
    process.exit(1);
  });
