
import { Recipe } from '../components/RecipeCard';

export const sampleRecipes: Recipe[] = [
  {
    id: '1',
    title: 'Roasted Vegetable Pasta with Fresh Herbs',
    description: 'A vibrant pasta dish featuring seasonal roasted vegetables and a light herb sauce.',
    imageUrl: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    cookTime: '35 min',
    servings: 4,
    ingredients: [
      '12 oz pasta of choice',
      '2 bell peppers, chopped',
      '1 zucchini, sliced',
      '1 red onion, sliced',
      '3 tbsp olive oil',
      '4 cloves garlic, minced',
      '1/4 cup fresh basil, chopped',
      '2 tbsp fresh parsley, chopped',
      '1/3 cup grated parmesan cheese',
      'Salt and pepper to taste'
    ],
    instructions: [
      'Preheat oven to 425°F (220°C).',
      'Toss chopped vegetables with 2 tbsp olive oil, salt, and pepper. Spread on a baking sheet.',
      'Roast vegetables for 20-25 minutes until tender and slightly charred.',
      'Meanwhile, cook pasta according to package instructions. Reserve 1/2 cup pasta water before draining.',
      'In a large pan, heat remaining olive oil and sauté garlic until fragrant.',
      'Add roasted vegetables, cooked pasta, and a splash of pasta water. Toss to combine.',
      'Mix in fresh herbs and parmesan cheese. Add more pasta water if needed for a silky sauce.',
      'Season with additional salt and pepper to taste. Serve hot with extra parmesan on top.'
    ],
    tags: ['vegetarian', 'pasta', 'quick meal'],
    macros: {
      calories: 450,
      protein: 18,
      carbs: 65,
      fat: 12,
      fiber: 8,
      sugar: 6
    }
  },
  {
    id: '2',
    title: 'Honey Glazed Salmon with Citrus',
    description: 'A perfectly cooked salmon fillet with a sweet honey glaze and bright citrus notes.',
    imageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    cookTime: '25 min',
    servings: 2,
    ingredients: [
      '2 salmon fillets (6oz each)',
      '3 tbsp honey',
      '2 tbsp soy sauce',
      '1 orange, juiced and zested',
      '1 lemon, juiced and zested',
      '2 cloves garlic, minced',
      '1 tbsp olive oil',
      '1 tbsp fresh dill, chopped',
      'Salt and pepper to taste'
    ],
    instructions: [
      'Preheat oven to 375°F (190°C).',
      'In a bowl, whisk together honey, soy sauce, orange juice, lemon juice, garlic, and half the zest.',
      'Pat salmon fillets dry and season with salt and pepper.',
      'Heat olive oil in an oven-safe skillet over medium-high heat.',
      'Sear salmon skin-side down for 3 minutes until crisp.',
      'Pour honey citrus mixture over salmon and transfer skillet to oven.',
      'Bake for 8-10 minutes until salmon is just cooked through.',
      'Garnish with remaining citrus zest and fresh dill before serving.'
    ],
    tags: ['seafood', 'gluten-free', 'high-protein'],
    macros: {
      calories: 380,
      protein: 32,
      carbs: 18,
      fat: 16,
      sugar: 12,
      sodium: 520
    }
  },
  {
    id: '3',
    title: 'Classic Chocolate Soufflé',
    description: 'A decadent, airy chocolate dessert that\'s sure to impress any guest.',
    imageUrl: 'https://images.unsplash.com/photo-1610611424854-5e07032143d8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    cookTime: '45 min',
    servings: 4,
    ingredients: [
      '4 oz high-quality dark chocolate, chopped',
      '3 tbsp unsalted butter, plus extra for ramekins',
      '3 egg yolks, room temperature',
      '4 egg whites, room temperature',
      '1/4 cup granulated sugar, plus extra for ramekins',
      '1/2 tsp vanilla extract',
      'Pinch of salt',
      'Powdered sugar for dusting'
    ],
    instructions: [
      'Preheat oven to 375°F (190°C). Butter four 6-oz ramekins and coat with sugar.',
      'Melt chocolate and butter in a heatproof bowl over simmering water, stirring until smooth.',
      'Remove from heat and whisk in egg yolks and vanilla. Set aside to cool slightly.',
      'In a clean bowl, beat egg whites and salt until foamy. Gradually add sugar and beat until stiff, glossy peaks form.',
      'Gently fold 1/3 of the egg whites into the chocolate mixture to lighten it.',
      'Fold in remaining egg whites until just combined, being careful not to deflate the mixture.',
      'Spoon batter into prepared ramekins, filling to just below the rim. Smooth tops.',
      'Bake for 12-14 minutes until soufflés have risen but centers are still slightly jiggly.',
      'Dust with powdered sugar and serve immediately.'
    ],
    tags: ['dessert', 'chocolate', 'vegetarian'],
    macros: {
      calories: 320,
      protein: 8,
      carbs: 28,
      fat: 22,
      sugar: 24
    }
  }
];

export const generateMockAnalysisResult = (imageUrl: string): Recipe => {
  return {
    id: 'generated-recipe',
    title: 'Homemade Avocado Toast with Poached Egg',
    description: 'A nutritious breakfast featuring creamy avocado on toasted sourdough, topped with a perfectly poached egg and a sprinkle of microgreens.',
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1525351484163-7529414344d8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    cookTime: '15 min',
    servings: 1,
    ingredients: [
      '1 slice sourdough bread',
      '1 ripe avocado',
      '1 large egg',
      '1 tsp white vinegar',
      '1/4 lemon, juiced',
      '1/4 tsp red pepper flakes',
      'Salt and black pepper to taste',
      'Microgreens or fresh herbs for garnish',
      'Extra virgin olive oil for drizzling'
    ],
    instructions: [
      'Toast the sourdough bread until golden and crisp.',
      'Fill a small pot with water, add vinegar, and bring to a gentle simmer.',
      'Crack the egg into a small cup. Create a gentle whirlpool in the water and carefully slip the egg into the center.',
      'Poach for 3-4 minutes for a runny yolk. Remove with a slotted spoon and place on a paper towel to drain.',
      'While the egg poaches, halve the avocado and scoop the flesh into a bowl.',
      'Mash the avocado with lemon juice, salt, and pepper.',
      'Spread the avocado mixture onto the toast.',
      'Top with the poached egg, sprinkle with red pepper flakes, salt, and pepper.',
      'Garnish with microgreens and a light drizzle of olive oil. Serve immediately.'
    ],
    tags: ['breakfast', 'vegetarian', 'high-protein'],
    macros: {
      calories: 320,
      protein: 15,
      carbs: 25,
      fat: 18,
      fiber: 7,
      sugar: 2,
      sodium: 380
    }
  };
};
