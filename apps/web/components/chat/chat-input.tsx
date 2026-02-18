'use client';

import * as React from 'react';
import { Send, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  compact?: boolean;
}

export function ChatInput({
  onSend,
  onStop,
  isStreaming = false,
  disabled = false,
  placeholder = 'Reply...',
  className,
  compact = false,
}: ChatInputProps) {
  const [value, setValue] = React.useState('');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustHeight = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const maxHeight = compact ? 112 : 200;
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, [compact]);

  React.useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  // Refocus when generation finishes (streaming → not streaming with input enabled).
  const wasStreamingRef = React.useRef(isStreaming);
  React.useEffect(() => {
    if (wasStreamingRef.current && !isStreaming && !disabled) {
      textareaRef.current?.focus();
    }
    wasStreamingRef.current = isStreaming;
  }, [isStreaming, disabled]);

  const handleSubmit = React.useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled || isStreaming) return;

    onSend(trimmed);
    setValue('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [value, disabled, isStreaming, onSend]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const canSend = value.trim().length > 0 && !disabled && !isStreaming;

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'flex items-end gap-2 rounded-2xl',
          compact ? 'p-1.5 rounded-[0.9rem]' : 'p-2',
          'bg-muted/50 dark:bg-muted/30',
          'backdrop-blur-sm',
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onInput={(e) => setValue(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            'flex-1 bg-transparent resize-none text-foreground placeholder:text-muted-foreground/70',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            compact
              ? 'min-h-[36px] max-h-[112px] py-2 px-3 text-base leading-snug'
              : 'min-h-[52px] max-h-[200px] py-3 px-4 text-lg leading-relaxed',
          )}
          aria-label="Message input"
        />
        {isStreaming ? (
          <Button
            type="button"
            size="icon"
            onClick={onStop}
            disabled={!onStop}
            className={cn(
              'shrink-0 transition-all duration-200',
              compact ? 'h-9 w-9 rounded-lg' : 'h-11 w-11 rounded-xl',
              'bg-muted-foreground/20 text-foreground hover:bg-muted-foreground/30',
            )}
            aria-label="Stop response"
            title="Stop response"
          >
            <Square className={compact ? 'h-3.5 w-3.5 fill-current' : 'h-4 w-4 fill-current'} />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            onClick={handleSubmit}
            disabled={!canSend}
            className={cn(
              'shrink-0 transition-all duration-200',
              compact ? 'h-9 w-9 rounded-lg' : 'h-11 w-11 rounded-xl',
              canSend
                ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                : 'bg-background text-muted-foreground',
            )}
            aria-label="Send message"
            aria-keyshortcuts="Enter"
            title="Send message"
          >
            <Send className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
          </Button>
        )}
      </div>
    </div>
  );
}
