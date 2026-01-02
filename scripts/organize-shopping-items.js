import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass RLS for this admin script
const SUPABASE_URL = 'https://whiwgzoariryhpeqbgzk.supabase.co';

// Get service role key from command line argument or environment variable
// Usage: node organize-shopping-items.js YOUR_SERVICE_ROLE_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.argv[2] || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY not provided\n');
  console.log('Usage:');
  console.log('  node scripts/organize-shopping-items.js YOUR_SERVICE_ROLE_KEY\n');
  console.log('Or set environment variable:');
  console.log('  export SUPABASE_SERVICE_ROLE_KEY="your-key"');
  console.log('  node scripts/organize-shopping-items.js\n');
  console.log('Get your service_role key from:');
  console.log('  Supabase Dashboard → Settings → API → service_role (secret)\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Comprehensive categorization mapping
const categoryMappings = {
  'Produce': [
    'apple', 'banana', 'orange', 'grape', 'berry', 'strawberry', 'blueberry', 'raspberry',
    'melon', 'watermelon', 'cantaloupe', 'pear', 'peach', 'plum', 'cherry', 'kiwi', 'mango',
    'pineapple', 'avocado', 'tomato', 'cucumber', 'lettuce', 'spinach', 'kale', 'arugula',
    'cabbage', 'broccoli', 'cauliflower', 'carrot', 'celery', 'pepper', 'onion', 'garlic',
    'potato', 'sweet potato', 'mushroom', 'zucchini', 'squash', 'eggplant', 'corn',
    'green bean', 'pea', 'asparagus', 'radish', 'beet', 'turnip', 'parsnip', 'leek',
    'herbs', 'cilantro', 'parsley', 'basil', 'mint', 'rosemary', 'thyme', 'dill',
    'salad', 'greens', 'vegetables', 'fruits', 'fresh'
  ],

  'Bakery': [
    'bread', 'bagel', 'baguette', 'roll', 'croissant', 'muffin', 'donut', 'danish',
    'cake', 'pie', 'cookie', 'brownie', 'pastry', 'scone', 'biscuit', 'tortilla',
    'pita', 'naan', 'sourdough', 'wheat bread', 'white bread', 'rye bread',
    'english muffin', 'hamburger bun', 'hot dog bun', 'pretzel'
  ],

  'Deli & Prepared Foods': [
    'deli', 'ham', 'turkey', 'salami', 'bologna', 'pastrami', 'roast beef',
    'prosciutto', 'pepperoni', 'chorizo', 'rotisserie', 'prepared', 'ready',
    'cooked chicken', 'sandwich meat', 'lunch meat', 'cold cut', 'sushi',
    'hummus', 'guacamole', 'salsa', 'dip', 'olive'
  ],

  'Meat & Seafood': [
    'chicken', 'beef', 'pork', 'lamb', 'steak', 'ground beef', 'ground turkey',
    'sausage', 'bacon', 'ribs', 'roast', 'chops', 'tenderloin', 'brisket',
    'fish', 'salmon', 'tuna', 'cod', 'tilapia', 'halibut', 'trout', 'mahi',
    'shrimp', 'crab', 'lobster', 'scallop', 'clam', 'mussel', 'oyster',
    'seafood', 'meat', 'poultry', 'wings', 'breast', 'thigh', 'drumstick'
  ],

  'Dairy & Eggs': [
    'milk', 'cream', 'half and half', 'butter', 'margarine', 'cheese', 'cheddar',
    'mozzarella', 'parmesan', 'swiss', 'feta', 'goat cheese', 'cream cheese',
    'cottage cheese', 'ricotta', 'yogurt', 'greek yogurt', 'sour cream',
    'eggs', 'egg whites', 'whipped cream', 'coffee creamer', 'brie', 'blue cheese',
    'provolone', 'monterey jack', 'colby', 'gouda', 'havarti', 'string cheese'
  ],

  'Frozen Foods': [
    'frozen', 'ice cream', 'gelato', 'sorbet', 'popsicle', 'frozen pizza',
    'frozen dinner', 'tv dinner', 'frozen vegetable', 'frozen fruit', 'frozen meal',
    'frozen waffle', 'frozen pancake', 'frozen french fries', 'tater tots',
    'frozen chicken', 'frozen fish', 'frozen shrimp', 'frozen burrito',
    'frozen lasagna', 'hot pocket', 'bagel bite', 'frozen pie', 'cool whip',
    'frozen juice concentrate', 'ice', 'popsicle', 'freezer'
  ],

  'Pantry & Canned Goods': [
    'pasta', 'spaghetti', 'penne', 'macaroni', 'noodle', 'rice', 'quinoa',
    'couscous', 'barley', 'oats', 'canned', 'can of', 'bean', 'black bean',
    'kidney bean', 'chickpea', 'lentil', 'soup', 'broth', 'stock', 'tomato sauce',
    'tomato paste', 'diced tomato', 'crushed tomato', 'corn', 'green bean',
    'pea', 'carrot', 'mixed vegetable', 'tuna', 'salmon', 'sardine',
    'anchovy', 'pickle', 'jam', 'jelly', 'preserves', 'peanut butter',
    'almond butter', 'nutella', 'honey', 'syrup', 'maple syrup', 'molasses',
    'applesauce', 'fruit cup', 'raisin', 'dried fruit', 'canned fruit'
  ],

  'Snacks & Chips': [
    'chip', 'potato chip', 'tortilla chip', 'dorito', 'cheeto', 'pringle',
    'cracker', 'ritz', 'wheat thin', 'triscuit', 'goldfish', 'pretzel',
    'popcorn', 'kettle corn', 'nut', 'peanut', 'almond', 'cashew', 'pistachio',
    'walnut', 'pecan', 'mixed nut', 'trail mix', 'granola bar', 'protein bar',
    'energy bar', 'candy', 'chocolate', 'gummy', 'skittle', 'm&m', 'snickers',
    'reese', 'kit kat', 'twix', 'milky way', 'snack', 'jerky', 'beef jerky'
  ],

  'Beverages': [
    'water', 'sparkling water', 'soda', 'pop', 'cola', 'pepsi', 'coke', 'sprite',
    'juice', 'orange juice', 'apple juice', 'grape juice', 'cranberry juice',
    'lemonade', 'iced tea', 'sweet tea', 'energy drink', 'gatorade', 'powerade',
    'vitaminwater', 'beer', 'wine', 'liquor', 'alcohol', 'champagne', 'vodka',
    'whiskey', 'rum', 'gin', 'tequila', 'coffee', 'tea', 'hot chocolate',
    'drink mix', 'kool aid', 'crystal light', 'kombucha', 'smoothie', 'shake'
  ],

  'Condiments & Sauces': [
    'ketchup', 'mustard', 'mayo', 'mayonnaise', 'relish', 'bbq sauce', 'hot sauce',
    'sriracha', 'tabasco', 'soy sauce', 'teriyaki', 'worcestershire', 'fish sauce',
    'ranch', 'italian dressing', 'caesar dressing', 'vinaigrette', 'salad dressing',
    'vinegar', 'balsamic', 'apple cider vinegar', 'white vinegar', 'red wine vinegar',
    'steak sauce', 'cocktail sauce', 'tartar sauce', 'aioli', 'pesto', 'marinara',
    'alfredo', 'gravy', 'wing sauce', 'buffalo sauce', 'chili sauce', 'hoisin',
    'oyster sauce', 'salsa verde', 'enchilada sauce', 'taco sauce'
  ],

  'Baking & Cooking': [
    'flour', 'all-purpose flour', 'wheat flour', 'bread flour', 'cake flour',
    'sugar', 'brown sugar', 'powdered sugar', 'confectioner', 'granulated sugar',
    'baking soda', 'baking powder', 'yeast', 'cornstarch', 'vanilla extract',
    'almond extract', 'cocoa powder', 'chocolate chip', 'chocolate', 'baking chocolate',
    'oil', 'vegetable oil', 'olive oil', 'coconut oil', 'canola oil', 'cooking spray',
    'shortening', 'salt', 'pepper', 'black pepper', 'spice', 'cinnamon', 'nutmeg',
    'ginger', 'clove', 'allspice', 'paprika', 'cumin', 'oregano', 'basil', 'parsley',
    'chili powder', 'curry powder', 'turmeric', 'cardamom', 'bay leaf', 'seasoning',
    'italian seasoning', 'garlic powder', 'onion powder', 'red pepper flake'
  ],

  'Cereal & Breakfast': [
    'cereal', 'cheerio', 'frosted flake', 'corn flake', 'rice krispy', 'lucky charm',
    'fruit loop', 'cocoa puff', 'captain crunch', 'granola', 'oatmeal', 'instant oatmeal',
    'cream of wheat', 'grits', 'pancake mix', 'waffle mix', 'bisquick', 'pancake syrup',
    'breakfast', 'pop tart', 'toaster strudel', 'jimmy dean', 'breakfast sausage',
    'breakfast sandwich', 'eggo', 'nutri-grain', 'clif bar'
  ],

  'Health & Beauty': [
    'shampoo', 'conditioner', 'body wash', 'soap', 'bar soap', 'hand soap',
    'lotion', 'moisturizer', 'sunscreen', 'deodorant', 'toothpaste', 'toothbrush',
    'mouthwash', 'floss', 'razor', 'shaving cream', 'aftershave', 'cologne',
    'perfume', 'makeup', 'lipstick', 'mascara', 'foundation', 'nail polish',
    'hair gel', 'hair spray', 'mousse', 'face wash', 'face cream', 'vitamin',
    'supplement', 'medicine', 'pain reliever', 'tylenol', 'advil', 'ibuprofen',
    'bandage', 'band-aid', 'first aid', 'cotton swab', 'q-tip', 'tissue',
    'toilet paper', 'feminine hygiene', 'tampon', 'pad', 'baby wipe', 'diaper'
  ],

  'Household & Cleaning': [
    'laundry detergent', 'fabric softener', 'bleach', 'stain remover', 'dryer sheet',
    'dish soap', 'dishwasher detergent', 'dishwasher pod', 'sponge', 'scrubber',
    'paper towel', 'napkin', 'cleaning spray', 'disinfectant', 'windex', 'lysol',
    'clorox', 'bathroom cleaner', 'toilet cleaner', 'floor cleaner', 'mop', 'broom',
    'vacuum bag', 'air freshener', 'candle', 'light bulb', 'battery', 'batteries',
    'aluminum foil', 'plastic wrap', 'saran wrap', 'ziploc', 'storage bag',
    'garbage bag', 'trash bag', 'paper bag', 'plastic bag', 'sandwich bag'
  ],

  'Pet Supplies': [
    'dog food', 'cat food', 'pet food', 'dog treat', 'cat treat', 'pet treat',
    'dog toy', 'cat toy', 'pet toy', 'litter', 'cat litter', 'kitty litter',
    'poop bag', 'leash', 'collar', 'pet bed', 'pet bowl', 'bird seed',
    'fish food', 'aquarium', 'pet shampoo', 'flea treatment', 'tick treatment'
  ]
};

// Function to categorize an item based on its name
function categorizeItem(itemName) {
  const lowerName = itemName.toLowerCase();

  // Check each category
  for (const [category, keywords] of Object.entries(categoryMappings)) {
    for (const keyword of keywords) {
      if (lowerName.includes(keyword)) {
        return category;
      }
    }
  }

  // Default to Pantry & Canned Goods if no match found
  return 'Pantry & Canned Goods';
}

async function organizeShoppingItems() {
  console.log('🛒 Starting shopping list organization...\n');

  // Get all shopping sections
  const { data: sections, error: sectionsError } = await supabase
    .from('sections')
    .select('id, name, context')
    .eq('context', 'shopping');

  if (sectionsError) {
    console.error('❌ Error fetching sections:', sectionsError);
    return;
  }

  if (!sections || sections.length === 0) {
    console.log('⚠️  No shopping sections found. Please create them first.');
    return;
  }

  console.log(`✓ Found ${sections.length} shopping sections\n`);

  // Create a map of section names to IDs
  const sectionMap = new Map();
  sections.forEach(s => sectionMap.set(s.name, s.id));

  // Get section IDs for shopping context
  const shoppingSectionIds = sections.map(s => s.id);

  // ONLY get tasks that are already in shopping sections
  const { data: allTasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, name, section_id, archived')
    .in('section_id', shoppingSectionIds)
    .order('name');

  if (tasksError) {
    console.error('❌ Error fetching tasks:', tasksError);
    return;
  }

  console.log(`📋 Found ${allTasks.length} tasks in shopping sections\n`);
  console.log('🔍 Categorizing items...\n');

  const updates = [];
  const categoryCounts = {};

  // Initialize category counts
  sections.forEach(s => categoryCounts[s.name] = 0);

  // Categorize each task
  for (const task of allTasks) {
    const category = categorizeItem(task.name);
    const targetSectionId = sectionMap.get(category);

    if (!targetSectionId) {
      console.log(`⚠️  No section found for category: ${category}`);
      continue;
    }

    // Only update if it's moving to a different section
    if (task.section_id !== targetSectionId) {
      updates.push({
        id: task.id,
        name: task.name,
        oldSectionId: task.section_id,
        newSectionId: targetSectionId,
        category: category
      });

      categoryCounts[category]++;
    }
  }

  console.log(`📊 Found ${updates.length} items to reorganize:\n`);

  // Show summary by category
  for (const [category, count] of Object.entries(categoryCounts)) {
    if (count > 0) {
      console.log(`   ${category}: ${count} items`);
    }
  }

  console.log('\n');

  if (updates.length === 0) {
    console.log('✓ All items are already in the correct categories!');
    return;
  }

  // Show first 20 items being moved
  console.log('📦 Sample of items being moved:\n');
  updates.slice(0, 20).forEach(u => {
    console.log(`   "${u.name}" → ${u.category}`);
  });

  if (updates.length > 20) {
    console.log(`   ... and ${updates.length - 20} more\n`);
  }

  console.log('\n🔄 Applying updates...\n');

  // Update tasks in batches
  let successCount = 0;
  let errorCount = 0;

  for (const update of updates) {
    const { error } = await supabase
      .from('tasks')
      .update({ section_id: update.newSectionId })
      .eq('id', update.id);

    if (error) {
      console.error(`❌ Failed to update "${update.name}":`, error.message);
      errorCount++;
    } else {
      successCount++;
    }
  }

  console.log(`\n✨ Organization complete!`);
  console.log(`   ✓ ${successCount} items successfully categorized`);
  if (errorCount > 0) {
    console.log(`   ❌ ${errorCount} items failed to update`);
  }

  // Show final distribution
  console.log('\n📊 Final distribution:\n');

  for (const section of sections) {
    const { count } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('section_id', section.id)
      .eq('archived', false);

    if (count > 0) {
      console.log(`   ${section.name}: ${count} items`);
    }
  }
}

// Run the script
organizeShoppingItems()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Error:', err);
    process.exit(1);
  });
