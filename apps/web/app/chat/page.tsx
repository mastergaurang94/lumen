'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/sidebar';
import { CoachMessage, UserMessage, TypingIndicator, ChatInput } from '@/components/chat';

// Message types
type MessageRole = 'coach' | 'user';

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

// Mock initial message from coach
const INITIAL_COACH_MESSAGE = `Welcome. I'm glad you're here.

Before we begin, I want you to know that everything we discuss stays between us — your conversations are stored locally on your device and are never used to train AI models.

So, **what's on your mind today?** What brought you here, and what's the thing you've been circling that matters most right now?`;

// Simulated coach responses for demo
const MOCK_RESPONSES = [
  `That's a meaningful place to start. Thank you for sharing that with me.

I hear that you're feeling pulled in different directions. There's something underneath that tension worth exploring.

What does your gut tell you about what's most important right now — not what *should* be important, but what actually feels urgent or alive?`,

  `I notice you're being quite thoughtful about this, which tells me it matters.

Sometimes when we're stuck, it's because we're trying to solve the wrong problem. The surface issue might not be the real one.

**What would change if you stopped trying to figure this out perfectly?** What might you try instead?`,

  `That resonates. And I appreciate your honesty in naming it.

It sounds like there's a pattern here — one that might be familiar. Have you noticed this dynamic before in other areas of your life?

Sometimes recognizing a pattern is the first step to choosing differently.`,
];

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Format date for header
function formatSessionDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

// Simulate streaming text
async function* streamText(text: string): AsyncGenerator<string> {
  const words = text.split(' ');
  for (let i = 0; i < words.length; i++) {
    yield words.slice(0, i + 1).join(' ');
    await new Promise((resolve) => setTimeout(resolve, 30 + Math.random() * 40));
  }
}

export default function ChatPage() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isTyping, setIsTyping] = React.useState(false);
  const [streamingContent, setStreamingContent] = React.useState<string | null>(null);
  const [showEndSessionDialog, setShowEndSessionDialog] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const responseIndexRef = React.useRef(0);
  const sessionDateRef = React.useRef(new Date());

  // Initialize with coach greeting
  React.useEffect(() => {
    setMounted(true);
    // Add initial coach message after a short delay
    const timer = setTimeout(() => {
      setMessages([
        {
          id: generateId(),
          role: 'coach',
          content: INITIAL_COACH_MESSAGE,
          timestamp: new Date(),
        },
      ]);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll to bottom when messages change
  React.useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent, isTyping]);

  // Handle sending a message
  const handleSend = React.useCallback(async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Show typing indicator
    setIsTyping(true);

    // Simulate thinking delay
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));

    // Hide typing indicator, start streaming
    setIsTyping(false);

    // Get next mock response (cycle through them)
    const responseText = MOCK_RESPONSES[responseIndexRef.current % MOCK_RESPONSES.length];
    responseIndexRef.current++;

    // Stream the response
    setStreamingContent('');
    for await (const partial of streamText(responseText)) {
      setStreamingContent(partial);
    }

    // Finalize the message
    const coachMessage: Message = {
      id: generateId(),
      role: 'coach',
      content: responseText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, coachMessage]);
    setStreamingContent(null);
  }, []);

  // Handle end session
  const handleEndSession = React.useCallback(() => {
    setShowEndSessionDialog(true);
  }, []);

  const confirmEndSession = React.useCallback(() => {
    // In real app, this would save the session and navigate
    window.location.href = '/session';
  }, []);

  if (!mounted) {
    return (
      <div className="atmosphere min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="atmosphere h-screen flex flex-col overflow-hidden">
      {/* Hamburger menu - top left */}
      <div className="fixed top-4 left-4 z-30">
        <Sidebar />
      </div>

      {/* End Session button - top right */}
      <div className="fixed top-4 right-4 z-30">
        <Button
          variant="outline"
          onClick={handleEndSession}
          className="text-base text-foreground"
        >
          End Session
        </Button>
      </div>

      {/* Title - centered */}
      <div className="pt-16 pb-4 text-center">
        <h1 className="font-display text-lg text-foreground">
          Active Session · {formatSessionDate(sessionDateRef.current)}
        </h1>
      </div>

      {/* Messages area */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <div
          ref={scrollAreaRef}
          className="h-full chat-scroll-area"
        >
          <div className="max-w-3xl mx-auto px-6 py-8 min-h-[calc(100%+24px)]">
            {/* Empty state before first message */}
            {messages.length === 0 && !isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-accent" />
                </div>
                <p className="text-muted-foreground text-sm max-w-xs">
                  Your session is beginning...
                </p>
              </motion.div>
            )}

            {/* Message list */}
            <div className="space-y-6">
              <AnimatePresence mode="popLayout">
                {messages.map((message) =>
                  message.role === 'coach' ? (
                    <CoachMessage key={message.id} content={message.content} />
                  ) : (
                    <UserMessage key={message.id} content={message.content} />
                  ),
                )}

                {/* Streaming message */}
                {streamingContent !== null && (
                  <CoachMessage
                    key="streaming"
                    content={streamingContent}
                  />
                )}

                {/* Typing indicator */}
                {isTyping && <TypingIndicator key="typing" />}
              </AnimatePresence>
            </div>

            {/* Scroll anchor */}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>
      </main>

      {/* Input area */}
      <footer className="sticky bottom-0 z-20">
        {/* Gradient fade for smooth transition */}
        <div
          className="absolute inset-x-0 -top-16 h-16 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)',
          }}
        />
        <div className="relative bg-background/80 backdrop-blur-md">
          <div className="max-w-3xl mx-auto px-6 pt-4 pb-6">
          <ChatInput
            onSend={handleSend}
            disabled={isTyping || streamingContent !== null}
            placeholder="Reply..."
          />
          <p className="mt-3 text-xs text-muted-foreground/50 text-center">
            Enter to send · Shift+Enter for new line · Lumen is AI-powered and can make mistakes
          </p>
          </div>
        </div>
      </footer>

      {/* End Session Dialog */}
      <AnimatePresence>
        {showEndSessionDialog && (
          <EndSessionDialog
            onConfirm={confirmEndSession}
            onCancel={() => setShowEndSessionDialog(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// End Session Confirmation Dialog
function EndSessionDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md"
      >
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg mx-4">
          <h2 className="font-display text-xl text-foreground mb-2">End this session?</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Your conversation will be saved locally. You can start a new session in 7 days.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Continue session
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1"
            >
              End session
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
