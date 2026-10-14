import { PageHeader } from '@/components/shared/page-header';
import { ChatInterface } from '@/components/ai/chat-interface';

export const metadata = {
  title: 'AI Financial Assistant — Simple Finance',
  description: 'Ask questions about your finances in natural language powered by local Ollama AI.',
};

export default function AiAssistantPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] md:h-[calc(100vh-7.5rem)] gap-4 animate-fade-in">
      <PageHeader
        title="AI Assistant"
        description="Ask natural-language questions about your spending, accounts, and budgets verified against real database facts."
      />
      <div className="flex-1 min-h-0">
        <ChatInterface />
      </div>
    </div>
  );
}
