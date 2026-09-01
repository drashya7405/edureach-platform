import { Link } from "react-router-dom";
import { X, GraduationCap } from "lucide-react";

interface SignupPopupProps {
  show: boolean;
  onClose: () => void;
}

export default function SignupPopup({ show, onClose }: SignupPopupProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative border border-gray-100">
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="text-center">
          <div className="w-14 h-14 bg-maroon/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-maroon shadow-inner">
            <GraduationCap className="w-8 h-8 text-maroon" />
          </div>
          <h3 className="font-heading text-2xl font-bold text-gray-900 mb-2">Unlock Full Access</h3>
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            Sign up to explore faculty mentors, campus life, department placement statistics, and interact with the AI admissions counselor.
          </p>
          <Link
            to="/signup"
            onClick={onClose}
            className="btn-primary block w-full text-white py-3.5 rounded-xl font-bold text-base shadow-md transition-all mb-4 text-center"
          >
            Create Free Account
          </Link>
          <p className="text-sm text-gray-600 font-medium">
            Already have an account?{" "}
            <Link
              to="/login"
              onClick={onClose}
              className="text-maroon font-bold hover:underline hover:text-maroon-dark transition-colors"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}