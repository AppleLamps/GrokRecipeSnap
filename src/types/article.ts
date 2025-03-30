export interface Article {
  id: string
  title: string
  content: string
  summary: string
  imageUrl: string
  readTime: string
  publishedAt: string
  tags: string[]
  metadata?: Record<string, any>
} 