import { useState, useRef, useEffect } from "react";
import { X, Send, Bot, User, Minus, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { useAuth, type User as AuthUser } from "../context/AuthContext";
import { sendMessage } from "../services/chat.service";

interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
  isAuthError?: boolean;
}

interface ChatDrawerProps {
  open: boolean;
  onClose: () => void;
}

const quickQuestions = [
  "What courses do you offer?",
  "Tell me about placements",
  "What is the fee structure?",
  "How to apply for admissions?",
];

const MAX_MESSAGE_LENGTH = 1000;

const getInitialMessages = (u: AuthUser | null): Message[] => [
  {
    id: 1,
    text: `Hi ${u?.name?.split(" ")[0] || "there"}! I'm EduReach Bot. Ask me anything about courses, fees, admissions, or campus life.`,
    sender: "bot",
  },
];

const getStorageKey = (userId: string | undefined): string | null => {
  if (!userId) return null;
  return `chatMessages_${userId}`;
};

export default function ChatDrawer({ open, onClose }: ChatDrawerProps) {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const activeUserRef = useRef<string | undefined>(currentUserId);

  const [messages, setMessages] = useState<Message[]>(() => {
    if (currentUserId) {
      try {
        const stored = localStorage.getItem(`chatMessages_${currentUserId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {
        // ignore parse error
      }
    }
    return getInitialMessages(user);
  });

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync / Reset chat messages when authenticated user changes or logs out
  useEffect(() => {
    activeUserRef.current = currentUserId;
    setSending(false);
    setInput("");

    if (!currentUserId) {
      // User is logged out or guest: immediately reset in-memory chat state to guest welcome
      setMessages(getInitialMessages(null));
      return;
    }

    // Load isolated history for this specific user
    try {
      const key = getStorageKey(currentUserId);
      if (key) {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            return;
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load user chat history:", e);
    }

    // Default welcome message for the newly authenticated user
    setMessages(getInitialMessages(user));
  }, [currentUserId, user]);

  // Persist messages whenever messages state changes for the active authenticated user
  useEffect(() => {
    if (!currentUserId) return;
    try {
      const key = getStorageKey(currentUserId);
      if (key) {
        localStorage.setItem(key, JSON.stringify(messages));
      }
    } catch (e) {
      console.warn("Failed to save user chat history:", e);
    }
  }, [messages, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = (text || input).trim();
    if (!messageText || sending) return;

    if (messageText.length > MAX_MESSAGE_LENGTH) {
      return;
    }

    const sendingUserId = currentUserId;
    const userMsg: Message = { id: Date.now(), text: messageText, sender: "user" };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const data = await sendMessage(messageText);
      // Guard against race conditions if user switched during API request
      if (activeUserRef.current === sendingUserId) {
        const botMsg: Message = { id: Date.now() + 1, text: data.message, sender: "bot" };
        setMessages((prev) => [...prev, botMsg]);
      }
    } catch (err: unknown) {
      if (activeUserRef.current !== sendingUserId) return;

      let errorText = "I'm having a little trouble connecting right now. Please try asking again or reach out to our admissions team.";
      let isAuthErr = false;

      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          isAuthErr = true;
          errorText = "Your session has expired. Please sign in to continue chatting with the AI Counselor.";
        } else if (err.response?.data?.message) {
          errorText = err.response.data.message;
        }
      }

      const errorMsg: Message = {
        id: Date.now() + 1,
        text: errorText,
        sender: "bot",
        isAuthError: isAuthErr,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      if (activeUserRef.current === sendingUserId) {
        setSending(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="EduReach AI Counselor Chat"
      className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50 h-[520px] max-h-[calc(100vh-6rem)] w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl flex flex-col"
    >
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#7B1E2B] via-[#611420] to-[#430d16] px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="relative z-10 w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center ring-1 ring-white/20 shadow-sm">
            <Bot className="w-5 h-5 text-amber-300" />
          </div>
          <div className="relative z-10">
            <div className="mb-0.5 inline-flex rounded-full border border-amber-400/30 bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300">
              Admissions Concierge
            </div>
            <h3 className="text-white font-bold text-sm tracking-wide">EduReach Bot</h3>
            <p className="text-white/85 text-xs font-normal">Instant answers on courses, fees, and placements</p>
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-1">
          <button
            onClick={onClose}
            aria-label="Minimize chat"
            className="text-white/80 hover:text-white p-1.5 transition-colors duration-200 rounded-lg hover:bg-white/10"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            aria-label="Close chat"
            className="text-white/80 hover:text-white p-1.5 transition-colors duration-200 rounded-lg hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
            {msg.sender === "bot" && (
              <div className="w-6 h-6 bg-maroon rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-3 h-3 text-white" />
              </div>
            )}
            <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words overflow-hidden ${
              msg.sender === "user"
                ? "bg-maroon text-white rounded-br-sm"
                : msg.isAuthError
                ? "bg-red-50 text-red-900 border border-red-200 rounded-bl-sm shadow-sm"
                : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm"
            }`}>
              {msg.isAuthError && (
                <div className="flex items-center gap-1.5 font-semibold text-red-700 mb-1 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Session Notice</span>
                </div>
              )}
              {msg.sender === "user" ? (
                <p className="whitespace-pre-wrap">{msg.text}</p>
              ) : msg.isAuthError ? (
                <p>{msg.text}</p>
              ) : (
                <div className="prose-chat text-gray-800 text-sm leading-relaxed break-words overflow-hidden">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      h1: ({ children }) => <h1 className="text-base font-bold text-gray-900 mt-2.5 mb-1.5 first:mt-0">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-sm font-bold text-gray-900 mt-2 mb-1 first:mt-0">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-900 mt-2 mb-1 first:mt-0">{children}</h3>,
                      ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-1.5 pl-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-1.5 pl-1">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      code: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => {
                        const isMultiLine = String(children).includes("\n");
                        if (!isMultiLine) {
                          return (
                            <code className="bg-gray-100 text-maroon text-xs px-1.5 py-0.5 rounded font-mono" {...props}>
                              {children}
                            </code>
                          );
                        }
                        return (
                          <pre className="bg-gray-900 text-gray-100 text-xs p-2.5 rounded-lg my-2 overflow-x-auto font-mono">
                            <code {...props}>{children}</code>
                          </pre>
                        );
                      },
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-maroon/60 pl-2.5 my-1.5 italic text-gray-600">
                          {children}
                        </blockquote>
                      ),
                      a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-maroon font-medium underline hover:text-maroon-dark">
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                </div>
              )}
              {msg.isAuthError && (
                <Link
                  to="/login"
                  onClick={onClose}
                  className="inline-block mt-2 text-xs bg-red-700 text-white font-medium px-2.5 py-1 rounded hover:bg-red-800 transition-colors"
                >
                  Sign In Now &rarr;
                </Link>
              )}
            </div>
            {msg.sender === "user" && (
              <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-3 h-3 text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex items-end gap-2">
            <div className="w-6 h-6 bg-maroon rounded-full flex items-center justify-center">
              <Bot className="w-3 h-3 text-white" />
            </div>
            <div className="bg-white border border-gray-200 px-3 py-2 rounded-2xl rounded-bl-sm shadow-sm">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-maroon rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-maroon rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-maroon rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick questions */}
      {messages.length === 1 && (
        <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2 font-medium">Suggested questions:</p>
          <div className="flex flex-wrap gap-1.5">
            {quickQuestions.map((q) => (
              <button
                key={q}
                onClick={() => void handleSend(q)}
                disabled={sending}
                className="text-xs px-2.5 py-1 bg-white border border-[#7B1E2B]/25 text-[#7B1E2B] rounded-full hover:!bg-[#7B1E2B] hover:!text-white transition-colors duration-200 disabled:opacity-50 cursor-pointer shadow-xs font-medium"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-3">
        {input.length > 700 && (
          <div className="text-[11px] text-right mb-1 text-gray-500 font-mono">
            <span className={input.length >= MAX_MESSAGE_LENGTH ? "text-red-600 font-bold" : ""}>
              {input.length}
            </span>
            /{MAX_MESSAGE_LENGTH}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            maxLength={MAX_MESSAGE_LENGTH}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about admissions, courses, fees..."
            disabled={sending}
            aria-label="Ask EduReach Bot"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-maroon text-sm disabled:opacity-50 transition-colors duration-200"
          />
          <button
            onClick={() => void handleSend()}
            disabled={!input.trim() || sending}
            aria-label="Send message"
            className="w-9 h-9 bg-maroon text-white rounded-lg flex items-center justify-center hover:bg-maroon-dark disabled:opacity-50 transition-colors duration-200 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
