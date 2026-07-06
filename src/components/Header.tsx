import React, { useState } from "react";
import { School, LogOut, ShieldAlert, ArrowLeft, Heart } from "lucide-react";
import { StudentProfile } from "../types";

interface HeaderProps {
  currentUser: StudentProfile | null;
  isAdmin: boolean;
  onAdminAccess: (success: boolean) => void;
  onExitAdmin: () => void;
  onLogout: () => void;
  favoritesCount: number;
  onToggleShowFavorites: () => void;
  showFavoritesOnly: boolean;
}

export default function Header({
  currentUser,
  isAdmin,
  onAdminAccess,
  onExitAdmin,
  onLogout,
  favoritesCount,
  onToggleShowFavorites,
  showFavoritesOnly
}: HeaderProps) {
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [inputCode, setInputCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [logoClicks, setLogoClicks] = useState(0);

  const handleLogoClick = () => {
    if (isAdmin) {
      onExitAdmin();
    } else {
      const nextClicks = logoClicks + 1;
      setLogoClicks(nextClicks);
      if (nextClicks >= 4) {
        setShowAdminPrompt(true);
        setErrorMsg("");
        setInputCode("");
        setLogoClicks(0);
      }
    }
  };

  const handleAdminVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim() === "831067") {
      onAdminAccess(true);
      setShowAdminPrompt(false);
    } else {
      setErrorMsg("Incorrect passcode. Try again!");
    }
  };

  return (
    <>
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <button
              id="header-logo-btn"
              onClick={handleLogoClick}
              title="Click for Admin Portal"
              className="flex items-center justify-center p-1 hover:opacity-95 transition-all active:scale-95 duration-200 cursor-pointer group"
            >
              <img 
                src="https://res.cloudinary.com/dkvdbgijn/image/upload/v1783318134/education_tvpscl.png" 
                alt="Logo" 
                className="h-10 w-10 object-contain transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"
              />
            </button>
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg tracking-wider text-amber-900">
                CET TO COLLEGE
              </span>
              <span className="text-[9px] text-amber-700/60 font-mono tracking-widest uppercase font-bold">
                {isAdmin ? "🔧 ADMINISTRATIVE ACCESS" : "Smart Counselling"}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            {isAdmin ? (
              <button
                id="exit-admin-btn"
                onClick={onExitAdmin}
                className="flex items-center space-x-1.5 px-4 py-2 text-sm bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-medium rounded-xl transition-all cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Exit Admin</span>
              </button>
            ) : currentUser ? (
              <>
                {/* Favorites Filter */}
                <button
                  id="toggle-favorites-btn"
                  onClick={onToggleShowFavorites}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all cursor-pointer ${
                    showFavoritesOnly
                      ? "bg-rose-50 text-rose-700 border-rose-200 shadow-xs"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <Heart className={`h-4 w-4 ${showFavoritesOnly ? "fill-rose-500 text-rose-500" : ""}`} />
                  <span className="hidden sm:inline">Favorites</span>
                  <span className="bg-rose-100 text-rose-800 text-xs px-2 py-0.5 rounded-full font-bold">
                    {favoritesCount}
                  </span>
                </button>

                {/* User info */}
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-sm font-semibold text-gray-800">
                    {currentUser.firstName} {currentUser.lastName}
                  </span>
                  <span className="text-xs text-gray-500">{currentUser.email}</span>
                </div>

                <button
                  id="logout-btn"
                  onClick={onLogout}
                  title="Logout"
                  className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {/* Admin Passcode Dialog Prompt */}
      {showAdminPrompt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xs w-full p-5 border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-display font-semibold text-center text-gray-800 mb-3 text-sm">
              🔑 Enter Admin Code
            </h3>

            <form onSubmit={handleAdminVerify} className="space-y-4">
              <div>
                <input
                  id="admin-passcode-input"
                  type="password"
                  maxLength={6}
                  value={inputCode}
                  onChange={(e) => {
                    setInputCode(e.target.value.replace(/\D/g, ""));
                    setErrorMsg("");
                  }}
                  placeholder="••••••"
                  className="w-full text-center tracking-widest font-mono text-xl px-3 py-2 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden"
                  autoFocus
                />
                {errorMsg && (
                  <p className="text-rose-500 text-xs mt-1 text-center font-medium">
                    {errorMsg}
                  </p>
                )}
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  id="cancel-admin-prompt"
                  onClick={() => setShowAdminPrompt(false)}
                  className="flex-1 py-2 text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-medium rounded-lg transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-admin-prompt"
                  className="flex-1 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all cursor-pointer"
                >
                  Verify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
