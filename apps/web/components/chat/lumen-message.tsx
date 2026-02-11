'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface LumenMessageProps {
  content: string;
  className?: string;
}

const proseClasses = cn(
  'prose prose-lg max-w-none',
  'prose-p:text-foreground prose-p:leading-relaxed prose-p:my-3',
  'prose-headings:text-foreground prose-headings:font-display',
  'prose-strong:text-foreground prose-strong:font-semibold',
  'prose-em:text-foreground/90',
  'prose-ul:text-foreground prose-ol:text-foreground',
  'prose-li:text-foreground prose-li:my-1.5',
  'prose-code:text-accent prose-code:bg-accent/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-normal prose-code:before:content-none prose-code:after:content-none',
  'prose-pre:bg-muted prose-pre:text-foreground',
  'prose-a:text-accent prose-a:no-underline hover:prose-a:underline',
  'prose-blockquote:border-accent/30 prose-blockquote:text-muted-foreground prose-blockquote:not-italic',
  '[&>p:first-child]:mt-0 [&>p:last-child]:mb-0',
);

export function LumenMessage({ content, className }: LumenMessageProps) {
  return (
    <div className={cn('max-w-[90%]', className)}>
      <div className="min-w-0">
        <div className={proseClasses}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
