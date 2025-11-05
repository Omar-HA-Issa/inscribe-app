import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, AlertCircle, Sparkles, Copy } from "lucide-react";
import { chatApi } from "@/services/chatApi";
import { useToast } from "@/hooks/use-toast";
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
  "What are the main topics in this document?",
  "Summarize the key findings",
  "What are the main risks discussed?",
  "Explain the methodology used",
];

export const Chat: React.FC<ChatProps> = ({ selectedDocs = [] }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I'm DocuMind AI. I can answer questions about your uploaded documents. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // ChatGPT-style composer: ref + auto-grow helper
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) autoGrow(textareaRef.current);
  }, []);

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

      const uniqueDocs = response?.sources?.length ?? 0;
      const totalChunks = response?.chunksUsed ?? 0;
      if (uniqueDocs > 0) {
        toast({
          title: "Answer found!",
          description: `Found relevant info in ${uniqueDocs} document${uniqueDocs > 1 ? "s" : ""} (${totalChunks} chunk${totalChunks !== 1 ? "s" : ""})`,
        });
      }
    } catch (error) {
      console.error("❌ Chat error:", error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Sorry, I encountered an error while processing your question. Please try again.",
        timestamp: new Date(),
        error: true,
      };

      setMessages((prev) => [...prev, errorMessage]);

      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to get response",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      if (textareaRef.current) autoGrow(textareaRef.current);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => toast({ title: "Copied", description: "Message copied to clipboard." }))
      .catch(() =>
        toast({ title: "Copy failed", description: "Could not copy text.", variant: "destructive" })
      );
  }

  return (
      <div className="flex-1 flex flex-col h-full bg-transparent backdrop-blur-0 overflow-hidden">
        {/* Messages Area */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto">
          {/* full-bleed (no inner box) */}
          <div className="w-full px-6 md:px-10 py-10 space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((message, index) => (
                  <motion.div
                      key={message.id}
                      initial={{opacity: 0, y: 8}}
                      animate={{opacity: 1, y: 0}}
                      transition={{duration: 0.25, delay: Math.min(index * 0.03, 0.2)}}
                      className={`flex items-start ${message.role === "user" ? "justify-end" : "justify-start"} gap-3 md:gap-4`}
                  >
                    {message.role === "assistant" && (
                        <div
                            className="mt-1 w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-5 h-5 text-accent"/>
                        </div>
                    )}

                    <div
                        className={`group relative rounded-2xl px-5 py-4 border ${
                            message.role === "user"
                                ? "bg-accent/10 border-accent/20 text-foreground max-w-[80%] md:max-w-[82%]"
                                : message.error
                                    ? "bg-destructive/10 border-destructive/20 text-foreground max-w-[80%] md:max-w-[82%]"
                                    : "bg-card/40 border-border text-foreground max-w-[82%]"
                        }`}
                    >
                      {message.error && (
                          <div className="flex items-center gap-2 -mt-1 mb-2 text-destructive">
                            <AlertCircle className="w-4 h-4"/>
                            <span className="text-sm font-medium">Error</span>
                          </div>
                      )}

                      {message.role === "assistant" ? (
                          <div
                              className="prose-sm md:prose dark:prose-invert max-w-none leading-normal
                                 prose-headings:text-foreground prose-headings:font-semibold
                                 prose-p:text-foreground prose-p:leading-normal
                                 prose-strong:text-foreground prose-strong:font-semibold
                                 prose-ul:text-foreground prose-ol:text-foreground
                                 prose-li:text-foreground
                                 prose-code:text-accent prose-code:bg-accent/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                                 prose-pre:bg-muted prose-pre:text-foreground prose-pre:text-[0.9rem] md:prose-pre:text-[0.95rem]
                                 prose-a:text-accent prose-a:no-underline hover:prose-a:underline"
                          >
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                      ) : (
                          <p className="text-foreground text-sm md:text-base leading-normal whitespace-pre-wrap">
                            {message.content}
                          </p>
                      )}

                      <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {message.timestamp.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}
                    </span>
                        {message.role === "assistant" && (
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Copy message"
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0 ml-1 text-muted-foreground hover:text-foreground"
                                onClick={() => copyToClipboard(message.content)}
                            >
                              <Copy className="h-4 w-4"/>
                            </Button>
                        )}
                      </div>
                    </div>

                    {message.role === "user" && (
                        <div
                            className="mt-1 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-primary"/>
                        </div>
                    )}
                  </motion.div>
              ))}
            </AnimatePresence>

            {/* Loading State */}
            {isLoading && (
                <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="flex items-start gap-3 md:gap-4">
                  <div className="mt-1 w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-accent"/>
                  </div>
                  <div className="rounded-2xl px-5 py-4 border bg-card/40 border-border">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-accent rounded-full animate-bounce"/>
                        <span className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:0.2s]"/>
                        <span className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:0.4s]"/>
                      </div>
                      <span className="text-sm">
                    {selectedDocs.length > 0
                        ? `Searching ${selectedDocs.length} selected document${selectedDocs.length !== 1 ? "s" : ""}...`
                        : "Searching documents and generating answer..."}
                  </span>
                    </div>
                  </div>
                </motion.div>
            )}

            {/* Suggested Questions */}
            {messages.length === 1 && !isLoading && (
                <motion.div
                    initial={{opacity: 0, y: 8}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.25, delay: 0.2}}
                    className="mt-12"
                >
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-semibold mb-2">Chat with Your Documents</h2>
                    <p className="text-muted-foreground">
                      {selectedDocs.length > 0
                          ? `Ask questions about your ${selectedDocs.length} selected document${selectedDocs.length !== 1 ? "s" : ""}`
                          : "Ask questions and get AI-powered answers from your uploaded files"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-accent"/>
                    <span className="text-sm font-medium text-muted-foreground">Suggested questions:</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {SUGGESTED_QUESTIONS.map((q, idx) => (
                        <Button
                            key={idx}
                            variant="outline"
                            onClick={() => {
                              setInput(q);
                              handleSend(q);
                            }}
                            className="text-left text-sm p-4 h-auto justify-start bg-muted/30 hover:bg-muted/50 hover:border-accent/50"
                        >
                          {q}
                        </Button>
                    ))}
                  </div>
                </motion.div>
            )}

            <div ref={messagesEndRef}/>
          </div>
        </div>

        {/* Composer (ChatGPT style) — no divider line, full-bleed */}
        <div className="bg-transparent backdrop-blur-0 shadow-none">
          <div className="w-full px-6 md:px-10 py-5">
            <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!isLoading && input.trim()) handleSend();
                }}
                className="space-y-0"
            >
              <div
                  className="relative rounded-3xl border border-border bg-transparent shadow-none
                         focus-within:ring-1 focus-within:ring-accent focus-within:border-accent transition"
              >
                <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      if (textareaRef.current) autoGrow(textareaRef.current);
                    }}
                    onInput={(e) => autoGrow(e.currentTarget)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (!isLoading && input.trim()) handleSend();
                      }
                    }}
                    placeholder={
                      selectedDocs.length > 0
                          ? `Ask about ${selectedDocs.length} selected document${selectedDocs.length !== 1 ? "s" : ""}…`
                          : "Ask a question about your documents…"
                    }
                    className="min-h-[44px] max-h-[220px] w-full resize-none
                           bg-transparent border-0 focus-visible:ring-0 focus:outline-none
                           px-4 py-3 pr-12 leading-6 text-base rounded-3xl placeholder:text-muted-foreground"
                    disabled={isLoading}
                />

                <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    aria-label="Send message"
                    className={`absolute bottom-2 right-2 h-9 w-9 rounded-full grid place-items-center transition ${
                        !input.trim() || isLoading
                            ? "bg-muted text-muted-foreground cursor-not-allowed"
                            : "bg-accent text-foreground hover:bg-accent/85"
                    }`}
                >
                  <Send className="h-4 w-4"/>
                </button>
              </div>
              {/* Removed the hint row ("Press Enter…") */}
            </form>
          </div>
        </div>
      </div>
  );
};
