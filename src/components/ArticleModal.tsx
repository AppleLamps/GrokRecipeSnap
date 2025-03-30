import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import type { Article } from '@/utils/articleService';

interface ArticleModalProps {
  article: Article;
  isOpen: boolean;
  onClose: () => void;
}

const ArticleModal: React.FC<ArticleModalProps> = ({
  article,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-background rounded-xl shadow-xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-secondary transition-colors"
          aria-label="Close article"
        >
          <X size={20} />
        </button>

        {/* Article header image */}
        <div className="aspect-[2/1] w-full overflow-hidden">
          <img 
            src={article.imageUrl} 
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Article content */}
        <div className="p-6 md:p-8">
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {article.tags.map((tag, index) => (
              <span 
                key={index}
                className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Title */}
          <h2 className="text-2xl md:text-3xl font-display mb-4">
            {article.title}
          </h2>

          {/* Metadata */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
            <time dateTime={article.publishedAt}>
              {new Date(article.publishedAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </time>
            <span>{article.readTime}</span>
          </div>

          {/* Summary */}
          <p className="text-lg text-muted-foreground mb-8 font-medium">
            {article.summary}
          </p>

          {/* Content */}
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                // Customize heading styles
                h1: ({node, ...props}) => <h1 className="text-2xl font-display mb-4" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-xl font-display mb-3" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-lg font-display mb-2" {...props} />,
                // Style paragraphs
                p: ({node, ...props}) => <p className="mb-4 leading-relaxed" {...props} />,
                // Style lists
                ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4" {...props} />,
                // Style bold and italic text
                strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                em: ({node, ...props}) => <em className="italic" {...props} />
              }}
            >
              {article.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleModal; 