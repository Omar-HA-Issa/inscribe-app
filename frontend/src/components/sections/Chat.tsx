import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, FileText, AlertCircle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { chatApi } from "@/services/chatApi";
import { useToast } from "@/hooks/use-toast";

interface Source {
  document: string;
  chunk_index?: number;
  similarity?: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: DocumentGroup[];
  error?: boolean;
}

interface DocumentGroup {
  document: string;
  count: number;
  maxSimilarity?: number;
  avgSimilarity?: number;
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

/** Groups raw chunk sources by document; computes max + average similarity */
const groupSourcesByDocument = (sources: Source[] | undefined): DocumentGroup[] => {
  if (!sources || sources.length === 0) return [];
  const map = new Map<string, { sum: number; count: number; max: number }>();

  sources.forEach((s) => {
    const key = s.document;
    const sim = s.similarity ?? 0;
    if (!map.has(key)) {
      map.set(key, { sum: sim, count: 1, max: sim });
    } else {
      const entry = map.get(key)!;
      entry.sum += sim;
      entry.count += 1;
      entry.max = Math.max(entry.max, sim);
    }
  });

  return [...map.entries()].map(([document, v]) => ({
    document,
    count: v.count,
    maxSimilarity: v.max,
    avgSimilarity: v.sum / v.count,
  }));
};

/** Renders grouped sources without chunk details */
const SourceList: React.FC<{ groups: DocumentGroup[] }> = ({ groups }) => {
  if (!groups || groups.length === 0) return null;

  return (
    <div className="mt-4 pt-3 border-t border-border/50">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-3 h-3 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Sources:</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {groups.map((g) => (
          <Badge
            key={`badge-${g.document}`}
            variant="secondary"
            className="text-xs"
            title={
              typeof g.avgSimilarity === "number"
                ? `Avg match: ${(g.avgSimilarity * 100).toFixed(0)}%`
                : undefined
            }
          >
            {g.document} —{" "}
            {typeof g.maxSimilarity === "number"
              ? `${(g.maxSimilarity * 100).toFixed(0)}% match`
              : "match"}
            {` (${g.count} chunk${g.count > 1 ? "s" : ""})`}
          </Badge>
        ))}
      </div>
    </div>
  );
};

export const Chat: React.FC<ChatProps> = ({ selectedDocs }) => {
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function askBackend(
    question: string,
    limit = 5,
    threshold = 0.0
  ): Promise<any> {
    try {
      // If selectedDocs are provided, call the REST API directly with an array filter
      if (Array.isArray(selectedDocs) && selectedDocs.length > 0) {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: question,
            limit,
            similarityThreshold: threshold,
            selectedDocumentIds: selectedDocs,
          }),
        });
        if (!res.ok) throw new Error(`Chat failed (${res.status})`);
        return await res.json();
      }

      // Otherwise, preserve your existing behavior
      // (Your chatApi likely accepts: (message, limit, threshold, documentId?))
      return await chatApi.sendMessage(question, limit, threshold, undefined);
    } catch (e) {
      throw e;
    }
  }

  const handleSend = async (preset?: string) => {
    const messageText = preset || input;
    if (!messageText.trim() || isLoading) return;

    // Add user message
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
      // 🔧 Call backend (with selected docs if provided)
      const response = await askBackend(messageText, 5, 0.0);

      // Normalize sources to a flat {document, similarity}[] for grouping
      const raw = response?.sources ?? [];
      let normalized: Source[] = [];

      if (raw.length > 0) {
        if (raw[0]?.topSimilarity !== undefined && raw[0]?.document) {
          normalized = raw.map((r: any) => ({
            document: r.document,
            similarity: r.topSimilarity,
          }));
        }

        else if (raw[0]?.document) {
          normalized = raw as Source[];
        }
      }

      const groups: DocumentGroup[] = groupSourcesByDocument(normalized);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response?.answer ?? "I don't know.",
        timestamp: new Date(),
        sources: groups,
        error: false,
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Toast: unique docs and total chunks
      const uniqueDocs = groups.length;
      const totalChunks = normalized?.length ?? 0;
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
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
      <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">


        {/* Messages Area */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
            <AnimatePresence>
              {messages.map((message, index) => (
                  <motion.div
                      key={message.id}
                      initial={{opacity: 0, y: 10}}
                      animate={{opacity: 1, y: 0}}
                      transition={{duration: 0.3, delay: index * 0.05}}
                      className={`flex gap-4 ${
                          message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                  >
                    {message.role === "assistant" && (
                        <div
                            className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-5 h-5 text-accent"/>
                        </div>
                    )}

                    <div
                        className={`rounded-lg p-4 ${
                            message.role === "user"
                                ? "bg-accent/10 border border-accent/20 max-w-[80%]"
                                : message.error
                                    ? "bg-destructive/10 border border-destructive/20 max-w-[85%]"
                                    : "bg-transparent max-w-full"
                        }`}
                    >
                      {message.error && (
                          <div className="flex items-center gap-2 mb-2 text-destructive">
                            <AlertCircle className="w-4 h-4"/>
                            <span className="text-sm font-medium">Error</span>
                          </div>
                      )}
                      <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>

                      {/* Source Citations (grouped, no chunk expansion) */}
                      {Array.isArray(message.sources) && message.sources.length > 0 && (
                          <SourceList groups={message.sources as DocumentGroup[]}/>
                      )}

                      <span className="text-xs text-muted-foreground mt-2 block">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                    </div>

                    {message.role === "user" && (
                        <div
                            className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-primary"/>
                        </div>
                    )}
                  </motion.div>
              ))}
            </AnimatePresence>

            {/* Loading State */}
            {isLoading && (
                <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-accent"/>
                  </div>
                  <div className="bg-muted/50 border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-accent rounded-full animate-bounce"/>
                        <span className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:0.2s]"/>
                        <span className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:0.4s]"/>
                      </div>
                      <span className="text-sm">Searching documents and generating answer...</span>
                    </div>
                  </div>
                </motion.div>
            )}

            {/* Suggested Questions */}
            {messages.length === 1 && !isLoading && (
                <motion.div
                    initial={{opacity: 0, y: 10}}
                    animate={{opacity: 1, y: 0}}
                    transition={{delay: 0.5}}
                    className="mt-12"
                >
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-semibold mb-2">Chat with Your Documents</h2>
                    <p className="text-muted-foreground">
                      Ask questions and get AI-powered answers from your uploaded files
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-accent"/>
                    <span className="text-sm font-medium text-muted-foreground">
                  Suggested questions:
                </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {SUGGESTED_QUESTIONS.map((question, idx) => (
                        <Button
                            key={idx}
                            variant="outline"
                            onClick={() => {
                              setInput(question);
                              handleSend(question);
                            }}
                            className="text-left text-sm p-4 h-auto justify-start bg-muted/30 hover:bg-muted/50 hover:border-accent/50"
                        >
                          {question}
                        </Button>
                    ))}
                  </div>
                </motion.div>
            )}

            {/* Invisible div for auto-scroll anchor */}
            <div ref={messagesEndRef}/>
          </div>
        </div>

        {/* Input Area - Fixed at Bottom */}
        <div className="border-t border-border bg-card/50 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex gap-3 items-end">
              <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask a question about your documents..."
                  className="min-h-[60px] max-h-[200px] resize-none bg-background/50 border-border focus:border-accent rounded-xl"
                  disabled={isLoading}
              />
              <Button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="bg-accent hover:bg-accent/80 text-foreground h-[60px] w-[60px] rounded-xl flex-shrink-0"
              >
                <Send className="w-5 h-5"/>
              </Button>
            </div>
            {isLoading && (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="w-3 h-3 animate-pulse"/>
                  <span>Processing your question...</span>
                </div>
            )}
          </div>
        </div>
      </div>
  );
};
