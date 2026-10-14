'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatInput } from './chat-input';
import { MessageBubble } from './message-bubble';
import { ConfirmationCard, ActionPreview } from './confirmation-card';
import {
  Bot,
  Plus,
  Trash2,
  MessageSquare,
  Sparkles,
  TrendingDown,
  Wallet,
  PiggyBank,
  Repeat,
  PanelLeftClose,
  PanelLeft,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  pendingAction?: {
    id: string;
    preview: ActionPreview;
    operationId: string;
  } | null;
}

interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

const STARTER_PROMPTS = [
  {
    icon: TrendingDown,
    title: 'Spending Breakdown',
    prompt: 'How much did I spend this month and what are my top categories?',
  },
  {
    icon: Wallet,
    title: 'Account Balances',
    prompt: 'What are my current account balances and total net worth?',
  },
  {
    icon: PiggyBank,
    title: 'Budget Status',
    prompt: 'Show my budget limits and spending progress for this month.',
  },
  {
    icon: Repeat,
    title: 'Subscriptions',
    prompt: 'Which subscriptions and recurring bills do I have coming up?',
  },
];

export function ChatInterface() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionProcessingId, setActionProcessingId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAiAvailable, setIsAiAvailable] = useState<boolean | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/ai/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch {
      // ignore
    }
  };

  // Load conversations on mount
  useEffect(() => {
    let active = true;
    fetch('/api/ai/conversations')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && active) {
          setConversations(data);
        }
      })
      .catch(() => {
        // ignore mount error
      });

    return () => {
      active = false;
    };
  }, []);

  const selectConversation = async (id: string) => {
    setActiveConversationId(id);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/ai/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(
          data.messages.map((m: { id: string; role: 'user' | 'assistant'; content: string; createdAt: string }) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
          }))
        );
      }
    } catch {
      toast.error('Failed to load conversation history');
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/ai/conversations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConversationId === id) {
          startNewChat();
        }
        toast.success('Conversation deleted');
      }
    } catch {
      toast.error('Failed to delete conversation');
    }
  };

  const handleSend = async (userText: string) => {
    const tempId = `temp-${crypto.randomUUID()}`;
    const userMsg: Message = {
      id: tempId,
      role: 'user',
      content: userText,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          conversationId: activeConversationId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 503) {
          setIsAiAvailable(false);
        }
        throw new Error(data.message || data.error || 'Failed to process AI response');
      }

      setIsAiAvailable(true);

      if (data.isNewConversation && data.conversationId) {
        setActiveConversationId(data.conversationId);
        fetchConversations();
      }

      const assistantMsg: Message = {
        id: data.messageId || `res-${crypto.randomUUID()}`,
        role: 'assistant',
        content: data.message,
        createdAt: new Date().toISOString(),
        pendingAction: data.pendingAction,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Error communicating with AI Assistant';
      console.error('Chat error:', err);
      toast.error(errMsg);
      const errorMsg: Message = {
        id: `err-${crypto.randomUUID()}`,
        role: 'assistant',
        content: `Sorry, I encountered an issue: ${errMsg}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = async (actionId: string) => {
    setActionProcessingId(actionId);
    try {
      const res = await fetch(`/api/ai/actions/${actionId}/confirm`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to confirm action');
      }

      toast.success('Transaction saved successfully!');

      // Update message to remove the confirmation card and append success message
      setMessages((prev) =>
        prev.map((m) => {
          if (m.pendingAction?.id === actionId) {
            return {
              ...m,
              pendingAction: null,
              content: `${m.content}\n\n✅ **Action Confirmed:** ${data.message}`,
            };
          }
          return m;
        })
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to confirm action');
    } finally {
      setActionProcessingId(null);
    }
  };

  const handleCancelAction = async (actionId: string) => {
    setActionProcessingId(actionId);
    try {
      const res = await fetch(`/api/ai/actions/${actionId}/cancel`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel action');
      }

      toast.info('Action proposal cancelled.');

      setMessages((prev) =>
        prev.map((m) => {
          if (m.pendingAction?.id === actionId) {
            return {
              ...m,
              pendingAction: null,
              content: `${m.content}\n\n❌ **Action Cancelled:** Proposal discarded.`,
            };
          }
          return m;
        })
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel action');
    } finally {
      setActionProcessingId(null);
    }
  };

  return (
    <div className="flex h-full rounded-2xl border border-border bg-card/60 backdrop-blur-xl overflow-hidden shadow-lg">
      {/* LEFT: Conversation history sidebar */}
      <div
        className={cn(
          'border-r border-border bg-card/80 flex flex-col transition-all duration-300 ease-in-out',
          sidebarOpen ? 'w-72 md:w-80' : 'w-0 hidden md:flex md:w-0 overflow-hidden'
        )}
      >
        <div className="p-3 border-b border-border flex items-center justify-between">
          <Button
            onClick={startNewChat}
            size="sm"
            className="flex-1 gap-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs h-9"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="h-8 w-8 ml-2 text-muted-foreground hover:text-foreground"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 p-2">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No chat history yet. Start a new conversation!
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => {
                const isActive = activeConversationId === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv.id)}
                    className={cn(
                      'group flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-colors',
                      isActive
                        ? 'bg-primary/15 text-primary font-semibold'
                        : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{conv.title || 'Untitled Chat'}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* RIGHT: Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-background/50">
        {/* Top Header */}
        <div className="h-14 px-4 border-b border-border flex items-center justify-between shrink-0 bg-card/40">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  Financial Assistant
                  <span className="text-[10px] font-normal px-1.5 py-0.2 rounded-md bg-primary/10 text-primary border border-primary/20">
                    Ollama 3B
                  </span>
                  {isAiAvailable === false && (
                    <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-md bg-destructive/15 text-destructive border border-destructive/20 flex items-center gap-1">
                      <AlertCircle className="h-2.5 w-2.5" />
                      Disabled
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-muted-foreground">Self-hosted & Local</p>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={startNewChat}
            className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Session</span>
          </Button>
        </div>

        {/* Messages Scroll Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center space-y-6 py-8">
              <div className="h-16 w-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
                <Sparkles className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  How can I help with your finances today?
                </h2>
                <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Ask questions in plain English. All answers are calculated directly from your real database transactions, accounts, and budgets.
                </p>
              </div>

              {/* Starter Prompt Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-2">
                {STARTER_PROMPTS.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSend(item.prompt)}
                      className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border/60 hover:border-primary/50 hover:bg-accent/40 text-left transition-all group"
                    >
                      <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {item.prompt}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-3">
                  <MessageBubble
                    role={msg.role}
                    content={msg.content}
                    createdAt={msg.createdAt}
                  />
                  {msg.pendingAction && (
                    <div className="max-w-[85%] md:max-w-[75%] mr-auto pl-11">
                      <ConfirmationCard
                        actionId={msg.pendingAction.id}
                        operationId={msg.pendingAction.operationId}
                        preview={msg.pendingAction.preview}
                        onConfirm={handleConfirmAction}
                        onCancel={handleCancelAction}
                        isProcessing={actionProcessingId === msg.pendingAction.id}
                      />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <MessageBubble role="assistant" content="" isLoading />
              )}
            </>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-border bg-card/30">
          <ChatInput
            onSend={handleSend}
            disabled={isLoading}
            placeholder={
              isLoading
                ? 'AI is analyzing your database records...'
                : 'Ask a question or propose an expense (e.g. "Add expense ₹450 for coffee yesterday")...'
            }
          />
          <p className="text-[10px] text-center text-muted-foreground/60 mt-2">
            Local Ollama AI Assistant • Real database verification • Writes require explicit confirmation
          </p>
        </div>
      </div>
    </div>
  );
}
