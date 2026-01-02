import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://whiwgzoariryhpeqbgzk.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.argv[2] || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Usage: node scripts/full-recovery.js YOUR_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Shopping item keywords (same as organize script)
const shoppingKeywords = [
  // Produce
  'apple', 'banana', 'orange', 'grape', 'berry', 'strawberry', 'blueberry',
  'lettuce', 'spinach', 'kale', 'tomato', 'cucumber', 'carrot', 'celery',
  'pepper', 'onion', 'garlic', 'potato', 'broccoli', 'cauliflower',
  // Bakery
  'bread', 'bagel', 'muffin', 'donut', 'croissant', 'cake', 'pie',
  // Meat & Seafood
  'chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp', 'steak',
  // Dairy
  'milk', 'cheese', 'yogurt', 'butter', 'eggs', 'cream',
  // Frozen
  'frozen', 'ice cream',
  // Pantry
  'pasta', 'rice', 'beans', 'canned', 'soup',
  // Snacks
  'chips', 'crackers', 'cookies', 'candy', 'chocolate',
  // Beverages
  'water', 'juice', 'soda', 'coffee', 'tea', 'beer', 'wine',
  // Condiments
  'ketchup', 'mustard', 'mayo', 'sauce', 'dressing',
  // Baking
  'flour', 'sugar', 'oil', 'baking',
  // Cereal
  'cereal', 'oatmeal', 'granola',
  // Health & Beauty
  'shampoo', 'soap', 'toothpaste', 'deodorant', 'lotion',
  // Household
  'detergent', 'paper towel', 'toilet paper', 'cleaner',
  // Pet
  'dog food', 'cat food', 'cat litter', 'pet'
];

// Categorization for shopping items
const categoryMappings = {
  'Produce': ['apple', 'banana', 'orange', 'grape', 'berry', 'strawberry', 'blueberry', 'raspberry',
    'lettuce', 'spinach', 'kale', 'arugula', 'cabbage', 'broccoli', 'cauliflower', 'carrot', 'celery',
    'pepper', 'onion', 'garlic', 'potato', 'tomato', 'cucumber', 'avocado', 'mushroom', 'zucchini',
    'herbs', 'cilantro', 'parsley', 'basil', 'salad', 'greens', 'vegetables', 'fruits', 'fresh'],

  'Bakery': ['bread', 'bagel', 'baguette', 'roll', 'croissant', 'muffin', 'donut', 'cake', 'pie',
    'cookie', 'brownie', 'pastry', 'tortilla', 'pita'],

  'Deli & Prepared Foods': ['deli', 'ham', 'turkey', 'salami', 'bologna', 'rotisserie',
    'prepared', 'sushi', 'hummus', 'guacamole', 'salsa'],

  'Meat & Seafood': ['chicken', 'beef', 'pork', 'lamb', 'steak', 'ground beef', 'sausage',
    'bacon', 'ribs', 'fish', 'salmon', 'tuna', 'shrimp', 'crab', 'seafood', 'meat', 'poultry'],

  'Dairy & Eggs': ['milk', 'cream', 'butter', 'cheese', 'cheddar', 'mozzarella', 'yogurt',
    'eggs', 'sour cream'],

  'Frozen Foods': ['frozen', 'ice cream', 'popsicle', 'frozen pizza', 'frozen dinner',
    'frozen vegetable', 'frozen meal'],

  'Pantry & Canned Goods': ['pasta', 'spaghetti', 'noodle', 'rice', 'quinoa', 'canned',
    'beans', 'soup', 'broth', 'stock', 'tomato sauce', 'peanut butter', 'jam', 'jelly'],

  'Snacks & Chips': ['chips', 'crackers', 'pretzels', 'popcorn', 'nuts', 'candy',
    'chocolate', 'snack', 'granola bar'],

  'Beverages': ['water', 'soda', 'juice', 'lemonade', 'tea', 'coffee', 'beer', 'wine',
    'drink', 'gatorade'],

  'Condiments & Sauces': ['ketchup', 'mustard', 'mayo', 'mayonnaise', 'bbq sauce',
    'hot sauce', 'soy sauce', 'ranch', 'dressing', 'vinegar'],

  'Baking & Cooking': ['flour', 'sugar', 'baking soda', 'baking powder', 'yeast',
    'vanilla', 'oil', 'olive oil', 'vegetable oil', 'spice', 'salt', 'pepper'],

  'Cereal & Breakfast': ['cereal', 'oatmeal', 'granola', 'pancake mix', 'syrup', 'breakfast'],

  'Health & Beauty': ['shampoo', 'conditioner', 'soap', 'lotion', 'toothpaste', 'toothbrush',
    'deodorant', 'razor', 'shaving cream', 'vitamin', 'medicine', 'bandage'],

  'Household & Cleaning': ['detergent', 'bleach', 'dish soap', 'paper towel', 'napkin',
    'cleaning', 'disinfectant', 'windex', 'lysol', 'garbage bag', 'trash bag', 'aluminum foil'],

  'Pet Supplies': ['dog food', 'cat food', 'pet food', 'dog treat', 'cat treat', 'litter',
    'cat litter', 'poop bag', 'pet']
};

function isShoppingItem(itemName) {
  const lowerName = itemName.toLowerCase();
  return shoppingKeywords.some(keyword => lowerName.includes(keyword));
}

function categorizeShoppingItem(itemName) {
  const lowerName = itemName.toLowerCase();

  for (const [category, keywords] of Object.entries(categoryMappings)) {
    for (const keyword of keywords) {
      if (lowerName.includes(keyword)) {
        return category;
      }
    }
  }

  return 'Pantry & Canned Goods'; // Default
}

function inferMainSection(task, sections) {
  const mainSections = sections.filter(s => s.context === 'main' || !s.context);

  // Priority-based inference
  if (task.importance === 'very_important') {
    const section = mainSections.find(s => s.name.toLowerCase().includes('high priority'));
    if (section) return section.id;
  }

  if (task.importance === 'important') {
    const section = mainSections.find(s => s.name.toLowerCase().includes('medium priority'));
    if (section) return section.id;
  }

  if (task.importance === 'normal') {
    const section = mainSections.find(s => s.name.toLowerCase().includes('low priority'));
    if (section) return section.id;
  }

  // Due date based inference
  if (task.due_date) {
    const dueDate = new Date(task.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      const section = mainSections.find(s => s.name.toLowerCase().includes('must finish today'));
      if (section) return section.id;
    }

    if (diffDays <= 2) {
      const section = mainSections.find(s => s.name.toLowerCase().includes('work on today'));
      if (section) return section.id;
    }

    if (diffDays <= 7) {
      const section = mainSections.find(s => s.name.toLowerCase().includes('high priority'));
      if (section) return section.id;
    }
  }

  // Urgent tasks
  if (task.urgent) {
    const section = mainSections.find(s => s.name.toLowerCase().includes('must finish today'));
    if (section) return section.id;
  }

  // Default: To Sort
  const toSort = mainSections.find(s => s.name.toLowerCase().includes('to sort'));
  if (toSort) return toSort.id;

  return mainSections[0]?.id;
}

async function fullRecovery() {
  console.log('🔧 Starting Full Recovery...\n');
  console.log('This will:');
  console.log('  1. Identify shopping items by name keywords');
  console.log('  2. Move shopping items to appropriate shopping sections');
  console.log('  3. Move non-shopping items to appropriate main sections\n');

  // Get all sections
  const { data: sections } = await supabase
    .from('sections')
    .select('id, name, context, position')
    .order('position');

  const shoppingSections = sections.filter(s => s.context === 'shopping');
  const mainSections = sections.filter(s => s.context === 'main' || !s.context);

  console.log(`Found ${shoppingSections.length} shopping sections`);
  console.log(`Found ${mainSections.length} main sections\n`);

  // Create section maps
  const shoppingSectionMap = new Map();
  shoppingSections.forEach(s => shoppingSectionMap.set(s.name, s.id));

  // Get ALL active tasks
  const { data: allTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('archived', false);

  console.log(`Found ${allTasks.length} total active tasks\n`);

  // Categorize tasks
  const shoppingItems = [];
  const regularTasks = [];

  for (const task of allTasks) {
    if (isShoppingItem(task.name)) {
      shoppingItems.push(task);
    } else {
      regularTasks.push(task);
    }
  }

  console.log(`📊 Categorization:`);
  console.log(`   Shopping items: ${shoppingItems.length}`);
  console.log(`   Regular tasks: ${regularTasks.length}\n`);

  // Show samples
  console.log(`🛒 Shopping items (first 10):`);
  shoppingItems.slice(0, 10).forEach(item => {
    const category = categorizeShoppingItem(item.name);
    console.log(`   "${item.name}" → ${category}`);
  });
  if (shoppingItems.length > 10) {
    console.log(`   ... and ${shoppingItems.length - 10} more`);
  }

  console.log(`\n📋 Regular tasks (first 10):`);
  regularTasks.slice(0, 10).forEach(task => {
    const targetSection = sections.find(s => s.id === inferMainSection(task, sections));
    console.log(`   "${task.name}" → ${targetSection?.name || 'Unknown'}`);
  });
  if (regularTasks.length > 10) {
    console.log(`   ... and ${regularTasks.length - 10} more`);
  }

  console.log('\n⚠️  Proceeding in 3 seconds...');
  console.log('Press Ctrl+C to cancel\n');

  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('🔄 Executing recovery...\n');

  let shoppingSuccess = 0;
  let regularSuccess = 0;
  let errors = 0;

  // Move shopping items
  console.log('Moving shopping items...');
  for (const item of shoppingItems) {
    const category = categorizeShoppingItem(item.name);
    const targetSectionId = shoppingSectionMap.get(category);

    if (!targetSectionId) {
      console.log(`⚠️  No section found for category: ${category}`);
      continue;
    }

    const { error } = await supabase
      .from('tasks')
      .update({ section_id: targetSectionId })
      .eq('id', item.id);

    if (error) {
      console.error(`❌ Failed to move "${item.name}":`, error.message);
      errors++;
    } else {
      shoppingSuccess++;
    }
  }

  // Move regular tasks
  console.log('Moving regular tasks...');
  for (const task of regularTasks) {
    const targetSectionId = inferMainSection(task, sections);

    if (!targetSectionId) {
      console.log(`⚠️  No target section for: ${task.name}`);
      continue;
    }

    const { error } = await supabase
      .from('tasks')
      .update({ section_id: targetSectionId })
      .eq('id', task.id);

    if (error) {
      console.error(`❌ Failed to move "${task.name}":`, error.message);
      errors++;
    } else {
      regularSuccess++;
    }
  }

  console.log(`\n✅ Recovery Complete!`);
  console.log(`   🛒 ${shoppingSuccess} shopping items moved to shopping sections`);
  console.log(`   📋 ${regularSuccess} regular tasks moved to main sections`);
  if (errors > 0) {
    console.log(`   ❌ ${errors} errors`);
  }

  // Show final distribution
  console.log('\n📊 Final Distribution:\n');

  console.log('Shopping Sections:');
  for (const section of shoppingSections) {
    const { count } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('section_id', section.id)
      .eq('archived', false);

    if (count > 0) {
      console.log(`   ${section.name}: ${count} items`);
    }
  }

  console.log('\nMain Sections:');
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
  console.log('  1. Check your app - shopping list and main tasks should be separated');
  console.log('  2. Manually adjust any items that are miscategorized');
  console.log('  3. Your task organization should now be mostly restored!');
}

fullRecovery()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Error:', err);
    process.exit(1);
  });
