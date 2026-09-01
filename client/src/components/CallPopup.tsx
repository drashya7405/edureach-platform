import { X, Phone, Mail, Clock, MapPin, Sparkles } from "lucide-react";
import { contactInfo } from "../data/content";

interface CallPopupProps {
  open: boolean;
  onClose: () => void;
  onOpenChat?: () => void;
}

export default function CallPopup({ open, onClose, onOpenChat }: CallPopupProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 relative overflow-hidden border border-gray-100">
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-maroon/10 text-maroon rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Phone className="w-7 h-7" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-gray-900 mb-1">
            Talk to an Admissions Counselor
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Get personalized guidance on programs, entrance cutoffs, scholarships, and campus admissions.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {/* Phone Call Card */}
          <a
            href={`tel:${contactInfo.phone.replace(/[^0-9+]/g, "")}`}
            className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-maroon hover:bg-cream transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-lg bg-maroon text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
              <Phone className="w-5 h-5" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-xs font-semibold text-maroon uppercase tracking-wider">Direct Helpline</p>
              <p className="text-gray-900 font-bold text-base">{contactInfo.phone}</p>
            </div>
            <span className="text-xs text-maroon font-semibold hidden sm:inline group-hover:underline">
              Call Now &rarr;
            </span>
          </a>

          {/* Email Card */}
          <a
            href={`mailto:${contactInfo.email}?subject=Admissions%20Inquiry%20-%20EduReach`}
            className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-maroon hover:bg-cream transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-lg bg-gray-900 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
              <Mail className="w-5 h-5" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Admissions Email</p>
              <p className="text-gray-900 font-semibold text-sm truncate">{contactInfo.email}</p>
            </div>
            <span className="text-xs text-maroon font-semibold hidden sm:inline group-hover:underline">
              Send Email &rarr;
            </span>
          </a>

          {/* Instant AI Counselor Option */}
          {onOpenChat && (
            <button
              onClick={() => {
                onClose();
                onOpenChat();
              }}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/70 transition-all duration-200 group text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">24/7 Instant Answers</p>
                <p className="text-gray-900 font-semibold text-sm">Ask EduReach AI Admissions Counselor</p>
              </div>
              <span className="text-xs text-amber-900 font-semibold hidden sm:inline group-hover:underline">
                Open Chat &rarr;
              </span>
            </button>
          )}
        </div>

        {/* Info footer */}
        <div className="bg-cream rounded-xl p-3.5 text-xs text-gray-600 space-y-1.5 border border-gray-100 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-maroon shrink-0" />
            <span>Admissions Desk: Mon – Sat, 9:00 AM – 5:00 PM IST</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-maroon shrink-0" />
            <span>{contactInfo.address}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-gray-100 text-gray-700 hover:bg-gray-200 py-2.5 rounded-lg font-medium text-sm transition-colors duration-200"
        >
          Close
        </button>
      </div>
    </div>
  );
}