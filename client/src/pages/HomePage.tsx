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
        <section id="unlock" className="py-16 bg-cream text-center px-4">
          <h2 className="font-heading text-3xl font-bold text-gray-900 mb-3">Want to See More?</h2>
          <p className="text-gray-600 max-w-xl mx-auto mb-6 text-base">
            Sign up to explore campus life, events, placement statistics, and talk to our AI counselor.
          </p>
          <button
            onClick={() => setShowSignupPopup(true)}
            className="btn-primary bg-maroon text-white px-8 py-3 rounded-xl font-semibold text-base shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
          >
            Sign Up to Unlock
          </button>
          <div className="mt-16">
            <Footer />
          </div>
        </section>
      )}

      <SignupPopup show={showSignupPopup} onClose={() => setShowSignupPopup(false)} />
      <CallPopup open={showCallPopup} onClose={() => setShowCallPopup(false)} />
    </div>
  );
}