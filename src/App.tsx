import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import LoginView from "./components/LoginView";
import StudentDashboard from "./components/StudentDashboard";
import AdminPortal from "./components/AdminPortal";
import CollegeDetailsModal from "./components/CollegeDetailsModal";
import { College, StudentProfile } from "./types";
import { Loader2, ShieldAlert, Heart, LogOut } from "lucide-react";

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
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);

  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Load user session and colleges list on mount
  useEffect(() => {
    // Check for /admin path
    if (window.location.pathname === "/admin") {
      setShowPinEntry(true);
    }
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
      const { data, error } = await supabase
        .from('colleges')
        .select('*');
      
      if (error) throw error;
      setColleges(data || []);
      setIsFallbackMode(false);
    } catch (err: any) {
      console.error("Supabase error fetching colleges:", err);
      // Fallback to local data if needed, but the user requested fresh start
      setColleges([]);
    } finally {
      setLoadingColleges(false);
    }
  };

  // Student Profile Updates
  const handleUpdateProfile = async (updated: StudentProfile) => {
    // Save locally first for instant reactive response
    setCurrentUser(updated);
    localStorage.setItem("predictor_student", JSON.stringify(updated));

    // Sync active selected college favorite state if open
    if (selectedCollege) {
      const updatedSelected = colleges.find(c => c.id === selectedCollege.id);
      if (updatedSelected) {
        setSelectedCollege(updatedSelected);
      }
    }

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

      // Update with server's finalized data
      setCurrentUser(data.user);
      localStorage.setItem("predictor_student", JSON.stringify(data.user));
    } catch (err: any) {
      console.warn("Backend profile sync deferred, running locally:", err.message);
    }
  };

  // Login handler
  const handleLoginSuccess = async (user: StudentProfile) => {
    setCurrentUser(user);
    localStorage.setItem("predictor_student", JSON.stringify(user));

    // Sync logged in email user profile to backend & database
    if (user.email && !user.email.startsWith("guest_") && !user.email.endsWith("@predictor.local")) {
      try {
        await fetch("/api/auth/update-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            cetRank: user.cetRank,
            dcetScore: user.dcetScore,
            courses: user.courses || [],
            favorites: user.favorites || []
          })
        });
      } catch (err) {
        console.warn("Server profile sync error:", err);
      }
    }
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
    try {
      const { error } = await supabase
        .from('colleges')
        .upsert(college);
      
      if (error) throw error;
      await fetchColleges();
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  // Admin Actions: Delete College record
  const handleDeleteCollege = async (id: string) => {
    try {
      const { error } = await supabase
        .from('colleges')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      await fetchColleges();
    } catch (err: any) {
      throw new Error(err.message);
    }
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-rose-50 via-white to-pink-50 selection:bg-rose-500 selection:text-white text-slate-900 font-sans overflow-x-hidden">
      {/* Main Content Areas */}
      <main className="flex-grow">
        {loadingColleges ? (
          <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-10 w-10 text-rose-500 animate-spin mb-2" />
            <h3 className="font-display font-black text-xl text-slate-900 tracking-tight">Loading College Database</h3>
            <p className="text-xs text-slate-400 max-w-xs text-center font-medium">Connecting with secure credentials & setting up your counseling matching platform...</p>
          </div>
        ) : showPinEntry ? (
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass p-10 rounded-[3rem] shadow-2xl max-w-sm w-full text-center">
              <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto mb-6" />
              <h2 className="text-2xl font-black text-slate-900 mb-2">Admin Security</h2>
              <p className="text-sm text-slate-500 mb-8 font-medium">Please enter your 6-digit access PIN to manage the registry.</p>
              <input
                type="password"
                maxLength={6}
                value={adminPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setAdminPin(val);
                  if (val === "831067") {
                    setIsAdmin(true);
                    setShowPinEntry(false);
                    setAdminPin("");
                  }
                }}
                placeholder="••••••"
                className="w-full text-center text-4xl tracking-[0.5em] font-mono py-4 bg-white/40 border border-white/60 rounded-2xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none transition-all mb-4"
              />
              <button 
                onClick={() => {
                  setShowPinEntry(false);
                  window.history.pushState({}, "", "/");
                }}
                className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-all cursor-pointer"
              >
                Go back to student portal
              </button>
            </div>
          </div>
        ) : isAdmin ? (
          // Admin Workspace Module
          <AdminPortal
            colleges={colleges}
            onAddCollege={handleAddCollege}
            onDeleteCollege={handleDeleteCollege}
          />
        ) : currentUser ? (
          <>
            {/* Minimalist Floating Controls - hidden when info & details modal or fullscreen video is opened */}
            {!selectedCollege && !isVideoFullscreen && (
              <>
                <div className="fixed top-3 left-3 sm:top-6 sm:left-6 z-[100] flex items-center space-x-2 sm:space-x-3 pointer-events-auto">
                  <button
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className={`p-2.5 sm:p-3 rounded-full shadow-xl transition-all active:scale-90 cursor-pointer ${
                      showFavoritesOnly ? "bg-rose-500 text-white" : "glass text-rose-500"
                    }`}
                    title={showFavoritesOnly ? "Show All Colleges" : "Show Favorites"}
                  >
                    <Heart className={`h-4 w-4 sm:h-5 sm:w-5 ${showFavoritesOnly ? "fill-white" : ""}`} />
                  </button>
                  {showFavoritesOnly && (
                    <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-lg animate-in fade-in slide-in-from-left-2">
                      Favorites Only
                    </span>
                  )}
                </div>

                <div className="fixed top-3 right-3 sm:top-6 sm:right-6 z-[100]">
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="px-3 py-2 sm:px-4 sm:py-2.5 glass text-slate-700 hover:text-rose-500 rounded-full shadow-xl transition-all active:scale-90 cursor-pointer flex items-center space-x-1.5 sm:space-x-2 border border-white/60"
                    title="Exit Portal"
                  >
                    <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-500" />
                    <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider">Exit</span>
                  </button>
                </div>
              </>
            )}

            {/* Student Matched Workspace Module */}
            <StudentDashboard
              currentUser={currentUser}
              colleges={colleges}
              onUpdateProfile={handleUpdateProfile}
              onToggleFavorite={handleToggleFavoriteFromModal}
              onSelectCollege={setSelectedCollege}
              showFavoritesOnly={showFavoritesOnly}
              onVideoFullscreenChange={setIsVideoFullscreen}
            />
          </>
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

      {/* Student Exit Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-50 border border-rose-100 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
              <LogOut className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Confirm Exit</h3>
            <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">
              Are you sure you want to exit your student dashboard? You will be returned to the sign-in screen.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl transition-all cursor-pointer text-xs uppercase tracking-wider active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  handleLogout();
                }}
                className="py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl shadow-lg shadow-rose-500/25 transition-all cursor-pointer text-xs uppercase tracking-wider active:scale-95"
              >
                Yes, Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
