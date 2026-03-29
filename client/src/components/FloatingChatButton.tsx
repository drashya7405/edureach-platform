import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ChatDrawer from "./ChatDrawer";

export default function FloatingChatButton() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);

  const handleClick = () => {
    if (user) {
      setChatOpen(!chatOpen);
    } else {
      navigate("/login");
    }
  };

  return (
    <>
      {/* Chat drawer popup */}
      <ChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />

      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        <div className="hidden sm:flex rounded-full border border-maroon/10 bg-white/92 px-4 py-2 text-sm font-semibold text-maroon shadow-[0_12px_30px_rgba(123,30,43,0.12)] backdrop-blur-md">
          {user ? "Ask EduReach Bot" : "Login to chat"}
        </div>
        <button
          onClick={handleClick}
          className={`group relative flex h-14 w-14 items-center justify-center rounded-full border shadow-[0_16px_40px_rgba(20,24,40,0.18)] ring-4 ring-white/70 backdrop-blur-md transition-all duration-300 hover:scale-110 ${
            chatOpen
              ? "border-slate-500/20 bg-slate-700 text-white hover:bg-slate-800"
              : "border-maroon/15 bg-gradient-to-br from-maroon via-maroon-light to-[#b14a5c] text-white hover:from-maroon-dark hover:via-maroon hover:to-maroon-light"
          }`}
          title={user ? "Chat with EduReach Bot" : "Login to chat"}
          aria-label={user ? "Chat with EduReach Bot" : "Login to chat"}
        >
          {!chatOpen && (
            <span className="absolute inset-0 rounded-full bg-maroon/20 blur-md transition-opacity duration-300 group-hover:opacity-80" />
          )}
          <MessageCircle
            className={`relative z-10 w-6 h-6 ${chatOpen ? "" : "animate-bounce [animation-duration:2s] [animation-iteration-count:3]"}`}
            strokeWidth={2.25}
          />
        </button>
      </div>
    </>
  );
}
