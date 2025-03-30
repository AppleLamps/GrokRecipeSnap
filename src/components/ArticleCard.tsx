import React, { useState } from 'react';
import { Clock, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Article } from '@/utils/articleService';
import ArticleModal from './ArticleModal';

interface ArticleCardProps {
  article: Article;
  className?: string;
}

const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  className
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <article 
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:shadow-lg cursor-pointer",
          className
        )}
        onClick={() => setIsModalOpen(true)}
      >
        {/* Article image */}
        <div className="aspect-[1.85/1] overflow-hidden">
          <img 
            src={article.imageUrl} 
            alt={article.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
        
        {/* Content */}
        <div className="flex flex-1 flex-col p-4">
          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {article.tags.slice(0, 3).map((tag, index) => (
                <span 
                  key={index}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground"
                >
                  <Tag size={12} />
                  {tag}
                </span>
              ))}
            </div>
          )}
          
          {/* Title */}
          <h3 className="mb-2 text-xl font-display leading-tight text-foreground group-hover:text-primary transition-colors">
            {article.title}
          </h3>
          
          {/* Summary */}
          <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
            {article.summary}
          </p>
          
          {/* Metadata */}
          <div className="mt-auto flex items-center gap-4 text-xs text-muted-foreground">
            <time dateTime={article.publishedAt} className="flex items-center gap-1">
              {new Date(article.publishedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </time>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {article.readTime}
            </span>
          </div>
        </div>
      </article>

      {/* Article Modal */}
      <ArticleModal
        article={article}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default ArticleCard; 