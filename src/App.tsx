import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import LoginView from "./components/LoginView";
import StudentDashboard from "./components/StudentDashboard";
import AdminPortal from "./components/AdminPortal";
import CollegeDetailsModal from "./components/CollegeDetailsModal";
import { College, StudentProfile } from "./types";
import { Loader2, ShieldAlert } from "lucide-react";

export default function App() {
  // Session states
  const [currentUser, setCurrentUser] = useState<StudentProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // College list database records
  const [colleges, setColleges] = useState<College[]>([]);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [loadingColleges, setLoadingColleges] = useState(true);

  // Dialog details modal state
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);

  // Load user session and colleges list on mount
  useEffect(() => {
    // 1. Recover Session from localStorage
    const savedSession = localStorage.getItem("predictor_student");
    if (savedSession && savedSession !== "undefined") {
      try {
        const parsed = JSON.parse(savedSession);
        setCurrentUser(parsed);
      } catch (err) {
        console.error("Stale student session in localStorage:", err);
      }
    }

    // Recover Admin view state
    const savedAdmin = localStorage.getItem("predictor_admin_active");
    if (savedAdmin === "true") {
      setIsAdmin(true);
    }

    // 2. Fetch Colleges from Database
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    setLoadingColleges(true);
    try {
      const res = await fetch("/api/colleges");
      const data = await res.json();
      if (res.ok) {
        setColleges(data.colleges || []);
        setIsFallbackMode(data.isFallback ?? false);
      } else {
        console.warn("Failed to load colleges:", data.error);
      }
    } catch (err) {
      console.error("Network error fetching colleges database:", err);
    } finally {
      setLoadingColleges(false);
    }
  };

  // Student Profile Updates
  const handleUpdateProfile = async (updated: StudentProfile) => {
    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: updated.email,
          cetRank: updated.cetRank,
          dcetScore: updated.dcetScore,
          examScore: updated.examScore,
          courses: updated.courses,
          favorites: updated.favorites
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Save to React State & localStorage
      setCurrentUser(data.user);
      localStorage.setItem("predictor_student", JSON.stringify(data.user));

      // Sync active selected college favorite state if open
      if (selectedCollege) {
        const updatedSelected = colleges.find(c => c.id === selectedCollege.id);
        if (updatedSelected) {
          setSelectedCollege(updatedSelected);
        }
      }
    } catch (err: any) {
      alert("Error synchronizing profile details: " + err.message);
    }
  };

  // Login handler
  const handleLoginSuccess = (user: StudentProfile) => {
    setCurrentUser(user);
    localStorage.setItem("predictor_student", JSON.stringify(user));
  };

  const handleSkipLogin = () => {
    const guestUser: StudentProfile = {
      firstName: "Guest",
      lastName: "User",
      email: "guest_" + Date.now() + "@predictor.local",
      favorites: [],
      courses: [],
      isVerified: true
    };
    setCurrentUser(guestUser);
    // We don't necessarily need to persist guest users to localStorage, 
    // or we can if we want them to resume. Let's persist for session continuity.
    localStorage.setItem("predictor_student", JSON.stringify(guestUser));
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("predictor_student");
    setShowFavoritesOnly(false);
  };

  // Admin access handler
  const handleAdminAccess = (success: boolean) => {
    setIsAdmin(success);
    if (success) {
      localStorage.setItem("predictor_admin_active", "true");
    } else {
      localStorage.removeItem("predictor_admin_active");
    }
  };

  const handleExitAdmin = () => {
    setIsAdmin(false);
    localStorage.removeItem("predictor_admin_active");
  };

  // Admin Actions: Save/Update College record
  const handleAddCollege = async (college: College, isEditing?: boolean) => {
    const res = await fetch("/api/colleges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminCode: "831067",
        college,
        overwriteCourses: !!isEditing
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    // Refresh directory list
    await fetchColleges();
  };

  // Admin Actions: Delete College record
  const handleDeleteCollege = async (id: string) => {
    const res = await fetch(`/api/colleges/${id}?adminCode=831067`, {
      method: "DELETE"
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    // Refresh directory list
    await fetchColleges();
  };

  // Admin Actions: CSV Bulk Import overwrites/adds colleges
  const handleImportColleges = async (importedList: College[]) => {
    const res = await fetch("/api/colleges/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminCode: "831067",
        colleges: importedList
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    // Refresh directory list
    await fetchColleges();
  };

  // Details Modal Favoriting
  const handleToggleFavoriteFromModal = async (collegeId: string) => {
    if (!currentUser) return;
    let updatedFavorites = [...(currentUser.favorites || [])];
    if (updatedFavorites.includes(collegeId)) {
      updatedFavorites = updatedFavorites.filter(id => id !== collegeId);
    } else {
      updatedFavorites.push(collegeId);
    }
    await handleUpdateProfile({
      ...currentUser,
      favorites: updatedFavorites
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#faf6f0] via-[#fefdfa] to-[#f4eee1] selection:bg-amber-600 selection:text-white">
      {/* Universal header navigation */}
      <Header
        currentUser={currentUser}
        isAdmin={isAdmin}
        onAdminAccess={handleAdminAccess}
        onExitAdmin={handleExitAdmin}
        onLogout={handleLogout}
        favoritesCount={currentUser?.favorites?.length || 0}
        onToggleShowFavorites={() => setShowFavoritesOnly(!showFavoritesOnly)}
        showFavoritesOnly={showFavoritesOnly}
      />

      {/* Main Content Areas */}
      <main className="flex-grow">
        {loadingColleges ? (
          <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
            <h3 className="font-display font-bold text-gray-700">Loading College Database</h3>
            <p className="text-xs text-gray-400 mt-1">Connecting with secure credentials...</p>
          </div>
        ) : isAdmin ? (
          // Admin Workspace Module
          <AdminPortal
            colleges={colleges}
            onAddCollege={handleAddCollege}
            onDeleteCollege={handleDeleteCollege}
            onImportColleges={handleImportColleges}
            isFallback={isFallbackMode}
          />
        ) : currentUser ? (
          // Student Matched Workspace Module
          <StudentDashboard
            currentUser={currentUser}
            colleges={colleges}
            onUpdateProfile={handleUpdateProfile}
            onSelectCollege={setSelectedCollege}
            showFavoritesOnly={showFavoritesOnly}
          />
        ) : (
          // General Welcome & Registration Module
          <LoginView onLoginSuccess={handleLoginSuccess} onSkipLogin={handleSkipLogin} />
        )}
      </main>

      {/* College Details Modal */}
      {selectedCollege && (
        <CollegeDetailsModal
          college={selectedCollege}
          onClose={() => setSelectedCollege(null)}
          isFavorite={currentUser ? (currentUser.favorites || []).includes(selectedCollege.id) : false}
          onToggleFavorite={handleToggleFavoriteFromModal}
        />
      )}
    </div>
  );
}
