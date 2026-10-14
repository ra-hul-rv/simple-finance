'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Bot, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  isLoading?: boolean;
}

/**
 * Lightweight, safe markdown renderer for assistant responses.
 * Formats headers, bold, bullet points, numbers, inline code, code blocks, and markdown tables.
 */
function MarkdownRenderer({ content }: { content: string }) {
  const rendered = useMemo(() => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: string[][] = [];

    const flushTable = () => {
      if (tableRows.length > 0) {
        const header = tableRows[0];
        const body = tableRows.slice(1).filter((r) => !r.every((c) => c.match(/^[ -:]+$/)));

        elements.push(
          <div key={`table-${elements.length}`} className="my-3 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {header.map((col, idx) => (
                    <th key={idx} className="p-2 font-semibold text-foreground">
                      {col.trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-2 text-muted-foreground">
                        {cell.trim()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
      }
      inTable = false;
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Table line detection
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        inTable = true;
        const cols = trimmed
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());
        tableRows.push(cols);
        return;
      } else if (inTable) {
        flushTable();
      }

      // Empty line
      if (!trimmed) {
        elements.push(<div key={`empty-${index}`} className="h-2" />);
        return;
      }

      // Headers
      if (trimmed.startsWith('### ')) {
        elements.push(
          <h4 key={index} className="text-sm font-bold text-foreground mt-3 mb-1">
            {trimmed.replace('### ', '')}
          </h4>
        );
        return;
      }
      if (trimmed.startsWith('## ')) {
        elements.push(
          <h3 key={index} className="text-base font-bold text-foreground mt-3 mb-1">
            {trimmed.replace('## ', '')}
          </h3>
        );
        return;
      }
      if (trimmed.startsWith('# ')) {
        elements.push(
          <h2 key={index} className="text-lg font-bold text-foreground mt-4 mb-2">
            {trimmed.replace('# ', '')}
          </h2>
        );
        return;
      }

      // Bullet points
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const text = trimmed.slice(2);
        elements.push(
          <div key={index} className="flex items-start gap-2 my-1 text-sm leading-relaxed text-foreground/90">
            <span className="text-primary mt-1 text-xs">•</span>
            <span dangerouslySetInnerHTML={{ __html: formatInline(text) }} />
          </div>
        );
        return;
      }

      // Numbered points (e.g. "1. ")
      const numMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
      if (numMatch) {
        elements.push(
          <div key={index} className="flex items-start gap-2 my-1 text-sm leading-relaxed text-foreground/90">
            <span className="text-primary font-medium text-xs mt-0.5">{numMatch[1]}.</span>
            <span dangerouslySetInnerHTML={{ __html: formatInline(numMatch[2]) }} />
          </div>
        );
        return;
      }

      // Regular paragraph
      elements.push(
        <p
          key={index}
          className="text-sm leading-relaxed text-foreground/90 my-1"
          dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }}
        />
      );
    });

    if (inTable) {
      flushTable();
    }

    return elements;
  }, [content]);

  return <div className="space-y-1">{rendered}</div>;
}

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-foreground">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-muted text-xs font-mono text-primary">$1</code>');
}

export function MessageBubble({ role, content, createdAt, isLoading }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3 max-w-[85%] md:max-w-[75%]',
        isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
      )}
    >
      <Avatar className={cn('h-8 w-8 shrink-0 mt-0.5 ring-1 ring-border/30', isUser ? 'bg-primary/10' : 'bg-card')}>
        <AvatarFallback className={isUser ? 'bg-primary text-primary-foreground text-xs font-bold' : 'bg-primary/15 text-primary'}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col gap-1 min-w-0">
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm shadow-sm transition-all',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-xs'
              : 'bg-card border border-border/60 text-foreground rounded-tl-xs'
          )}
        >
          {isLoading ? (
            <div className="flex items-center gap-1.5 py-1 px-2">
              <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <span className="h-2 w-2 rounded-full bg-primary animate-bounce" />
            </div>
          ) : isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
          ) : (
            <MarkdownRenderer content={content} />
          )}
        </div>

        {createdAt && !isLoading && (
          <span
            className={cn(
              'text-[10px] text-muted-foreground px-1',
              isUser ? 'text-right' : 'text-left'
            )}
          >
            {new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}
