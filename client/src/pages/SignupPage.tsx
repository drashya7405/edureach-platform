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
    if (loading) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedEmail || !password) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (trimmedName.length < 2) {
      toast.error("Full name must be at least 2 characters.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error("Please provide a valid email address.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const data = await registerUser({
        name: trimmedName,
        email: trimmedEmail,
        password,
        phone: trimmedPhone || undefined,
      });

      if (data?.token) {
        localStorage.setItem("token", data.token);
      }
      login(data.user, data?.token);
      toast.success("Account created successfully! Welcome to EduReach.");
      navigate("/");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.data?.message) {
          toast.error(err.response.data.message);
        } else if (err.response?.status === 409) {
          toast.error("An account with this email already exists.");
        } else if (err.response?.status === 400) {
          toast.error("Please check your registration details and try again.");
        } else if (err.response?.status === 500) {
          toast.error("Server error during registration. Please try again later.");
        } else if (err.code === "ERR_NETWORK" || err.message === "Network Error") {
          toast.error("Unable to reach the server. Please check your connection.");
        } else {
          toast.error(err.message || "Registration failed. Please try again.");
        }
      } else if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-cream">
      {/* Form column */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center overflow-y-auto px-6 py-8 sm:px-12 lg:px-16 bg-cream">
        <div className="w-full max-w-md mx-auto my-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-gray-500 hover:text-maroon transition-colors duration-200 mb-6 text-sm group font-medium"
          >
            <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
            <span>Back to Home</span>
          </Link>

          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 mb-2 tracking-tight">
            Create Account
          </h1>
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            Join EduReach for unlimited access to AI counseling, campus tours, and admissions support.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-maroon">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-maroon focus:ring-1 focus:ring-maroon bg-white text-sm transition-colors duration-200 disabled:bg-gray-100 disabled:opacity-75"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address <span className="text-maroon">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-maroon focus:ring-1 focus:ring-maroon bg-white text-sm transition-colors duration-200 disabled:bg-gray-100 disabled:opacity-75"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-maroon">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-maroon focus:ring-1 focus:ring-maroon bg-white text-sm transition-colors duration-200 disabled:bg-gray-100 disabled:opacity-75"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number <span className="text-xs text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91-9876543210"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-maroon focus:ring-1 focus:ring-maroon bg-white text-sm transition-colors duration-200 disabled:bg-gray-100 disabled:opacity-75"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary bg-maroon text-white py-3.5 px-4 rounded-xl font-semibold text-base hover:bg-maroon-dark focus:outline-none focus:ring-2 focus:ring-maroon focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-[0_4px_14px_rgba(123,30,43,0.35)] hover:shadow-[0_6px_20px_rgba(123,30,43,0.45)] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <span>Create Account</span>
                )}
              </button>
            </div>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-maroon font-bold hover:text-maroon-dark hover:underline transition-colors duration-200">
              Sign In
            </Link>
          </p>
        </div>
      </div>

      {/* Decorative side image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img src={images.moreStudents} alt="EduReach Students" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-maroon/65 flex items-center justify-center backdrop-blur-[1px]">
          <div className="text-center text-white p-12 max-w-lg">
            <div className="w-20 h-20 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md ring-1 ring-white/30 shadow-xl">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <h2 className="font-heading text-4xl font-bold mb-3 leading-tight">Join EduReach</h2>
            <p className="text-white/90 text-lg font-light leading-relaxed">
              92% placement rate · Top tech recruiters · 25-acre green campus in Hyderabad
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}