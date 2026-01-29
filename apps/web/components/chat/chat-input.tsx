'use client';

import * as React from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Type your message...',
  className,
}: ChatInputProps) {
  const [value, setValue] = React.useState('');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustHeight = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    // Set height to scrollHeight, max 200px
    const newHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = `${newHeight}px`;
  }, []);

  React.useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  // Refocus when re-enabled after being disabled (e.g., after coach finishes responding)
  const wasDisabledRef = React.useRef(disabled);
  React.useEffect(() => {
    if (wasDisabledRef.current && !disabled) {
      // Was disabled, now enabled - refocus
      textareaRef.current?.focus();
    }
    wasDisabledRef.current = disabled;
  }, [disabled]);

  const handleSubmit = React.useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed);
    setValue('');

    // Reset height and refocus after sending
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      // Refocus the textarea so user can keep typing
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter without shift sends the message
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'flex items-end gap-2 p-2 rounded-2xl',
          'bg-muted/50 dark:bg-muted/30',
          'backdrop-blur-sm',
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            'flex-1 min-h-[52px] max-h-[200px] py-3 px-4',
            'bg-transparent resize-none',
            'text-lg text-foreground placeholder:text-muted-foreground/70',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'leading-relaxed',
          )}
          aria-label="Message input"
        />
        <Button
          type="button"
          size="icon"
          onClick={handleSubmit}
          disabled={!canSend}
          className={cn(
            'shrink-0 h-11 w-11 rounded-xl',
            'transition-all duration-200',
            canSend
              ? 'bg-accent text-accent-foreground hover:bg-accent/90'
              : 'bg-background text-muted-foreground',
          )}
          aria-label="Send message"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
