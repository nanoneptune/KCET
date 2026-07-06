import React, { useState, useEffect, useMemo } from "react";
import { 
  Search, Sliders, Heart, School, Sparkles, MapPin, DollarSign, Award, 
  BookOpen, CheckSquare, Square, Info, Compass, Loader2, ChevronDown, 
  ChevronUp, Zap, Target, TrendingUp, ListOrdered, Share2, Download, Filter,
  FileDown, Globe, RefreshCw, ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { College, StudentProfile } from "../types";
import { ALL_COURSES } from "../coursesData";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

interface StudentDashboardProps {
  currentUser: StudentProfile;
  colleges: College[];
  onUpdateProfile: (updated: StudentProfile) => Promise<void>;
  onSelectCollege: (college: College) => void;
  showFavoritesOnly: boolean;
}

const CATEGORIES = ["GM", "SC", "ST", "OBC", "KKR", "EWS", "C1", "2A", "2B", "3A", "3B"];
const ROUNDS = ["R1", "R2", "R3"];

export default function StudentDashboard({
  currentUser,
  colleges,
  onUpdateProfile,
  onSelectCollege,
  showFavoritesOnly
}: StudentDashboardProps) {
  // Wizard Step State
  const [step, setStep] = useState(1);
  
  // Local profile editing states
  const [cetRank, setCetRank] = useState<string>(currentUser.cetRank?.toString() || "");
  const [selectedCourses, setSelectedCourses] = useState<string[]>(currentUser.courses || []);
  const [category, setCategory] = useState("GM");
  const [round, setRound] = useState("R1");
  const [isTierFilterOpen, setIsTierFilterOpen] = useState(false);
  
  // UI States
  const [courseSearch, setCourseSearch] = useState("");
  const [collegeSearch, setCollegeSearch] = useState("");

  // AI Recommendation State
  const [aiReport, setAiReport] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  // Tinder Swipe matcher states
  const [viewMode, setViewMode] = useState<"swipe" | "list">("swipe");
  const [swipeIndex, setSwipeIndex] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [inAppSiteUrl, setInAppSiteUrl] = useState<string | null>(null);
  const [interactWithIframe, setInteractWithIframe] = useState(false);
  const [reportViewMode, setReportViewMode] = useState<"pdf" | "raw">("pdf");

  // Reset active image index and iframe interaction when college card shifts
  useEffect(() => {
    setActiveImageIndex(0);
    setInteractWithIframe(false);
  }, [swipeIndex]);

  // Auto-switch to step 3 (exploration) when favorites mode is toggled on from header
  useEffect(() => {
    if (showFavoritesOnly) {
      setStep(3);
    }
  }, [showFavoritesOnly]);

  // Update local states if currentUser changes
  useEffect(() => {
    setCetRank(currentUser.cetRank?.toString() || "");
    setSelectedCourses(currentUser.courses || []);
  }, [currentUser]);

  const handleCourseToggle = (course: string) => {
    if (selectedCourses.includes(course)) {
      setSelectedCourses(selectedCourses.filter(c => c !== course));
    } else {
      setSelectedCourses([...selectedCourses, course]);
    }
  };

  const calculateProbability = (studentRank: number, cutoff: number) => {
    if (!cutoff || cutoff <= 0) return 0;
    if (studentRank <= cutoff) {
      // 90% to 100%
      const buffer = (cutoff - studentRank) / cutoff;
      return Math.min(99, 90 + buffer * 10);
    } else {
      // Below 90%
      const diff = studentRank - cutoff;
      const penalty = (diff / (cutoff * 0.4)) * 100;
      return Math.max(5, Math.round(90 - penalty));
    }
  };

  const getProbabilityLabel = (prob: number) => {
    if (prob >= 85) return { label: "Safe", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" };
    if (prob >= 50) return { label: "Moderate", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" };
    return { label: "Reach", color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" };
  };

  const handleToggleFavorite = async (collegeId: string) => {
    let updatedFavorites = [...(currentUser.favorites || [])];
    if (updatedFavorites.includes(collegeId)) {
      updatedFavorites = updatedFavorites.filter(id => id !== collegeId);
    } else {
      updatedFavorites.push(collegeId);
    }
    await onUpdateProfile({
      ...currentUser,
      favorites: updatedFavorites
    });
  };

  const handleCardDoubleClick = (collegeId: string) => {
    setShowHeartAnimation(true);
    if (!(currentUser.favorites || []).includes(collegeId)) {
      handleToggleFavorite(collegeId);
    }
    setTimeout(() => {
      setShowHeartAnimation(false);
    }, 800);
  };

  const handleSwipeLeft = () => {
    setSwipeIndex(prev => prev + 1);
  };

  const handleSwipeRight = (collegeId: string) => {
    if (!(currentUser.favorites || []).includes(collegeId)) {
      handleToggleFavorite(collegeId);
    }
    setSwipeIndex(prev => prev + 1);
  };

  const handleSwipeUp = (websiteUrl: string) => {
    if (websiteUrl) {
      setInAppSiteUrl(websiteUrl);
    }
  };

  const triggerAiPrediction = async () => {
    setLoadingAi(true);
    setShowAiModal(true);
    setAiReport("");
    try {
      const res = await fetch("/api/ai/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: currentUser.email,
          courses: selectedCourses,
          cetRank: cetRank ? Number(cetRank) : undefined,
          category,
          round
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiReport(data.prediction);
    } catch (err: any) {
      setAiReport(`### ❌ Connection Interrupted\n\nFailed to connect with AI Counselor. Error: ${err.message}`);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!aiReport) return;

    const doc = new jsPDF();
    const studentName = `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim();
    const rank = cetRank;
    const cat = category;

    // PAGE 1: COVER & FORECAST REPORT
    // 1. Header border/banner
    doc.setFillColor(26, 19, 11); // Rich Dark Charcoal
    doc.rect(0, 0, 210, 38, "F");

    // Decorative Gold Line
    doc.setFillColor(217, 119, 6); // Amber 600
    doc.rect(0, 38, 210, 3, "F");

    doc.setTextColor(251, 191, 36); // Amber 400
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("K-CET COUNSELLING CO-PILOT", 105, 18, { align: "center" });

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("OFFICIAL AI-POWERED STRATEGY FORECAST & ROADMAP", 105, 28, { align: "center" });

    // 2. Student Profile Section
    doc.setFillColor(248, 245, 240);
    doc.rect(15, 52, 180, 28, "F");
    doc.setDrawColor(217, 119, 6);
    doc.setLineWidth(0.5);
    doc.rect(15, 52, 180, 28, "D");

    doc.setTextColor(120, 53, 15); // Amber 900
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("OFFICIAL STUDENT PROFILE & METADATA", 20, 58);

    doc.setTextColor(51, 65, 85);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(`Name: ${studentName || "Guest User"}`, 20, 66);
    doc.text(`CET Rank: #${rank || "N/A"}`, 20, 73);
    doc.text(`Category: ${cat || "General"}`, 110, 66);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 110, 73);

    // 3. AI Forecast content
    doc.setTextColor(120, 53, 15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("AI STRATEGY FORECAST REPORT", 15, 92);

    doc.setDrawColor(217, 119, 6);
    doc.setLineWidth(0.8);
    doc.line(15, 95, 195, 95);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);

    // Filter out some markdown formatting like asterisks to keep text looking super neat
    const cleanedReport = aiReport
      .replace(/\*\*/g, "") // remove bold markers
      .replace(/###/g, "") // remove headers markers
      .replace(/##/g, "")
      .replace(/#/g, "");

    const textLines = doc.splitTextToSize(cleanedReport, 180);
    let yPosition = 103;
    const pageHeight = doc.internal.pageSize.height;

    for (let i = 0; i < textLines.length; i++) {
      if (yPosition > pageHeight - 35) {
        doc.addPage();
        yPosition = 25;
      }
      doc.text(textLines[i], 15, yPosition);
      yPosition += 5.5;
    }

    // Add Signature Section
    if (yPosition > pageHeight - 45) {
      doc.addPage();
      yPosition = 30;
    } else {
      yPosition += 10;
    }

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(15, yPosition, 195, yPosition);
    yPosition += 10;

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("This report is programmatically generated using the CET TO COLLEGE AI Counseling Inference Engine.", 15, yPosition);
    doc.text("Decisions should be double-checked against official cutoffs.", 15, yPosition + 4);

    // 4. Strategic Options Table (Always on a new page for perfect layout hygiene)
    if (strategicOptions && strategicOptions.length > 0) {
      doc.addPage();

      // Table Page Header Banner
      doc.setFillColor(26, 19, 11);
      doc.rect(0, 0, 210, 30, "F");
      
      doc.setFillColor(217, 119, 6);
      doc.rect(0, 30, 210, 2.5, "F");

      doc.setTextColor(251, 191, 36);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("RECOMMENDED STRATEGIC OPTION ENTRY", 105, 18, { align: "center" });

      doc.setTextColor(120, 53, 15);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("RECOMMENDED SEQUENCE CHART FOR COUNSELING ROUNDS", 15, 45);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text("Below is your optimal branch-wise preference order, sorted dynamically by Package vs. Admission Probability.", 15, 51);

      const tableData = strategicOptions.slice(0, 15).map((clg, index) => [
        String(index + 1),
        clg.name,
        clg.place,
        clg.bestMatchedCourse.courseName,
        `${clg.bestMatchedCourse.averagePackage} LPA`,
        `${clg.probability}%`
      ]);

      (doc as any).autoTable({
        startY: 56,
        head: [["Priority", "College Name", "Location", "Branch Name", "Placement Package", "Match Probability"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [120, 53, 15], textColor: [255, 255, 255], fontStyle: "bold" },
        styles: { fontSize: 8.5, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 15, halign: "center" },
          1: { cellWidth: 55 },
          2: { cellWidth: 25 },
          3: { cellWidth: 35 },
          4: { cellWidth: 25, halign: "right" },
          5: { cellWidth: 25, halign: "center" }
        }
      });
    }

    doc.save(`AI_Counselling_Strategy_Report_${currentUser.firstName || 'Student'}.pdf`);
  };

  // Colleges Filtering Engine
  const processedColleges = useMemo(() => {
    const rankVal = Number(cetRank) || 0;
    
    let list = colleges.map(college => {
      // Find best matched course
      const matchedCourses = college.courses?.filter(r => {
        if (selectedCourses.length > 0) {
          return selectedCourses.some(sc =>
            r.courseName.toLowerCase().includes(sc.toLowerCase()) || sc.toLowerCase().includes(r.courseName.toLowerCase())
          );
        }
        return true;
      }) || [];

      if (matchedCourses.length === 0) return null;

      // Filter by favorites if requested
      if (showFavoritesOnly && !(currentUser.favorites || []).includes(college.id)) {
        return null;
      }

      // Filter by search
      if (collegeSearch.trim() !== "") {
        const q = collegeSearch.toLowerCase();
        if (!college.name.toLowerCase().includes(q) && !college.place.toLowerCase().includes(q)) {
          return null;
        }
      }

      const bestMatchedCourse = matchedCourses[0];
      let effectiveCutoff = bestMatchedCourse?.cutoffRank || 0;
      if (bestMatchedCourse?.categoryCutoffs && bestMatchedCourse.categoryCutoffs[category]) {
        effectiveCutoff = bestMatchedCourse.categoryCutoffs[category];
      }

      const probability = rankVal > 0 ? calculateProbability(rankVal, effectiveCutoff) : 0;

      return { ...college, probability, bestMatchedCourse };
    })
    .filter((c): c is (College & { probability: number; bestMatchedCourse: any }) => c !== null);

    // Fallback: If filtered list is empty and we are NOT looking only at favorites, show some colleges from database
    if (list.length === 0 && !showFavoritesOnly) {
      list = colleges.map(college => {
        const bestMatchedCourse = college.courses?.[0] || { courseName: "General Engineering", cutoffRank: 50000, averagePackage: college.averagePackage || 6.5, fees: college.fees || 95000 };
        // Assign a default reasonable probability
        return {
          ...college,
          probability: 70,
          bestMatchedCourse
        };
      });
    }

    return list.sort((a, b) => b.probability - a.probability);
  }, [colleges, currentUser.favorites, showFavoritesOnly, collegeSearch, selectedCourses, category, cetRank]);

  // Strategic Option Entry List (Step 04)
  const strategicOptions = useMemo(() => {
    return [...processedColleges].sort((a, b) => {
      // Strategy: Reach first, then Moderate, then Safe (typical preference list logic)
      // or actually safe first to ensure admission? 
      // Usually users rank high to low preference.
      return b.bestMatchedCourse.averagePackage - a.bestMatchedCourse.averagePackage;
    });
  }, [processedColleges]);

  // Swiped college resolution
  const currentCollege = useMemo(() => {
    if (swipeIndex < 0 || swipeIndex >= processedColleges.length) return null;
    return processedColleges[swipeIndex];
  }, [processedColleges, swipeIndex]);

  const currentCollegeImages = useMemo(() => {
    if (!currentCollege) return [];
    const fallbacks = [
      "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1498243691581-b145c3f54a5c?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1562774053-701939374585?w=800&auto=format&fit=crop&q=80"
    ];
    if (!currentCollege.images || !Array.isArray(currentCollege.images) || currentCollege.images.length === 0) {
      return fallbacks;
    }
    const filtered = currentCollege.images.filter(img => img && img.trim() !== "");
    while (filtered.length < 5) {
      filtered.push(fallbacks[filtered.length % fallbacks.length]);
    }
    return filtered.slice(0, 5);
  }, [currentCollege]);

  const currentCollegeHasOfficialImages = useMemo(() => {
    if (!currentCollege) return false;
    return !!(currentCollege.images && Array.isArray(currentCollege.images) && currentCollege.images.filter(img => img && img.trim() !== "").length > 0);
  }, [currentCollege]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 pb-28 md:pb-12">
      
      {/* DESKTOP GLASSMORPHIC STEP CONTROLLER */}
      <div className="hidden md:flex items-center justify-between mb-12 w-full backdrop-blur-md bg-white/40 border border-white/60 p-2.5 rounded-3xl shadow-xs">
        {[
          { id: 1, label: "01 Enter Rank", icon: Target },
          { id: 2, label: "02 Pick Branches", icon: Compass },
          { id: 3, label: "03 Probabilities", icon: TrendingUp },
          { id: 4, label: "04 Entry Strategy", icon: ListOrdered },
        ].map((s) => {
          const isActive = step === s.id;
          const isSelectable = s.id === 1 || !!cetRank;
          return (
            <div key={s.id} className="flex items-center flex-1 justify-center last:flex-initial">
              <button
                onClick={() => isSelectable && setStep(s.id)}
                disabled={!isSelectable}
                className={`flex items-center space-x-3 px-4 py-2.5 rounded-2xl transition-all cursor-pointer relative ${
                  isActive 
                    ? "text-amber-900 font-bold scale-105 shadow-sm bg-white/90 border border-amber-200" 
                    : isSelectable 
                      ? "text-slate-600 hover:text-amber-900 hover:bg-white/30" 
                      : "text-slate-300 cursor-not-allowed opacity-40"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabDesktop"
                    className="absolute inset-0 bg-amber-500/5 rounded-2xl -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  isActive ? "bg-amber-700 text-white shadow-xs" : "bg-slate-100/60 text-slate-400"
                }`}>
                  <s.icon className="h-4 w-4" />
                </div>
                <span className="text-xs uppercase tracking-wider font-semibold">
                  {s.label}
                </span>
              </button>
              {s.id < 4 && <div className="w-6 h-[1.5px] bg-amber-200/30 mx-2 flex-grow max-w-10" />}
            </div>
          );
        })}
      </div>

      {/* MOBILE BOTTOM STICKY DOWN BAR FOOTER */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#fbf9f4]/98 backdrop-blur-md border-t border-amber-900/10 shadow-[0_-8px_30px_rgb(0,0,0,0.05)] px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {[
            { id: 1, label: "Rank", icon: Target },
            { id: 2, label: "Branches", icon: Compass },
            { id: 3, label: "Matches", icon: TrendingUp },
            { id: 4, label: "Strategy", icon: ListOrdered },
          ].map((s) => {
            const isActive = step === s.id;
            const isSelectable = s.id === 1 || !!cetRank;
            return (
              <button
                key={s.id}
                onClick={() => isSelectable && setStep(s.id)}
                disabled={!isSelectable}
                className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer relative ${
                  isActive 
                    ? "text-amber-800 font-bold scale-102" 
                    : isSelectable 
                      ? "text-slate-500 hover:text-amber-800" 
                      : "text-slate-300 cursor-not-allowed opacity-40"
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeTabMobile"
                    className="absolute inset-x-2 inset-y-1 bg-amber-500/10 rounded-xl -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <s.icon className={`h-5 w-5 ${isActive ? "text-amber-700 stroke-[2.2]" : "text-slate-400"}`} />
                <span className="text-[10px] mt-1 tracking-tight font-semibold">
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* STEP 01: RANK & CATEGORY */}
            <div className="backdrop-blur-md bg-white/70 border border-white/60 rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-amber-900/5 text-center">
              <label className="block text-[11px] font-bold text-amber-800/80 uppercase tracking-[0.25em] mb-8">
                Step 01: Enter your Rank & Category
              </label>
              
              <div className="max-w-xs mx-auto mb-10">
                <div className="relative">
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-black text-amber-900/20">#</span>
                  <input
                    type="text"
                    value={cetRank}
                    onChange={(e) => setCetRank(e.target.value.replace(/\D/g, ""))}
                    placeholder="Rank"
                    className="w-full text-7xl font-black text-amber-950 placeholder:text-amber-100/50 border-none focus:ring-0 p-0 text-center tabular-nums outline-hidden"
                  />
                </div>
                <p className="text-xs text-amber-900/50 mt-3 font-medium">Your KCET / DCET score/rank</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-amber-800/70 uppercase tracking-widest ml-1">Category</label>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full appearance-none bg-white/50 border border-amber-200/40 rounded-2xl px-6 py-4 text-amber-950 font-bold focus:ring-4 focus:ring-amber-500/10 focus:border-amber-600 outline-hidden transition-all cursor-pointer"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-amber-700 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-amber-800/70 uppercase tracking-widest ml-1">Counseling Round</label>
                  <div className="flex p-1 bg-white/50 border border-amber-200/40 rounded-2xl">
                    {ROUNDS.map(r => (
                      <button
                        key={r}
                        onClick={() => setRound(r)}
                        className={`flex-1 py-3.5 text-sm font-bold rounded-xl transition-all cursor-pointer ${
                          round === r 
                          ? "bg-amber-700 text-white shadow-md shadow-amber-700/10" 
                          : "text-slate-400 hover:text-amber-800"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                disabled={!cetRank}
                onClick={() => setStep(2)}
                className="mt-10 w-full py-5 bg-amber-700 hover:bg-amber-800 disabled:bg-slate-200/80 disabled:text-slate-400 text-white rounded-2xl font-bold transition-all flex items-center justify-center space-x-2 group shadow-lg shadow-amber-900/10 active:scale-99"
              >
                <span>Continue to Branches</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* STEP 02: BRANCHES */}
            <div className="backdrop-blur-md bg-white/70 border border-white/60 rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-amber-900/5">
              <div className="flex items-center justify-between mb-8">
                <label className="block text-[11px] font-bold text-amber-800/80 uppercase tracking-[0.25em]">
                  Step 02: Pick your preferred branches
                </label>
                <div className="text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200/50 px-3 py-1 rounded-full">
                  {selectedCourses.length} Selected
                </div>
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-700/40" />
                <input
                  type="text"
                  placeholder="Search branches (e.g. CSE, Civil...)"
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/50 border border-amber-200/40 rounded-2xl text-sm font-bold placeholder:text-amber-900/20 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-600 outline-hidden transition-all"
                />
              </div>

              <div className="flex flex-wrap gap-2 max-h-96 overflow-y-auto p-2 scrollbar-hide">
                {ALL_COURSES.filter(c => c.toLowerCase().includes(courseSearch.toLowerCase())).map(course => {
                  const isSelected = selectedCourses.includes(course);
                  const isHot = ["Computer Science", "Information Science", "AI & DS"].some(h => course.includes(h));
                  return (
                    <button
                      key={course}
                      onClick={() => handleCourseToggle(course)}
                      className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border cursor-pointer ${
                        isSelected
                        ? "bg-amber-700 border-amber-700 text-white shadow-lg shadow-amber-700/15"
                        : "bg-white/80 border-amber-200/40 text-slate-600 hover:border-amber-400 hover:text-amber-900"
                      }`}
                    >
                      {isHot && <Zap className={`h-3 w-3 ${isSelected ? "text-amber-300 animate-pulse" : "text-amber-500"}`} />}
                      <span>{course}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-10">
                <button
                  onClick={() => setStep(1)}
                  className="py-5 bg-white/40 hover:bg-white/80 border border-amber-200/40 text-slate-500 hover:text-amber-950 rounded-2xl font-bold transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="py-5 bg-amber-700 hover:bg-amber-800 text-white rounded-2xl font-bold transition-all flex items-center justify-center space-x-2 group shadow-lg shadow-amber-900/10 cursor-pointer active:scale-99"
                >
                  <span>Predict My Colleges</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* STEP 03: HEADER & TOGGLE */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
              <div>
                <h1 className="text-2xl font-black text-amber-950 tracking-tight">College Exploration</h1>
                <p className="text-xs text-amber-900/60 font-bold uppercase tracking-wider mt-1">Based on rank #{Number(cetRank).toLocaleString()} · {category}</p>
              </div>
              <div className="flex items-center flex-wrap gap-2.5">
                {/* Segmented view controller */}
                <div className="flex bg-amber-950/5 border border-amber-900/10 p-1 rounded-xl shrink-0">
                  <button
                    onClick={() => setViewMode("swipe")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center space-x-1 ${viewMode === "swipe" ? "bg-amber-700 text-white shadow-xs" : "text-amber-900/60 hover:text-amber-950"}`}
                  >
                    <span>Swipe Matcher 🔥</span>
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center space-x-1 ${viewMode === "list" ? "bg-amber-700 text-white shadow-xs" : "text-amber-900/60 hover:text-amber-950"}`}
                  >
                    <span>List View 📋</span>
                  </button>
                </div>

                <button 
                  onClick={() => setStep(2)}
                  className="p-2.5 bg-white/80 border border-amber-200/50 rounded-xl text-amber-800/80 hover:text-amber-900 hover:border-amber-400 transition-all cursor-pointer"
                  title="Filter Branches"
                >
                  <Filter className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* THREE VIEWS: FAVORITES CARDS GRID OR TWO MATCHING VIEWS */}
            {showFavoritesOnly ? (
              /* FAVORITES GRID VIEW WITH BEAUTIFUL DETAILED CARDS */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {processedColleges.length > 0 ? (
                  processedColleges.map((college) => {
                    const probInfo = getProbabilityLabel(college.probability);
                    const fallbacks = [
                      "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop&q=80",
                      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&auto=format&fit=crop&q=80",
                      "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=800&auto=format&fit=crop&q=80"
                    ];
                    const collegeImg = (college.images && Array.isArray(college.images) && college.images.filter(img => img && img.trim() !== "")[0]) || fallbacks[0];

                    return (
                      <motion.div
                        layout
                        key={college.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        whileHover={{ y: -4 }}
                        onClick={() => onSelectCollege(college)}
                        className="bg-white rounded-3xl border border-amber-950/10 shadow-xl shadow-amber-950/5 overflow-hidden flex flex-col justify-between cursor-pointer group hover:border-amber-500/40 transition-all duration-300"
                      >
                        {/* Card Header Image */}
                        <div className="h-40 w-full relative overflow-hidden bg-slate-900 group/img">
                          <img
                            src={collegeImg}
                            alt={college.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent" />
                          
                          {/* Heart Button in corner */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(college.id);
                            }}
                            className="absolute right-3 top-3 p-2 bg-white/95 rounded-full shadow-md text-rose-500 hover:scale-110 active:scale-90 transition-transform cursor-pointer z-10"
                            title="Remove from favorites"
                          >
                            <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
                          </button>

                          {/* Probability Badge */}
                          <div className={`absolute left-3 top-3 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border backdrop-blur-md ${probInfo.bg}/90 ${probInfo.border}/40 ${probInfo.color} z-10`}>
                            {probInfo.label} ({college.probability}%)
                          </div>

                          {/* College Name & Place overlay */}
                          <div className="absolute bottom-3 left-4 right-4 text-white z-10">
                            <h3 className="font-extrabold text-sm line-clamp-1">{college.name}</h3>
                            <p className="text-[10px] text-slate-300 flex items-center mt-0.5 font-semibold">
                              <MapPin className="h-3 w-3 mr-1 shrink-0 text-amber-400" />
                              <span className="truncate">{college.place}</span>
                            </p>
                          </div>
                        </div>

                        {/* Card Content details */}
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-3.5">
                            {/* Best Matched Course detail */}
                            <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-500/10">
                              <span className="text-[8.5px] text-amber-700/60 font-black uppercase tracking-wider block">Recommended Branch</span>
                              <span className="text-xs font-black text-amber-950 block truncate mt-0.5">
                                {college.bestMatchedCourse?.courseName || "General Seat"}
                              </span>
                              <div className="flex justify-between items-center mt-2 pt-2 border-t border-amber-500/5 text-[10px] font-bold text-slate-500">
                                <span>Cutoff Rank:</span>
                                <span className="font-mono font-black text-amber-900">
                                  #{college.bestMatchedCourse?.cutoffRank ? college.bestMatchedCourse.cutoffRank.toLocaleString() : "N/A"}
                                </span>
                              </div>
                            </div>


                          </div>

                          {/* Explore button */}
                          <div className="w-full py-2.5 bg-amber-900/10 hover:bg-amber-950 hover:text-white border border-amber-800/10 text-amber-900 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-1">
                            <span>Explore Details</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-20 text-center bg-white/60 backdrop-blur-md rounded-[2.5rem] border border-dashed border-amber-200/60 flex flex-col items-center justify-center p-8">
                    <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4">
                      <Heart className="h-8 w-8 text-rose-400 animate-pulse" />
                    </div>
                    <h3 className="text-lg font-black text-amber-950">No favorited colleges yet</h3>
                    <p className="text-slate-500 text-xs mt-1 max-w-xs mx-auto">
                      Go back to matching mode and tap the <span className="text-rose-500">Heart ❤️</span> or double-tap cards to save colleges to your list!
                    </p>
                  </div>
                )}
              </div>
            ) : viewMode === "swipe" ? (
              /* DATING APP STYLE SWIPE INTERFACE */
              <div className="flex flex-col items-center justify-center py-4">
                {processedColleges.length > 0 ? (
                  swipeIndex >= processedColleges.length ? (
                    /* ALL SWIPED SCREEN */
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-full max-w-md backdrop-blur-md bg-white/70 border border-white/60 rounded-[2.5rem] p-10 text-center shadow-xl shadow-amber-950/5 space-y-6"
                    >
                      <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto relative">
                        <Sparkles className="h-10 w-10 text-amber-700" />
                        <span className="absolute -top-1 -right-1 text-2xl">🎉</span>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-black text-amber-950">You've swiped through all matches!</h3>
                        <p className="text-slate-500 text-xs leading-relaxed max-w-xs mx-auto">
                          Check out your <span className="font-extrabold text-rose-600">Favorites ❤️</span> in the top navigation bar, adjust your preferred cutoff branch settings, or review again below!
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => setSwipeIndex(0)}
                          className="w-full py-3.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center space-x-1.5"
                        >
                          <RefreshCw className="h-4 w-4" />
                          <span>Restart Swipe Swapping</span>
                        </button>
                        <button
                          onClick={() => setViewMode("list")}
                          className="w-full py-3 bg-white hover:bg-slate-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          Switch to List Mode
                        </button>
                      </div>
                    </motion.div>
                  ) : (() => {
                    const college = processedColleges[swipeIndex];
                    const probInfo = getProbabilityLabel(college.probability);
                    const isFav = (currentUser.favorites || []).includes(college.id);
                    return (
                      <div className="w-full max-w-md space-y-4">
                        {/* Swipe counter */}
                        <div className="flex items-center justify-between px-2 text-[10.5px] font-bold text-slate-500 uppercase tracking-widest">
                          <span>Swipe Card {swipeIndex + 1} of {processedColleges.length}</span>
                          <span className="text-amber-800 font-black">🔥 Match Mode</span>
                        </div>

                        {/* Interactive Swipe card container */}
                        <motion.div
                          layout
                          onDoubleClick={() => handleCardDoubleClick(college.id)}
                          className="h-[560px] w-full rounded-[2.5rem] border-4 border-white/80 shadow-2xl overflow-hidden relative bg-slate-950 text-white select-none group"
                          whileTap={{ scale: 0.985 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                          {/* Centered Beating Double-Tap Heart animation */}
                          <AnimatePresence>
                            {showHeartAnimation && (
                              <motion.div 
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 0.9] }}
                                exit={{ scale: 2, opacity: 0 }}
                                transition={{ duration: 0.6 }}
                                className="absolute inset-0 z-30 flex items-center justify-center bg-black/15 backdrop-blur-xs pointer-events-none"
                              >
                                <Heart className="h-32 w-32 text-rose-500 fill-rose-500 filter drop-shadow-2xl animate-pulse" />
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Image full filling middle section or Google Images embed */}
                          {currentCollegeHasOfficialImages ? (
                            <img
                              src={currentCollegeImages[activeImageIndex]}
                              className="w-full h-full object-cover absolute inset-0 z-0 select-none brightness-[0.82] transition-all duration-300"
                              alt={college.name}
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="absolute inset-0 z-0 bg-slate-900 overflow-hidden">
                              {interactWithIframe ? (
                                <iframe
                                  src={`https://www.google.com/search?igu=1&q=${encodeURIComponent(college.name)}+campus&tbm=isch`}
                                  className="w-full h-full border-0 absolute inset-0 z-0"
                                  title={`Google Image Search for ${college.name}`}
                                />
                              ) : (
                                <>
                                  <iframe
                                    src={`https://www.google.com/search?igu=1&q=${encodeURIComponent(college.name)}+campus&tbm=isch`}
                                    className="w-full h-full border-0 absolute inset-0 z-0 pointer-events-none opacity-80"
                                    title={`Google Image Search for ${college.name}`}
                                  />
                                  <div className="absolute inset-0 bg-black/35 flex flex-col items-center justify-center p-6 text-center">
                                    <Globe className="h-10 w-10 text-amber-400 mb-3 animate-bounce" />
                                    <p className="text-xs font-black uppercase tracking-wider text-amber-200 mb-1">
                                      Google Live Images Search
                                    </p>
                                    <p className="text-[10px] text-slate-300 max-w-xs mb-4">
                                      No official uploaded image. Tap below to scroll and explore live campus photos!
                                    </p>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setInteractWithIframe(true);
                                      }}
                                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl shadow-lg border border-amber-500/20 active:scale-95 transition-all cursor-pointer"
                                    >
                                      👆 Click to Interact
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}

                          {/* Top-to-bottom & bottom-to-top background gradients for absolute legibility */}
                          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none" />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent z-10 pointer-events-none" />

                          {/* Top Left: Cutoff Probability Match Badge */}
                          <div className="absolute left-4 top-4 z-20 pointer-events-none">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded-full border shadow-md backdrop-blur-md ${probInfo.bg} ${probInfo.border} ${probInfo.color}`}>
                              {probInfo.label} • {college.probability}% Match
                            </span>
                          </div>

                          {/* Corner miniature Thumbnail images (The requested 5 corner images) */}
                          <div className="absolute right-4 top-4 z-20 flex flex-col space-y-2">
                            {currentCollegeHasOfficialImages ? (
                              currentCollegeImages.map((imgUrl, idx) => (
                                <button
                                  key={idx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveImageIndex(idx);
                                  }}
                                  className={`w-9 h-9 rounded-xl overflow-hidden border-2 shadow-lg transition-all shrink-0 cursor-pointer hover:scale-110 active:scale-95 ${activeImageIndex === idx ? "border-amber-400 scale-105 shadow-amber-500/40" : "border-white/40 opacity-70"}`}
                                  title={`Campus View ${idx + 1}`}
                                >
                                  <img
                                    src={imgUrl}
                                    className="w-full h-full object-cover select-none pointer-events-none"
                                    referrerPolicy="no-referrer"
                                  />
                                </button>
                              ))
                            ) : (
                              <div className="flex flex-col space-y-2 items-center">
                                <span className="flex items-center space-x-1 px-2.5 py-1.5 bg-amber-600/90 text-white border border-amber-500/30 backdrop-blur-md rounded-xl text-[9px] font-black uppercase tracking-wider shadow-md">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1" />
                                  <span>Live</span>
                                </span>
                                {interactWithIframe && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setInteractWithIframe(false);
                                    }}
                                    className="w-9 h-9 rounded-xl bg-slate-900/95 border border-white/20 text-white flex items-center justify-center shadow-lg cursor-pointer hover:scale-105 active:scale-95 transition-all text-xs"
                                    title="Lock Swipe Gestures"
                                  >
                                    🔒
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Bottom College Description & Details section */}
                          <div className="absolute inset-x-0 bottom-0 p-6 md:p-8 z-20 space-y-4">
                            {/* College Title & Rating */}
                            <div className="flex justify-between items-start gap-4">
                              <div className="min-w-0">
                                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight truncate filter drop-shadow-md">
                                  {college.name}
                                </h2>
                                <div className="flex items-center space-x-1.5 text-xs font-extrabold text-amber-200 mt-1 filter drop-shadow-sm">
                                  <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                                  <span>{college.place}</span>
                                </div>
                              </div>
                              {/* Ratings Badge */}
                              <div className="flex items-center space-x-1 px-2.5 py-1 bg-amber-500/25 border border-amber-500/35 rounded-xl shrink-0 backdrop-blur-md">
                                <span className="text-amber-300 font-bold text-xs">⭐</span>
                                <span className="text-amber-100 font-black text-[11px]">
                                  {college.rating || (4.0 + (college.probability % 10) / 10).toFixed(1)}
                                </span>
                              </div>
                            </div>

                            {/* Best matched Course information */}
                            <div className="bg-white/5 backdrop-blur-xs border border-white/10 p-3 rounded-2xl space-y-1">
                              <span className="block text-[9px] font-bold text-amber-400 uppercase tracking-widest">Recommended cutoff match</span>
                              <div className="flex justify-between items-center">
                                <span className="font-extrabold text-xs text-white truncate mr-2">{college.bestMatchedCourse?.courseName}</span>
                                <span className="text-[10px] text-slate-300 shrink-0 font-mono">Cutoff: #{college.bestMatchedCourse?.cutoffRank}</span>
                              </div>
                            </div>



                            {/* Swipe Up indicators */}
                            <div
                              onClick={() => handleSwipeUp(college.website)}
                              className="flex items-center justify-center space-x-1.5 text-[9px] text-slate-300 font-black uppercase tracking-widest pt-2.5 border-t border-white/5 cursor-pointer hover:text-white transition-colors"
                            >
                              <span className="animate-bounce">Swipe Up or Tap to Browse official site ↗</span>
                            </div>
                          </div>
                        </motion.div>

                        {/* HIGH-END INTERACTIVE ACTIONS ROW (COOL DESIGN) */}
                        <div className="flex items-center justify-center gap-4 py-2">
                          {/* Reject / Pass button */}
                          <button
                            onClick={handleSwipeLeft}
                            className="w-14 h-14 bg-white hover:bg-rose-50 border border-gray-100 rounded-full flex items-center justify-center text-rose-500 shadow-lg hover:shadow-rose-500/10 active:scale-90 transition-all cursor-pointer shrink-0"
                            title="Pass"
                          >
                            <span className="text-xl font-bold">✕</span>
                          </button>

                          {/* Open in Browser In-App */}
                          <button
                            onClick={() => handleSwipeUp(college.website)}
                            className="px-6 py-3 bg-amber-950/5 hover:bg-amber-900/10 border border-amber-900/15 rounded-2xl text-amber-900 text-xs font-extrabold flex items-center space-x-1.5 active:scale-95 transition-all shadow-xs cursor-pointer"
                            title="Visit Official Website"
                          >
                            <Globe className="h-4 w-4 animate-spin-slow text-amber-700" />
                            <span>In-App Browser</span>
                          </button>

                          {/* Specs detail modal */}
                          <button
                            onClick={() => onSelectCollege(college)}
                            className="px-6 py-3 bg-white hover:bg-slate-50 border border-gray-200 rounded-2xl text-slate-700 text-xs font-extrabold flex items-center space-x-1.5 active:scale-95 transition-all shadow-xs cursor-pointer"
                            title="View Full Specifications"
                          >
                            <Info className="h-4 w-4 text-slate-400" />
                            <span>Specs</span>
                          </button>

                          {/* Save / Favorite button */}
                          <button
                            onClick={() => handleSwipeRight(college.id)}
                            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all cursor-pointer shrink-0 border ${isFav ? "bg-rose-500 border-rose-500 text-white shadow-rose-500/25" : "bg-white border-gray-100 text-rose-500 hover:bg-rose-50"}`}
                            title="Save / Favorite"
                          >
                            <Heart className={`h-6 w-6 ${isFav ? "fill-white" : ""}`} />
                          </button>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="space-y-3 w-full max-w-md">
                    <p className="text-center text-xs font-bold text-slate-500 mb-2">Recommended Colleges from Database</p>
                    {colleges.slice(0, 5).map(college => (
                      <div key={college.id} className="p-4 bg-white/80 border border-amber-100 rounded-3xl shadow-sm">
                        <h4 className="font-bold text-sm text-amber-950">{college.name}</h4>
                        <p className="text-xs text-slate-500">{college.place} • {college.courses?.[0]?.courseName || "Computer Science"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* ORIGINAL DETAILED PROBABILITY LIST VIEW */
              <div className="space-y-3">
                {processedColleges.length > 0 ? (
                  processedColleges.map((college) => {
                    const probInfo = getProbabilityLabel(college.probability);
                    return (
                      <motion.div
                        layout
                        key={college.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => onSelectCollege(college)}
                        className="backdrop-blur-md bg-white/70 border border-white/60 rounded-3xl p-5 shadow-xl shadow-amber-950/2 hover:border-amber-400/80 hover:shadow-md transition-all cursor-pointer group flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center space-x-4 flex-1 min-w-0">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center p-1.5 shrink-0 border shadow-xs bg-white border-amber-500/20`}>
                            <img src="https://res.cloudinary.com/dkvdbgijn/image/upload/v1783318134/education_tvpscl.png" alt="Logo" className="w-full h-full object-contain" />
                          </div>
                          <div className="min-w-0 overflow-hidden">
                            <h3 className="text-base font-black text-amber-950 group-hover:text-amber-800 transition-colors truncate">
                              {college.name}
                            </h3>
                            <div className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate text-slate-500">{college.place}</span>
                              <span className="text-amber-200">•</span>
                              <span className="text-amber-700 truncate font-semibold">{college.bestMatchedCourse?.courseName}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full inline-block mb-1 border ${probInfo.bg} ${probInfo.border} ${probInfo.color}`}>
                            {probInfo.label}
                          </div>
                          <div className="text-xl font-black text-amber-950 tabular-nums">
                            {college.probability}%
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="space-y-3 w-full">
                    <p className="text-center text-xs font-bold text-slate-500 mb-2">Recommended Colleges from Database</p>
                    {colleges.slice(0, 5).map(college => (
                      <div key={college.id} className="p-4 bg-white/80 border border-amber-100 rounded-3xl shadow-sm">
                        <h4 className="font-bold text-sm text-amber-950">{college.name}</h4>
                        <p className="text-xs text-slate-500">{college.place} • {college.courses?.[0]?.courseName || "Computer Science"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={triggerAiPrediction}
              className="w-full py-4 mt-6 bg-gradient-to-r from-amber-800 to-amber-950 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 hover:opacity-95 transition-all shadow-xl shadow-amber-950/20 cursor-pointer active:scale-99"
            >
              <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
              <span>Get AI Strategy Report</span>
            </button>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* STEP 04: STRATEGIC OPTIONS */}
            <div className="bg-[#1a130b] border border-amber-900/30 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-amber-950/40">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-black text-amber-100">Strategic Option Entry</h2>
                  <p className="text-xs text-amber-300/60 mt-1 uppercase tracking-widest font-bold">Recommended Sequence for Counseling</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2.5 bg-amber-900/20 hover:bg-amber-900/40 border border-amber-800/20 text-amber-300 rounded-xl transition-all cursor-pointer">
                    <Share2 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={async () => {
                      if (!aiReport) {
                        setLoadingAi(true);
                        setShowAiModal(true);
                        try {
                          const res = await fetch("/api/predict-cutoff", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              cetRank: Number(cetRank),
                              category,
                              courses: selectedCourses
                            })
                          });
                          const data = await res.json();
                          if (data.prediction) {
                            setAiReport(data.prediction);
                          } else {
                            setAiReport("### ❌ Prediction Error\n\nFailed to generate prediction report. Please try again.");
                          }
                        } catch (err: any) {
                          setAiReport(`### ❌ Connection Interrupted\n\nFailed to connect with AI Counselor. Error: ${err.message}`);
                        } finally {
                          setLoadingAi(false);
                        }
                      } else {
                        handleDownloadPDF();
                      }
                    }}
                    className="p-2.5 bg-amber-900/20 hover:bg-amber-900/40 border border-amber-800/20 text-amber-300 rounded-xl transition-all cursor-pointer"
                    title="Download Official Strategy PDF"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {strategicOptions.length > 0 ? (
                  strategicOptions.slice(0, 10).map((college, idx) => (
                    <div key={college.id} className="flex items-center space-x-4 group">
                      <div className="w-8 h-8 rounded-full bg-amber-900/30 border border-amber-800/40 flex items-center justify-center text-xs font-black text-amber-200 group-hover:border-amber-400 group-hover:text-amber-400 transition-all shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 bg-amber-900/10 border border-amber-900/45 rounded-2xl p-4 hover:border-amber-800/70 transition-all">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-amber-50 truncate">{college.name}</h4>
                            <p className="text-[10px] text-amber-400/70 uppercase tracking-wider font-bold mt-0.5 truncate">{college.bestMatchedCourse.courseName}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${getProbabilityLabel(college.probability).bg} ${getProbabilityLabel(college.probability).border} ${getProbabilityLabel(college.probability).color}`}>
                              {getProbabilityLabel(college.probability).label}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-10 text-amber-300/40 font-bold">No strategic data available yet.</p>
                )}
              </div>

              {/* INLINE AI STRATEGY ADVISORY REPORT */}
              <div className="mt-8 border-t border-amber-900/40 pt-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
                    <h3 className="text-lg font-black text-amber-100">AI Strategy Advisory Report</h3>
                  </div>
                  {!loadingAi && aiReport && (
                    <button
                      onClick={handleDownloadPDF}
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-[#1d1610] rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 transition-all cursor-pointer shadow-md"
                      title="Download Official PDF"
                    >
                      <FileDown className="h-4 w-4" />
                      <span>Download PDF</span>
                    </button>
                  )}
                </div>

                {loadingAi ? (
                  <div className="flex flex-col items-center justify-center py-12 bg-white/5 border border-white/10 rounded-3xl">
                    <div className="relative">
                      <Loader2 className="h-10 w-10 text-amber-500 animate-spin mb-3" />
                      <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-amber-400 animate-bounce" />
                    </div>
                    <p className="font-extrabold text-amber-400 uppercase tracking-widest text-[9px]">Generating Advisory Forecast...</p>
                  </div>
                ) : aiReport ? (
                  /* BEAUTIFULLY STYLED INLINE ADVISORY VIEW */
                  <div className="bg-white text-slate-800 rounded-3xl p-6 md:p-8 font-sans shadow-xl border border-amber-500/10 relative select-text">
                    {/* Metadata Grid */}
                    <div className="bg-[#fbf9f4] border border-amber-500/25 rounded-2xl p-4 mb-6 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 font-extrabold uppercase tracking-wider text-[8px]">Student Name</span>
                        <p className="font-extrabold text-amber-950 mt-0.5">{currentUser.firstName || "Guest"} {currentUser.lastName || "User"}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-extrabold uppercase tracking-wider text-[8px]">Counselling Category</span>
                        <p className="font-extrabold text-amber-950 mt-0.5">{category || "General"}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-extrabold uppercase tracking-wider text-[8px]">Karnataka CET Rank</span>
                        <p className="font-extrabold text-amber-950 mt-0.5">#{cetRank || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-extrabold uppercase tracking-wider text-[8px]">Report Issue Date</span>
                        <p className="font-extrabold text-amber-950 mt-0.5">{new Date().toLocaleDateString()}</p>
                      </div>
                    </div>

                    {/* Report Content */}
                    <div className="prose prose-slate max-w-none text-slate-700 whitespace-pre-line leading-relaxed text-[13px] font-medium">
                      {aiReport.replace(/\*\*/g, "").replace(/###/g, "").replace(/##/g, "").replace(/#/g, "")}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-white/5 border border-dashed border-amber-900/30 rounded-3xl">
                    <p className="text-xs text-amber-300/60 font-semibold mb-4">Unlock an advanced AI-powered admission forecast for your rank & category.</p>
                    <button
                      onClick={triggerAiPrediction}
                      className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer inline-flex items-center space-x-1.5"
                    >
                      <Sparkles className="h-4 w-4 text-amber-200" />
                      <span>Generate Forecast Report</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-8 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">Strategic Advice</h5>
                    <p className="text-xs text-amber-200/70 leading-relaxed">We've ranked these by **Package vs. Probability**. Rank high-package colleges first even if they are 'Reach' matches. Always include 2-3 'Safe' colleges at the end of your list.</p>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setStep(3)}
                className="w-full mt-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all text-xs uppercase tracking-[0.2em] border border-white/5 cursor-pointer"
              >
                Back to results
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* IN-APP WEB BROWSER MODAL */}
      {inAppSiteUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-250">
          <div className="w-full max-w-6xl h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            {/* Browser top header toolbar bar */}
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0 flex-wrap gap-2">
              <div className="flex items-center space-x-3 flex-1 min-w-[200px]">
                <div className="flex space-x-1.5 shrink-0">
                  <div className="w-3 h-3 bg-rose-400 rounded-full" />
                  <div className="w-3 h-3 bg-amber-400 rounded-full" />
                  <div className="w-3 h-3 bg-emerald-400 rounded-full" />
                </div>
                <div className="bg-slate-200/50 border border-slate-200/40 px-4 py-1.5 rounded-full text-xs font-mono text-slate-600 truncate flex items-center space-x-2 flex-1 max-w-lg">
                  <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{inAppSiteUrl}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <a
                  href={inAppSiteUrl.startsWith("http") ? inAppSiteUrl : `https://${inAppSiteUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl cursor-pointer shadow-sm active:scale-95 transition-all flex items-center space-x-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open in New Tab</span>
                </a>
                <button
                  onClick={() => setInAppSiteUrl(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl cursor-pointer shadow-sm active:scale-95 transition-all"
                >
                  Close Browser
                </button>
              </div>
            </div>

            {/* Friendly CSP Frame Embedding Advisory Banner */}
            <div className="bg-amber-50 border-b border-amber-200/60 px-6 py-2.5 flex items-center justify-between text-amber-900 text-xs font-semibold shrink-0 flex-wrap gap-1.5">
              <span className="flex items-center">
                <Info className="h-4 w-4 mr-2 text-amber-600 shrink-0" />
                <span>Note: If this college portal fails to load or says "took too long to respond", it is due to security policies restricting frame embedding. Click "Open in New Tab" to view it directly.</span>
              </span>
              <a
                href={inAppSiteUrl.startsWith("http") ? inAppSiteUrl : `https://${inAppSiteUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-700 hover:text-amber-900 underline font-bold whitespace-nowrap"
              >
                Open Directly →
              </a>
            </div>

            {/* IFrame Viewport */}
            <div className="flex-1 w-full bg-slate-50 relative">
              <iframe
                src={inAppSiteUrl.startsWith("http") ? inAppSiteUrl : `https://${inAppSiteUrl}`}
                className="w-full h-full border-0 bg-white"
                title="In-App Web Browser"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
