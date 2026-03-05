import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Paperclip, Loader2 } from 'lucide-react';
import { chatCompletion, fileToDataUri } from '@/lib/ai';
import type { ChatMessage } from '@/lib/ai';
import { CHAT_SYSTEM_PROMPT } from '@/lib/chat-context';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text && !image) return;

    const userContent = text || ('Bild analysieren');
    const userMsg: Message = { role: 'user', content: userContent, image: image ?? undefined };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setImage(null);
    setLoading(true);

    try {
      const apiMessages: ChatMessage[] = [
        { role: 'system', content: CHAT_SYSTEM_PROMPT },
        ...newMessages.map((m): ChatMessage => ({
          role: m.role,
          content: m.image
            ? [
                { type: 'text', text: m.content },
                { type: 'image_url', image_url: { url: m.image } }
              ]
            : m.content
        }))
      ];

      const response = await chatCompletion(apiMessages);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Entschuldigung, es gab einen Fehler. Bitte versuche es erneut.'
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, image, messages]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const uri = await fileToDataUri(file);
      setImage(uri);
    } catch {
      // ignore
    }
    e.target.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`
          fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full shadow-lg
          flex items-center justify-center transition-all duration-200
          ${open
            ? 'bg-muted text-muted-foreground hover:bg-muted/80'
            : 'bg-primary text-primary-foreground hover:scale-105 hover:shadow-xl'
          }
        `}
        aria-label="Assistent"
      >
        {open ? <X size={18} /> : <MessageCircle size={18} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-5 z-50 w-[360px] max-w-[calc(100vw-2.5rem)] h-[500px] max-h-[calc(100dvh-7rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageCircle size={14} className="text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">Assistent</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-2 text-muted-foreground">
                <MessageCircle size={28} strokeWidth={1.5} />
                <p className="text-xs">Frage stellen oder Bild hochladen...</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted text-foreground rounded-bl-md'
                }`}>
                  {m.image && (
                    <img src={m.image} alt="" className="max-w-full max-h-32 rounded-lg mb-2" />
                  )}
                  {m.content.split('\n').map((line, j) => (
                    <span key={j}>{line}{j < m.content.split('\n').length - 1 && <br />}</span>
                  ))}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-3.5 py-2.5 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" />
                  Denkt nach...
                </div>
              </div>
            )}
          </div>

          {/* Image preview */}
          {image && (
            <div className="px-4 pb-2">
              <div className="relative inline-block">
                <img src={image} alt="" className="h-16 rounded-lg border border-border" />
                <button
                  onClick={() => setImage(null)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center"
                >
                  <X size={10} />
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-2.5 border-t border-border bg-card">
            <div className="flex items-end gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                className="shrink-0 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Datei anhängen"
              >
                <Paperclip size={16} />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFile}
                className="hidden"
              />
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Frage stellen oder Bild hochladen..."
                rows={1}
                className="flex-1 resize-none bg-muted rounded-xl px-3 py-2 text-sm outline-none border-0 placeholder:text-muted-foreground/60 max-h-24 overflow-y-auto"
              />
              <button
                onClick={handleSend}
                disabled={loading || (!input.trim() && !image)}
                className="shrink-0 p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
