import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://whiwgzoariryhpeqbgzk.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.argv[2] || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Usage: node scripts/move-to-shopping.js YOUR_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Shopping item categorization (same as full-recovery.js)
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

async function moveToShopping() {
  console.log('🛒 Moving items from "Must Finish Today" to Shopping List...\n');

  // Get all sections
  const { data: sections } = await supabase
    .from('sections')
    .select('id, name, context')
    .order('position');

  if (!sections) {
    console.error('❌ Failed to fetch sections');
    return;
  }

  // Find "Must Finish Today" section
  const mustFinishSection = sections.find(s =>
    s.name.toLowerCase().includes('must finish today')
  );

  if (!mustFinishSection) {
    console.error('❌ Could not find "Must Finish Today" section');
    return;
  }

  console.log(`Found "Must Finish Today" section: ${mustFinishSection.name}\n`);

  // Get all tasks in "Must Finish Today"
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('section_id', mustFinishSection.id)
    .eq('archived', false);

  if (!tasks || tasks.length === 0) {
    console.log('✓ No tasks found in "Must Finish Today" section');
    return;
  }

  console.log(`Found ${tasks.length} tasks to move\n`);

  // Create shopping section map
  const shoppingSections = sections.filter(s => s.context === 'shopping');
  const shoppingSectionMap = new Map();
  shoppingSections.forEach(s => shoppingSectionMap.set(s.name, s.id));

  console.log(`Found ${shoppingSections.length} shopping sections\n`);

  // Show preview
  console.log('📋 Preview of moves:\n');
  const categoryCounts = {};

  tasks.forEach(task => {
    const category = categorizeShoppingItem(task.name);
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });

  for (const [category, count] of Object.entries(categoryCounts)) {
    console.log(`  ${category}: ${count} items`);
  }

  console.log('\n📝 Sample items (first 20):\n');
  tasks.slice(0, 20).forEach(task => {
    const category = categorizeShoppingItem(task.name);
    console.log(`  "${task.name}" → ${category}`);
  });

  if (tasks.length > 20) {
    console.log(`  ... and ${tasks.length - 20} more`);
  }

  console.log('\n⚠️  Proceeding in 3 seconds...');
  console.log('Press Ctrl+C to cancel\n');

  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('🔄 Moving items...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const task of tasks) {
    const category = categorizeShoppingItem(task.name);
    const targetSectionId = shoppingSectionMap.get(category);

    if (!targetSectionId) {
      console.log(`⚠️  No section found for category: ${category}`);
      errorCount++;
      continue;
    }

    const { error } = await supabase
      .from('tasks')
      .update({ section_id: targetSectionId })
      .eq('id', task.id);

    if (error) {
      console.error(`❌ Failed to move "${task.name}":`, error.message);
      errorCount++;
    } else {
      successCount++;
    }
  }

  console.log(`\n✅ Move Complete!`);
  console.log(`   ✓ ${successCount} items moved to shopping list`);
  if (errorCount > 0) {
    console.log(`   ❌ ${errorCount} errors`);
  }

  // Show final distribution
  console.log('\n📊 Final Shopping List Distribution:\n');
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

  console.log('\n💡 Next step: Check your shopping list in the app!');
}

moveToShopping()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Error:', err);
    process.exit(1);
  });
