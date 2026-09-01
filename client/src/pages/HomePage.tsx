import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import HeroSection from "../components/HeroSection";
import AboutSection from "../components/AboutSection";
import CoursesSection from "../components/CoursesSection";
import MentorsSection from "../components/MentorsSection";
import AchievementsSection from "../components/AchievementsSection";
import HiringStatsSection from "../components/HiringStatsSection";
import StudentLifeSection from "../components/StudentLifeSection";
import EventsGallery from "../components/EventsGallery";
import QuotesSection from "../components/QuotesSection";
import CounselorCTA from "../components/CounselorCTA";
import Footer from "../components/Footer";
import CallPopup from "../components/CallPopup";
import SignupPopup from "../components/SignupPopup";

export default function HomePage() {
  const { user } = useAuth();
  const [showSignupPopup, setShowSignupPopup] = useState(false);
  const [showCallPopup, setShowCallPopup] = useState(false);

  // Scroll trigger — show signup popup when visitor reaches Mentors section
  const handleReachMentors = () => {
    if (!user && !sessionStorage.getItem("popupShown")) {
      setShowSignupPopup(true);
      sessionStorage.setItem("popupShown", "true");
    }
  };

  return (
    <div>
      {/* Visible to everyone */}
      <HeroSection />
      <AboutSection />
      <AchievementsSection />
      <CoursesSection />
      <QuotesSection />
      <MentorsSection onReachMentors={handleReachMentors} />

      {/* Content below Mentors — GATED */}
      {user ? (
        <>
          <StudentLifeSection />
          <EventsGallery />
          <CounselorCTA onOpenCall={() => setShowCallPopup(true)} />
          <HiringStatsSection />
          <Footer />
        </>
      ) : (
        <section id="unlock" className="pt-16 pb-0 bg-cream text-center">
          <div className="max-w-2xl mx-auto px-4 mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Want to See More?</h2>
            <p className="text-gray-600 text-base mb-8 leading-relaxed">
              Sign up to explore our campus life, events, department placement statistics, and get instant guidance from our AI counselor.
            </p>
            <button
              onClick={() => setShowSignupPopup(true)}
              className="btn-primary inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white text-base shadow-lg cursor-pointer"
            >
              Sign Up to Unlock
            </button>
          </div>
          <Footer />
        </section>
      )}

      <SignupPopup show={showSignupPopup} onClose={() => setShowSignupPopup(false)} />
      <CallPopup open={showCallPopup} onClose={() => setShowCallPopup(false)} />
    </div>
  );
}