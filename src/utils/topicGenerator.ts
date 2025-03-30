import { capitalize } from './stringUtils';

// Seed ideas for cooking topics
const cookingTopicSeedIdeas = [
  "meal prep",
  "kitchen tools",
  "global cuisines",
  "cooking techniques",
  "ingredient spotlights",
  "beginner cooking tips",
  "baking",
  "healthy eating",
  "food storage",
  "budget cooking",
  "food trends",
  "seasonal recipes",
  "fermentation basics",
  "cooking with kids",
  "one-pot meals",
  "vegetarian and vegan meals",
  "cooking for allergies",
  "slow cooker recipes",
  "air fryer ideas",
  "grilling and smoking",
  "pantry organization",
  "knife care and maintenance",
  "garnishing and plating",
  "leftover transformations",
  "cooking for two",
  "cooking for large groups",
  "sauce and condiment making",
  "food photography at home",
  "cultural food traditions",
  "cooking science and food chemistry",
  "time-saving cooking hacks",
  "sustainable cooking practices",
  "preserving and canning",
  "infused oils and homemade spice blends",
  "cast iron vs non-stick",
  "homemade pasta and noodles",
  "cooking with herbs and aromatics",
  "understanding umami",
  "fusion recipes",
  "kitchen safety tips",
  "cooking on a tight schedule",
  "batch cooking for the week",
  "microwave cooking beyond reheating",
  "cooking with alcohol (and without)",
  "dairy-free or gluten-free cooking",
  "cooking through the seasons",
  "exploring regional dishes",
  "eating locally and seasonally",
  "decoding food labels",
  "making the most of your farmer's market haul"
];

// Title templates for generating engaging article titles
const titleTemplates = [
  "The Ultimate Guide to {topic}",
  "Essential Tips for {topic}",
  "Mastering the Art of {topic}",
  "A Beginner's Guide to {topic}",
  "{topic}: Tips and Tricks You Need to Know",
  "How to Excel at {topic}",
  "Everything You Need to Know About {topic}",
  "Smart Strategies for {topic}",
  "The Secret to Successful {topic}",
  "Revolutionize Your Kitchen with {topic}"
];

/**
 * Generates a dynamic article title based on a topic
 */
function generateArticleTitle(topic: string): string {
  const template = titleTemplates[Math.floor(Math.random() * titleTemplates.length)];
  return template.replace('{topic}', capitalize(topic));
}

/**
 * Generates a set of unique cooking topics and their corresponding article titles
 */
export function generateDynamicCookingTopics(count = 9): { topic: string; title: string }[] {
  // Shuffle the array of topics
  const shuffled = [...cookingTopicSeedIdeas].sort(() => 0.5 - Math.random());
  
  // Take the first 'count' topics and generate titles
  return shuffled.slice(0, count).map(topic => ({
    topic,
    title: generateArticleTitle(topic)
  }));
} 