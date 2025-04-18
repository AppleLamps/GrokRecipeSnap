export interface Recipe {
  id: string
  title: string
  description: string
  content: string
  ingredients: string[]
  instructions: string[]
  imageUrl: string
  cookTime: string
  servings: number
  created_at: string
  metadata?: Record<string, any>
  popularity_score?: number
  tags?: string[]
} 