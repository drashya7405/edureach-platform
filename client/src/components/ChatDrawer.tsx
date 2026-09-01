import { useState, useRef, useEffect } from "react";
import { X, Send, Bot, User, Minus } from "lucide-react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { sendMessage } from "../services/chat.service";

interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
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

export default function ChatDrawer({ open, onClose }: ChatDrawerProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: `Hi ${user?.name?.split(" ")[0] || "there"}! I'm EduReach Bot. Ask me anything about courses, fees, admissions, or campus life.`,
      sender: "bot",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || sending) return;

    const userMsg: Message = { id: Date.now(), text: messageText, sender: "user" };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const data = await sendMessage(messageText);
      const botMsg: Message = { id: Date.now() + 1, text: data.message, sender: "bot" };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: unknown) {
      let errorText = "I'm having a little trouble connecting right now. Please try again or reach out to our admissions team.";
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        errorText = err.response.data.message;
      }
      const errorMsg: Message = { id: Date.now() + 1, text: errorText, sender: "bot" };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 h-[520px] w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl flex flex-col">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-maroon via-maroon-dark to-[#41111a] px-4 py-3 flex items-center justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,214,102,0.22),transparent_32%)]" />
        <div className="flex items-center gap-2">
          <div className="relative z-10 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center ring-1 ring-white/15">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="relative z-10">
            <div className="mb-1 inline-flex rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200">
              Admissions Concierge
            </div>
            <h3 className="text-white font-semibold text-sm">EduReach Bot</h3>
            <p className="text-white/70 text-xs">Instant answers on courses, fees, and placements</p>
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-1">
          <button onClick={onClose} className="text-white/70 hover:text-white p-1 transition-colors duration-200">
            <Minus className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1 transition-colors duration-200">
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
            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
              msg.sender === "user"
                ? "bg-maroon text-white rounded-br-sm"
                : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm"
            }`}>
              {msg.text}
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
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick questions */}
      {messages.length === 1 && (
        <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">Quick questions:</p>
          <div className="flex flex-wrap gap-1.5">
            {quickQuestions.map((q) => (
              <button key={q} onClick={() => handleSend(q)}
                className="text-xs px-2.5 py-1 bg-white border border-maroon/20 text-maroon rounded-full hover:bg-maroon hover:text-white transition-colors duration-200">
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-3">
        <div className="flex items-center gap-2">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Ask a question..." disabled={sending}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-maroon text-sm disabled:opacity-50 transition-colors duration-200" />
          <button onClick={() => handleSend()} disabled={!input.trim() || sending}
            className="w-9 h-9 bg-maroon text-white rounded-lg flex items-center justify-center hover:bg-maroon-dark disabled:opacity-50 transition-colors duration-200">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
