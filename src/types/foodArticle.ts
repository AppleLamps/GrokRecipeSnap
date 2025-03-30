export interface FoodArticle {
  id: string
  title: string
  content: string
  category: string
  created_at: string
  metadata?: Record<string, any>
  tags?: string[]
} 