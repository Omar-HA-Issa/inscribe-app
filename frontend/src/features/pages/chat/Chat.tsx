import {useEffect, useRef, useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {Textarea} from "@/shared/ui/textarea.tsx";
import {AlertCircle, Bot, Copy, Send, Sparkles, User} from "lucide-react";
import {chatApi} from "@/features/pages/chat/api/chatApi.ts";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  error?: boolean;
}

interface ChatProps {
  selectedDocs?: string[];
}

const SUGGESTED_QUESTIONS = [
  "What are the main topics in these documents?",
  "Summarize the key findings",
  "Compare the documents",
  "Explain the methodology",
];

export const Chat: React.FC<ChatProps> = ({ selectedDocs = [] }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm Inscribe AI. Ask me anything about your documents.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) autoGrow(textareaRef.current);
  }, [input]);

  async function handleSend(preset?: string) {
    const messageText = preset || input;
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "44px";
    }

    try {
      const response = await chatApi.sendMessage(
        messageText,
        5,
        0.15,
        undefined,
        selectedDocs.length > 0 ? selectedDocs : undefined
      );

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response?.answer ?? "I don't know.",
        timestamp: new Date(),
        error: false,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("❌ Chat error:", error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
        error: true,
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-6 py-8
          [scrollbar-width:none] [-ms-overflow-style:none]
          [&::-webkit-scrollbar]:hidden"
      >
        <div className="max-w-3xl mx-auto space-y-6">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="w-9 h-9 rounded-full bg-foreground/5 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}

                <div
                  className={`group relative max-w-[85%] ${
                    message.role === "user"
                      ? "bg-foreground/5 text-foreground rounded-2xl px-5 py-3"
                      : message.error
                        ? "bg-red-500/10 text-red-400 rounded-2xl px-5 py-3 border border-red-500/20"
                        : "bg-transparent text-foreground"
                  }`}
                >
                  {message.error && (
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Error</span>
                    </div>
                  )}

                  {message.role === "assistant" ? (
                    <div
                      className="prose prose-neutral dark:prose-invert max-w-none
                        prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
                        prose-p:text-foreground prose-p:leading-relaxed prose-p:my-2
                        prose-strong:text-foreground prose-strong:font-semibold
                        prose-ul:my-2 prose-ol:my-2
                        prose-li:text-muted-foreground prose-li:my-1
                        prose-code:text-foreground prose-code:bg-foreground/5 prose-code:px-2 prose-code:py-0.5 prose-code:rounded-md
                        prose-pre:bg-foreground/5 prose-pre:border-0
                        prose-a:text-muted-foreground prose-a:no-underline hover:prose-a:text-foreground
                        [&_ul]:list-disc [&_ul]:ml-4
                        [&_ol]:list-decimal [&_ol]:ml-4"
                    >
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="leading-relaxed">{message.content}</p>
                  )}

                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-muted-foreground">
                      {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {message.role === "assistant" && !message.error && (
                      <button
                        onClick={() => copyToClipboard(message.content)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-foreground/5 rounded"
                        title="Copy"
                      >
                        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>

                {message.role === "user" && (
                  <div className="w-9 h-9 rounded-full bg-foreground/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-5 h-5 text-foreground" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading State */}
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
              <div className="w-9 h-9 rounded-full bg-foreground/5 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
                <span className="text-sm">
                  {selectedDocs.length > 0
                    ? `Searching ${selectedDocs.length} document${selectedDocs.length !== 1 ? "s" : ""}...`
                    : "Thinking..."}
                </span>
              </div>
            </motion.div>
          )}

          {/* Welcome State */}
          {messages.length === 1 && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="pt-16 pb-12"
            >
              <div className="text-center mb-12">
                <h2 className="text-2xl font-semibold text-foreground mb-3">
                  {selectedDocs.length > 0 ? "Ready to help" : "Upload documents to get started"}
                </h2>
                <p className="text-muted-foreground">
                  {selectedDocs.length > 0
                    ? `${selectedDocs.length} document${selectedDocs.length !== 1 ? "s" : ""} selected`
                    : "Select documents from the sidebar, then ask questions"}
                </p>
              </div>

              {selectedDocs.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mb-4 justify-center">
                    <Sparkles className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Try asking:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SUGGESTED_QUESTIONS.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setInput(q);
                          handleSend(q);
                        }}
                        className="text-left px-5 py-4 rounded-xl bg-foreground/5
                          text-foreground hover:bg-foreground/10 transition-all
                          border-0"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!isLoading && input.trim()) handleSend();
            }}
            className="relative"
          >
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onInput={(e) => autoGrow(e.currentTarget)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!isLoading && input.trim()) handleSend();
                }
              }}
              placeholder={
                selectedDocs.length > 0
                  ? `Ask about ${selectedDocs.length} document${selectedDocs.length !== 1 ? "s" : ""}...`
                  : "Select documents to start chatting..."
              }
              className="min-h-[52px] max-h-[200px] w-full
                resize-none overflow-hidden
                bg-foreground/5 border-0 rounded-2xl
                focus:ring-1 focus:ring-border
                px-5 py-4 pr-14 text-foreground placeholder:text-muted-foreground
                transition-all
                [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              disabled={isLoading}
            />

            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`absolute bottom-3 right-3 h-9 w-9 rounded-xl flex items-center justify-center transition-all ${
                !input.trim() || isLoading
                  ? "bg-foreground/10 text-muted-foreground cursor-not-allowed"
                  : "bg-gradient-to-r from-[#a855f7] via-[#8b5cf6] to-[#6366f1] hover:shadow-glow text-white"
              }`}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};