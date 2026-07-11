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
      <header className="backdrop-blur-md bg-gradient-to-r from-rose-500 to-rose-600 text-white border-b border-rose-400/50 sticky top-0 z-40 shadow-xl shadow-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center p-1 cursor-default">
              <img 
                src="https://res.cloudinary.com/dkvdbgijn/image/upload/v1783318134/education_tvpscl.png" 
                alt="Logo" 
                className="h-10 w-10 object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-black text-lg tracking-wider text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]">
                CET TO COLLEGE
              </span>
              <span className="text-[9px] text-rose-300/60 font-mono tracking-widest uppercase font-bold">
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
                className="flex items-center space-x-1.5 px-4 py-2 text-sm bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold rounded-xl transition-all cursor-pointer"
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
                  className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                    showFavoritesOnly
                      ? "bg-rose-500/15 text-rose-400 border-rose-500/30 shadow-xs"
                      : "bg-slate-100 text-slate-800 border-rose-400/50 hover:bg-slate-200"
                  }`}
                >
                  <Heart className={`h-4 w-4 ${showFavoritesOnly ? "fill-rose-400 text-rose-400" : ""}`} />
                  <span className="hidden sm:inline">Favorites</span>
                  <span className="bg-rose-500/20 text-rose-300 text-xs px-2 py-0.5 rounded-full font-black">
                    {favoritesCount}
                  </span>
                </button>

                {/* User info */}
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-sm font-extrabold text-white">
                    {currentUser.firstName} {currentUser.lastName}
                  </span>
                  <span className="text-[10px] text-slate-700 font-mono">{currentUser.email}</span>
                </div>

                <button
                  id="logout-btn"
                  onClick={onLogout}
                  title="Logout"
                  className="p-2 text-slate-700 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xs w-full p-6 border border-rose-400/50 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-display font-black text-center text-rose-400 mb-4 text-sm uppercase tracking-wider">
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
                  className="w-full text-center tracking-widest font-mono text-xl px-3 py-3 bg-slate-100 border border-rose-400/50 rounded-2xl text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-hidden transition-all"
                  autoFocus
                />
                {errorMsg && (
                  <p className="text-rose-400 text-xs mt-2 text-center font-bold">
                    {errorMsg}
                  </p>
                )}
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  id="cancel-admin-prompt"
                  onClick={() => setShowAdminPrompt(false)}
                  className="flex-1 py-3 text-xs bg-slate-100 hover:bg-slate-200 border border-rose-400/50 text-slate-800 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-admin-prompt"
                  className="flex-1 py-3 text-xs bg-rose-500 hover:bg-rose-600 text-black font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-rose-500/20"
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
