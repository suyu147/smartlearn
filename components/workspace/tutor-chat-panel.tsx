'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, ChevronLeft, ChevronRight, MessageSquare, Loader2 } from 'lucide-react';
import { useSettingsStore } from '@/lib/store/settings';
import { useSessionsStore } from '@/lib/store/sessions';

export function TutorChatPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { providerId, modelId, apiKey, baseUrl } = useSettingsStore();
  const {
    currentSessionId,
    tutorMessagesBySession,
    appendTutorMessage,
    updateTutorMessage,
  } = useSessionsStore();

  const messages = useMemo(
    () => (currentSessionId ? (tutorMessagesBySession[currentSessionId] ?? []) : []),
    [currentSessionId, tutorMessagesBySession],
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (collapsed) {
    return (
      <div className="flex w-12 flex-col items-center border-l py-3">
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(false)} title="展开智能辅导">
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  async function handleSend() {
    if (!currentSessionId || !input.trim() || isLoading) return;

    const trimmedInput = input.trim();
    const history = messages;
    const userMsg = { id: crypto.randomUUID(), role: 'user' as const, content: trimmedInput };
    appendTutorMessage(currentSessionId, userMsg);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedInput,
          conversationHistory: history.slice(-10).map(m => ({ role: m.role, content: m.content })),
          aiConfig: { providerId, modelId, apiKey, baseUrl },
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      const assistantId = crypto.randomUUID();
      let assistantContent = '';

      appendTutorMessage(currentSessionId, { id: assistantId, role: 'assistant', content: '' });

      let buffer = '';
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'text_delta') {
                assistantContent += data.text;
                updateTutorMessage(currentSessionId, assistantId, assistantContent);
              }
            } catch { /* skip non-JSON lines */ }
          }
        }
      }
    } catch (error) {
      console.error('Tutor chat error:', error);
      appendTutorMessage(currentSessionId, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '抱歉，我遇到了一些问题，请稍后再试。',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex w-[320px] min-w-0 flex-col border-l">
      <div className="flex items-center justify-between border-b p-3">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <MessageSquare className="h-4 w-4" />
          智能辅导
        </h3>
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(true)} title="折叠智能辅导">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-hidden" ref={scrollRef}>
        <ScrollArea className="h-full p-3">
          {messages.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-30" />
              学习过程中有任何疑问，随时向 AI 助教提问
            </div>
          )}
          <div className="space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}>
                  {msg.content || (msg.role === 'assistant' && isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : msg.content)}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="border-t p-3">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="向AI助教提问..."
            className="min-h-[40px] resize-none text-sm"
            rows={1}
            disabled={isLoading || !currentSessionId}
          />
          <Button size="icon" onClick={handleSend} disabled={isLoading || !input.trim() || !currentSessionId}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}