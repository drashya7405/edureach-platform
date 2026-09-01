
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, User, Mail, Lock, Phone, ArrowLeft, Loader2 } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { registerUser } from "../services/auth.service";
import { useAuth } from "../context/AuthContext";
import { images } from "../data/content";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const data = await registerUser({ name: name.trim(), email: email.trim(), password, phone: phone.trim() || undefined });
      login(data.token, data.user);
      toast.success("Account created successfully! Welcome to EduReach.");
      navigate("/");
    } catch (err: unknown) {
      let message = "Registration failed. Please try again.";
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        message = err.response.data.message;
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-cream">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md my-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-gray-600 hover:text-maroon font-semibold transition-colors duration-200 mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span className="text-sm">Back to Home</span>
          </Link>

          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="w-7 h-7 text-maroon" />
            <span className="font-heading text-xl font-bold text-maroon">EduReach College</span>
          </div>

          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Create Account</h1>
          <p className="text-gray-600 text-sm mb-6">Join EduReach for full access to campus life, placements & AI counselor</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/20 text-gray-900 transition-colors shadow-sm text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. rahul@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/20 text-gray-900 transition-colors shadow-sm text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Password *</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/20 text-gray-900 transition-colors shadow-sm text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number (Optional)</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91-9876543210"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/20 text-gray-900 transition-colors shadow-sm text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 px-4 rounded-xl text-white font-bold text-base shadow-md cursor-pointer transition-all mt-2"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Account...
                </span>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6 font-medium">
            Already have an account?{" "}
            <Link to="/login" className="text-maroon font-bold hover:underline hover:text-maroon-dark transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:block lg:w-1/2 relative">
        <img src={images.moreStudents} alt="EduReach Students" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-maroon-dark/95 via-maroon/75 to-maroon/50 flex items-center justify-center p-12">
          <div className="text-center text-white max-w-lg">
            <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/20">
              <GraduationCap className="w-9 h-9 text-amber-300" />
            </div>
            <h2 className="font-heading text-4xl font-bold mb-3 text-white">Join EduReach Today</h2>
            <p className="text-white/90 text-base leading-relaxed mb-6">
              Access the complete course syllabus, faculty mentors, interactive campus events, and AI counseling support.
            </p>
            <div className="inline-flex items-center gap-6 px-6 py-3 rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm text-xs font-semibold uppercase tracking-wider text-amber-200">
              <span>92% Placements</span>
              <span>•</span>
              <span>₹42 LPA Highest</span>
              <span>•</span>
              <span>150+ Recruiters</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}