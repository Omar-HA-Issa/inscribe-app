import {useEffect, useRef, useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {Textarea} from "@/shared/ui/textarea.tsx";
import {AlertCircle, Bot, Copy, Send, Sparkles, User} from "lucide-react";
import {chatApi} from "@/features/chat/api/chatApi.ts";
import {useToast} from "@/shared/hooks/use-toast.ts";
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
      content: "Hello! I'm DocuMind AI. Ask me anything about your documents.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();
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

      const uniqueDocs = response?.sources?.length ?? 0;
      const totalChunks = response?.chunksUsed ?? 0;
      if (uniqueDocs > 0) {
        toast({
          title: "✓ Answer found",
          description: `${uniqueDocs} document${uniqueDocs > 1 ? "s" : ""} • ${totalChunks} chunk${totalChunks !== 1 ? "s" : ""}`,
        });
      }
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

      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get response",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => toast({ title: "Copied to clipboard" }))
      .catch(() => toast({ title: "Failed to copy", variant: "destructive" }));
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden">
      {/* Messages Area */}
      <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto
             [scrollbar-width:none] [-ms-overflow-style:none]
             [&::-webkit-scrollbar]:hidden"
      >


        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
                <motion.div
                    key={message.id}
                    initial={{opacity: 0, y: 10}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.2}}
                    className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                      <div
                          className="w-7 h-7 rounded-full bg-gray-800/50 flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="w-4 h-4 text-gray-400"/>
                      </div>
                  )}

                  <div
                      className={`group relative max-w-[85%] ${
                          message.role === "user"
                              ? "bg-gray-800/50 text-white rounded-2xl px-4 py-2.5"
                              : message.error
                                  ? "bg-red-500/10 text-red-400 rounded-2xl px-4 py-2.5"
                                  : "bg-transparent text-gray-200"
                      }`}
                  >
                    {message.error && (
                        <div className="flex items-center gap-2 mb-1.5">
                          <AlertCircle className="w-3.5 h-3.5"/>
                          <span className="text-xs font-medium">Error</span>
                        </div>
                    )}

                    {message.role === "assistant" ? (
                        <div
                            className="prose prose-invert prose-base max-w-none
                        prose-headings:text-gray-200 prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
                        prose-p:text-gray-300 prose-p:leading-relaxed prose-p:my-2 prose-p:text-base
                        prose-strong:text-gray-200 prose-strong:font-semibold
                        prose-ul:my-2 prose-ol:my-2
                        prose-li:text-gray-300 prose-li:my-1 prose-li:text-base
                        prose-code:text-gray-300 prose-code:bg-gray-800/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                        prose-pre:bg-gray-900/50 prose-pre:text-gray-300 prose-pre:border prose-pre:border-gray-800
                        prose-a:text-gray-300 prose-a:underline hover:prose-a:text-white
                        [&_ul]:list-disc [&_ul]:ml-4
                        [&_ol]:list-decimal [&_ol]:ml-4"
                        >
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                    ) : (
                        <p className="text-base leading-relaxed">{message.content}</p>
                    )}

                    <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-gray-600">
                      {message.timestamp.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}
                    </span>
                      {message.role === "assistant" && !message.error && (
                          <button
                              onClick={() => copyToClipboard(message.content)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-800/50 rounded"
                              title="Copy"
                          >
                            <Copy className="w-3 h-3 text-gray-500"/>
                          </button>
                      )}
                    </div>
                  </div>

                  {message.role === "user" && (
                      <div
                          className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-4 h-4 text-gray-300"/>
                      </div>
                  )}
                </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading State */}
          {isLoading && (
              <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="flex gap-3">
                <div
                    className="w-7 h-7 rounded-full bg-gray-800/50 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-gray-400"/>
                </div>
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"/>
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]"/>
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.4s]"/>
                  </div>
                  <span>
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
                  initial={{opacity: 0, y: 10}}
                  animate={{opacity: 1, y: 0}}
                  transition={{delay: 0.3}}
                  className="pt-12 pb-8"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-semibold text-white mb-2">
                    {selectedDocs.length > 0 ? "Ready to help" : "Upload documents to get started"}
                  </h2>
                  <p className="text-gray-400 text-sm">
                    {selectedDocs.length > 0
                        ? `${selectedDocs.length} document${selectedDocs.length !== 1 ? "s" : ""} selected`
                        : "Select documents from the sidebar, then ask questions"}
                  </p>
                </div>

                {selectedDocs.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 mb-3 px-1">
                        <Sparkles className="w-3.5 h-3.5 text-gray-400"/>
                        <span className="text-xs font-medium text-gray-400">Try asking:</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {SUGGESTED_QUESTIONS.map((q, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                  setInput(q);
                                  handleSend(q);
                                }}
                                className="text-left text-sm px-4 py-3 rounded-xl bg-gray-900/30 hover:bg-gray-900/50
                          text-gray-300 hover:text-white transition-all border border-gray-800 hover:border-gray-700"
                            >
                              {q}
                            </button>
                        ))}
                      </div>
                    </>
                )}
              </motion.div>
          )}

          <div ref={messagesEndRef}/>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-800/50 bg-[#0e0e0e]/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
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
              className="min-h-[48px] max-h-[200px] w-full
             resize-none overflow-hidden
             bg-gray-900/50 border border-gray-800 rounded-2xl
             focus:ring-1 focus:ring-gray-700 focus:border-gray-700
             px-4 py-3 pr-12 text-base text-white placeholder:text-gray-500
             transition-all
             [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              disabled={isLoading}
          />


          <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`absolute bottom-2.5 right-2.5 h-8 w-8 rounded-xl flex items-center justify-center transition-all ${
                  !input.trim() || isLoading
                      ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                      : "bg-purple-500 hover:bg-purple-600 text-white"
              }`}
          >
            <Send className="h-4 w-4"/>
          </button>
        </form>
        </div>
      </div>
    </div>
  );
};