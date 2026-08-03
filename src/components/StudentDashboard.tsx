import React, { useState, useEffect, useMemo } from "react";
import { 
  Search, Sliders, Heart, School, Sparkles, MapPin, DollarSign, Award, 
  BookOpen, CheckSquare, Square, Info, Compass, Loader2, ChevronDown, 
  ChevronUp, Zap, Target, TrendingUp, ListOrdered, Share2, Download, Filter,
  FileDown, Globe, RefreshCw, ExternalLink, X, ChevronLeft, ChevronRight, Video,
  Star, RotateCcw, ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { College, StudentProfile } from "../types";
import { ALL_COURSES } from "../coursesData";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import AutoPlayVideo from "./AutoPlayVideo";

interface StudentDashboardProps {
  currentUser: StudentProfile;
  colleges: College[];
  onUpdateProfile: (updated: StudentProfile) => Promise<void>;
  onToggleFavorite: (collegeId: string) => Promise<void>;
  onSelectCollege: (college: College) => void;
  showFavoritesOnly: boolean;
}

const CATEGORIES = ["General", "OBC", "SC/ST"];
const ROUNDS = ["1", "2", "3"];

export function StudentDashboard({
  currentUser,
  colleges,
  onUpdateProfile,
  onToggleFavorite,
  onSelectCollege,
  showFavoritesOnly
}: StudentDashboardProps) {
  // Wizard Step State
  const [step, setStep] = useState(1);
  
  // Local profile editing states
  const [cetRank, setCetRank] = useState<string>(currentUser.cetRank?.toString() || "");
  const [selectedCourses, setSelectedCourses] = useState<string[]>(currentUser.courses || []);
  const [category, setCategory] = useState("General");
  const [round, setRound] = useState("1");
  const [isTierFilterOpen, setIsTierFilterOpen] = useState(false);

  // Rank Type Switch (KCET vs DCET)
  const [rankType, setRankType] = useState<"KCET" | "DCET">("KCET");

  // Min / Max Range Filters
  const [minFees, setMinFees] = useState<number>(0);
  const [maxFees, setMaxFees] = useState<number>(300000);
  const [minCutoff, setMinCutoff] = useState<number>(0);
  const [maxCutoff, setMaxCutoff] = useState<number>(150000);
  
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
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | "up" | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Helper to format fees in Lakhs for clean display (e.g., 300,000 -> Rs. 3 Lakh)
  const formatFeeLimitDisplay = (amount: number) => {
    if (amount >= 100000) {
      const lakhVal = amount / 100000;
      return `Rs. ${lakhVal % 1 === 0 ? lakhVal : lakhVal.toFixed(1)} Lakh`;
    }
    return `Rs. ${(amount / 1000).toFixed(0)}k`;
  };
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [inAppSiteUrl, setInAppSiteUrl] = useState<string | null>(null);
  const [interactWithIframe, setInteractWithIframe] = useState(false);
  const [reportViewMode, setReportViewMode] = useState<"pdf" | "raw">("pdf");

  // Helper to compute 5-star rating (1 to 5)
  const calculateStarRating = (prob: number, avgPkg: number) => {
    let stars = 3;
    if (prob >= 85) stars += 1;
    if (prob >= 95) stars += 0.5;
    else if (prob >= 60) stars += 0.5;

    if (avgPkg >= 10) stars += 1;
    else if (avgPkg >= 7) stars += 0.5;

    if (prob < 40) stars -= 1;
    if (prob < 20) stars -= 1;

    return Math.min(5, Math.max(1, Math.round(stars)));
  };

  // Reset active image index and iframe interaction when college card shifts
  const dynamicAvailableCourses = useMemo(() => {
    const registryCourses = new Set<string>();
    colleges.forEach(c => {
      c.courses?.forEach(course => {
        if (course.courseName) registryCourses.add(course.courseName);
      });
    });
    
    // Merge with default courses and remove duplicates
    const combined = Array.from(new Set([...ALL_COURSES, ...Array.from(registryCourses)]));
    return combined.sort();
  }, [colleges]);

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

  const handleCardDoubleClick = (collegeId: string) => {
    setShowHeartAnimation(true);
    if (!(currentUser.favorites || []).includes(collegeId)) {
      onToggleFavorite(collegeId);
    }
    setTimeout(() => {
      setShowHeartAnimation(false);
    }, 800);
  };

  const handleSwipeLeft = () => {
    setSwipeDirection("left");
    setSwipeIndex(prev => prev + 1);
  };

  const handleSwipeRight = (collegeId: string) => {
    setSwipeDirection("right");
    setShowHeartAnimation(true);
    setTimeout(() => {
      setShowHeartAnimation(false);
      if (!(currentUser.favorites || []).includes(collegeId)) {
        onToggleFavorite(collegeId);
      }
      setSwipeIndex(prev => prev + 1);
    }, 450);
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
    try {
      const doc = new jsPDF();
      const studentName = `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim();
      const rank = cetRank;
      const cat = category;

      // PAGE 1: COVER & MANUAL COUNSELING REPORT
      doc.setFillColor(26, 19, 11);
      doc.rect(0, 0, 210, 38, "F");

      doc.setFillColor(244, 63, 94);
      doc.rect(0, 38, 210, 3, "F");

      doc.setTextColor(251, 113, 133);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("COUNSELING STRATEGY & ADVISORY REPORT", 105, 18, { align: "center" });

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`OFFICIAL ${rankType} MANUAL STRATEGY REPORT & RECOMMENDED SEQUENCE`, 105, 28, { align: "center" });

      // Student Profile Section
      doc.setFillColor(248, 245, 240);
      doc.rect(15, 48, 180, 30, "F");
      doc.setDrawColor(244, 63, 94);
      doc.setLineWidth(0.5);
      doc.rect(15, 48, 180, 30, "D");

      doc.setTextColor(120, 53, 15);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("STUDENT PROFILE & COUNSELING METADATA", 20, 55);

      doc.setTextColor(51, 65, 85);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text(`Name: ${studentName || "Guest Student"}`, 20, 63);
      doc.text(`Rank Mode: ${rankType} Rank #${rank || "N/A"}`, 20, 71);
      doc.text(`Category: ${cat || "General"}`, 110, 63);
      doc.text(`Counseling Round: Round ${round}`, 110, 71);

      // Recommended Sequence Table with Ratings
      doc.setTextColor(120, 53, 15);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("RECOMMENDED OPTION ENTRY SEQUENCE (5-STAR RATINGS)", 15, 90);

      doc.setDrawColor(244, 63, 94);
      doc.setLineWidth(0.8);
      doc.line(15, 93, 195, 93);

      const reportOptions = (strategicOptions && strategicOptions.length > 0) ? strategicOptions : processedColleges;

      if (reportOptions && reportOptions.length > 0) {
        const tableData = reportOptions.slice(0, 20).map((clg, index) => {
          const stars = calculateStarRating(clg.probability, clg.bestMatchedCourse.averagePackage);
          return [
            `#${index + 1}`,
            clg.name,
            clg.bestMatchedCourse.courseName,
            `${stars}/5 Stars`,
            `${clg.bestMatchedCourse.averagePackage || 0} LPA`,
            `${clg.probability}%`
          ];
        });

        autoTable(doc, {
          startY: 97,
          head: [["Priority", "College Name", "Branch Name", "Rating", "Avg Package", "Match Prob"]],
          body: tableData,
          theme: "striped",
          headStyles: { fillColor: [120, 53, 15], textColor: [255, 255, 255], fontStyle: "bold" },
          styles: { fontSize: 8, cellPadding: 2.5 },
          columnStyles: {
            0: { cellWidth: 15, halign: "center" },
            1: { cellWidth: 55 },
            2: { cellWidth: 40 },
            3: { cellWidth: 35, halign: "center" },
            4: { cellWidth: 20, halign: "right" },
            5: { cellWidth: 15, halign: "center" }
          }
        });
      }

      // Counseling Strategy Rules
      let finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 12 : 120;
      if (finalY > 250) {
        doc.addPage();
        finalY = 25;
      }

      doc.setTextColor(120, 53, 15);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("COUNSELING OPTION ENTRY GUIDELINES", 15, finalY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text("- Rule 1: Place high placement dream options in Option Position #1 to #3.", 15, finalY + 6);
      doc.text("- Rule 2: Keep target options with 60%-85% probability in Option Position #4 to #7.", 15, finalY + 12);
      doc.text("- Rule 3: Always list safe guarantee colleges (>90% probability) in Position #8+ to ensure seat allocation.", 15, finalY + 18);

      doc.save(`${rankType}_Counseling_Strategy_Report_${rank || 'Student'}.pdf`);
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      alert("Error generating PDF: " + (err.message || "Unknown error"));
    }
  };

  // Colleges Filtering Engine
  const processedColleges = useMemo(() => {
    const rankVal = Number(cetRank) || 0;
    
    let list = colleges.map(college => {
      // Find matched courses that satisfy branch selection, fee range, and cutoff range
      const matchedCourses = college.courses?.filter(r => {
        // Fee filter
        const cFees = r.fees || college.fees || 0;
        if (cFees < minFees || cFees > maxFees) return false;

        // Cutoff calculation
        let cutoff = rankType === "DCET" ? (r.dcetCutoffRank || r.cutoffRank || 0) : (r.cutoffRank || 0);
        if (r.categories) {
          const catObj = r.categories.find((c: any) => c.name === category);
          if (catObj) {
            cutoff = rankType === "DCET" && catObj.dcetCutoff ? catObj.dcetCutoff : catObj.cutoff;
          }
        }

        // Cutoff range filter
        if (minCutoff > 0 && cutoff < minCutoff) return false;
        if (maxCutoff < 150000 && cutoff > maxCutoff) return false;

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
      let effectiveCutoff = rankType === "DCET"
        ? (bestMatchedCourse?.dcetCutoffRank || bestMatchedCourse?.cutoffRank || 0)
        : (bestMatchedCourse?.cutoffRank || 0);
      
      // Handle categories array structure
      if (bestMatchedCourse?.categories) {
        const catObj = bestMatchedCourse.categories.find((c: any) => c.name === category);
        if (catObj) {
          effectiveCutoff = rankType === "DCET" && catObj.dcetCutoff ? catObj.dcetCutoff : catObj.cutoff;
        }
      }

      const probability = rankVal > 0 ? calculateProbability(rankVal, effectiveCutoff) : 0;

      return { ...college, probability, bestMatchedCourse, effectiveCutoff };
    })
    .filter((c): c is (College & { probability: number; bestMatchedCourse: any; effectiveCutoff: number }) => c !== null);

    // Fallback: If filtered list is empty and we are NOT looking only at favorites, show colleges from database
    if (list.length === 0 && !showFavoritesOnly) {
      list = colleges.map(college => {
        const bestMatchedCourse = college.courses?.[0] || { courseName: "General Engineering", cutoffRank: 50000, averagePackage: college.averagePackage || 6.5, fees: college.fees || 95000 };
        return {
          ...college,
          probability: 70,
          bestMatchedCourse,
          effectiveCutoff: bestMatchedCourse.cutoffRank || 50000
        };
      });
    }

    return list.sort((a, b) => b.probability - a.probability);
  }, [colleges, currentUser.favorites, showFavoritesOnly, collegeSearch, selectedCourses, category, cetRank, rankType, minFees, maxFees, minCutoff, maxCutoff]);

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
      "https://res.cloudinary.com/dkvdbgijn/image/upload/v1783318134/education_tvpscl.png"
    ];
    if (!currentCollege.images || !Array.isArray(currentCollege.images) || currentCollege.images.length === 0) {
      return fallbacks;
    }
    const filtered = currentCollege.images.filter(img => img && img.trim() !== "");
    if (filtered.length === 0) return fallbacks;
    return filtered.slice(0, 5);
  }, [currentCollege]);

  const currentCollegeHasOfficialImages = useMemo(() => {
    if (!currentCollege) return false;
    return !!(currentCollege.images && Array.isArray(currentCollege.images) && currentCollege.images.filter(img => img && img.trim() !== "").length > 0);
  }, [currentCollege]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 pb-28 md:pb-12 text-slate-100">
      
      {/* DESKTOP GLASSMORPHIC STEP CONTROLLER */}
      <div className="hidden md:flex items-center justify-between mb-12 w-full backdrop-blur-md bg-slate-100 border border-slate-100 p-2.5 rounded-[2rem] shadow-xl shadow-black/25">
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
                    ? "text-rose-400 font-bold scale-105 shadow-md bg-slate-200 border border-slate-100" 
                    : isSelectable 
                      ? "text-slate-500 hover:text-rose-300 hover:bg-slate-100" 
                      : "text-slate-600 cursor-not-allowed opacity-40"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabDesktop"
                    className="absolute inset-0 bg-rose-500/5 rounded-2xl -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  isActive ? "bg-rose-500 text-white shadow-md font-bold" : "bg-slate-100 text-slate-500"
                }`}>
                  <s.icon className="h-4 w-4" />
                </div>
                <span className="text-xs uppercase tracking-wider font-semibold">
                  {s.label}
                </span>
              </button>
              {s.id < 4 && <div className="w-6 h-[1.5px] bg-slate-200 mx-2 flex-grow max-w-10" />}
            </div>
          );
        })}
      </div>

      {/* MOBILE BOTTOM STICKY DOWN BAR FOOTER */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-100 shadow-2xl px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
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
                    ? "text-rose-400 font-bold scale-102" 
                    : isSelectable 
                      ? "text-slate-500 hover:text-rose-300" 
                      : "text-slate-600 cursor-not-allowed opacity-40"
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeTabMobile"
                    className="absolute inset-x-2 inset-y-1 bg-rose-500/10 rounded-xl -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <s.icon className={`h-5 w-5 ${isActive ? "text-rose-400 stroke-[2.2]" : "text-slate-500"}`} />
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
            className="w-full max-w-sm mx-auto relative pt-4 pb-24"
          >
            {/* STEP 01: RANK & CATEGORY */}
            <div className="backdrop-blur-md bg-white/90 border border-slate-100 rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-black/40 text-center">
              <label className="block text-[11px] font-black text-rose-400 uppercase tracking-[0.25em] mb-8">
                Step 01: Enter your Rank & Category
              </label>
              
              <div className="max-w-xs mx-auto mb-10">
                <div className="relative">
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-black text-rose-400/20">#</span>
                  <input
                    type="text"
                    value={cetRank}
                    onChange={(e) => setCetRank(e.target.value.replace(/\D/g, ""))}
                    placeholder="Rank"
                    className="w-full text-7xl font-black text-slate-900 placeholder:text-slate-800 border-none focus:ring-0 p-0 text-center tabular-nums outline-hidden"
                  />
                </div>
                {/* KCET vs DCET Switch Button */}
                <div className="mt-4 flex flex-col items-center">
                  <div className="inline-flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setRankType("KCET")}
                      className={`px-6 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                        rankType === "KCET"
                          ? "bg-rose-500 text-white shadow-md shadow-rose-500/20 scale-102"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      KCET Rank
                    </button>
                    <button
                      type="button"
                      onClick={() => setRankType("DCET")}
                      className={`px-6 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                        rankType === "DCET"
                          ? "bg-rose-500 text-white shadow-md shadow-rose-500/20 scale-102"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      DCET Rank
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 font-semibold">
                    Selected Mode: <span className="text-rose-500 font-black">{rankType}</span> Counseling
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-rose-400/80 uppercase tracking-widest ml-1">Category</label>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full appearance-none bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-slate-900 font-extrabold focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-hidden transition-all cursor-pointer"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat} className="bg-slate-900 text-slate-900">{cat}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-rose-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-rose-400/80 uppercase tracking-widest ml-1">Counseling Round</label>
                  <div className="flex p-1 bg-slate-50 border border-slate-100 rounded-2xl">
                    {ROUNDS.map(r => (
                      <button
                        key={r}
                        onClick={() => setRound(r)}
                        className={`flex-1 py-3.5 text-sm font-bold rounded-xl transition-all cursor-pointer ${
                          round === r 
                          ? "bg-rose-500 text-white shadow-md shadow-rose-500/10 font-extrabold" 
                          : "text-slate-500 hover:text-rose-300"
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
                className="mt-10 w-full py-5 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-100 disabled:text-slate-600 text-white rounded-2xl font-black transition-all flex items-center justify-center space-x-2 group shadow-lg shadow-rose-500/10 hover:shadow-rose-500/20 active:scale-99"
              >
                <span>Continue to Branches</span>
                <span className="group-hover:translate-x-1 transition-transform stroke-[2.5]">→</span>
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
            className="w-full max-w-sm mx-auto relative pt-4 pb-24"
          >
            {/* STEP 02: BRANCHES */}
            <div className="backdrop-blur-md bg-white/90 border border-slate-100 rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between mb-8">
                <label className="block text-[11px] font-black text-rose-400 uppercase tracking-[0.25em]">
                  Step 02: Pick your preferred branches
                </label>
                <div className="text-[11px] font-black text-rose-300 bg-rose-500/10 border border-rose-500/25 px-3.5 py-1.5 rounded-full">
                  {selectedCourses.length} Selected
                </div>
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search branches (e.g. CSE, Civil...)"
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 placeholder:text-slate-600 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-hidden transition-all"
                />
              </div>

              <div className="flex flex-wrap gap-2 max-h-96 overflow-y-auto p-2 scrollbar-hide">
                {dynamicAvailableCourses.filter(c => c.toLowerCase().includes(courseSearch.toLowerCase())).map(course => {
                  const isSelected = selectedCourses.includes(course);
                  const isHot = ["Computer Science", "Information Science", "AI & DS"].some(h => course.includes(h));
                  return (
                    <button
                      key={course}
                      onClick={() => handleCourseToggle(course)}
                      className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border cursor-pointer ${
                        isSelected
                        ? "bg-rose-500 border-rose-500 text-white font-extrabold shadow-lg shadow-rose-500/15"
                        : "bg-slate-100 border-slate-100 text-slate-600 hover:border-rose-500/50 hover:text-rose-400"
                      }`}
                    >
                      {isHot && <Zap className={`h-3 w-3 ${isSelected ? "text-rose-900 animate-pulse" : "text-rose-500"}`} />}
                      <span>{course}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-10">
                <button
                  onClick={() => setStep(1)}
                  className="py-5 bg-slate-100 hover:bg-slate-200 border border-slate-100 text-slate-600 rounded-2xl font-bold transition-all cursor-pointer active:scale-99"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="py-3.5 px-6 glass text-rose-500 border border-white/80 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center space-x-2 group shadow-sm active:scale-95 cursor-pointer"
                >
                  <span>Predict My Colleges</span>
                  <span className="group-hover:translate-x-1 transition-transform stroke-[2.5]">→</span>
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
            className="w-full max-w-sm mx-auto relative pt-4 pb-24"
          >
            {/* KAMA STYLE HEADER BACKGROUND */}
            <div className="absolute top-[-100px] left-[-20px] right-[-20px] h-[400px] bg-gradient-to-br from-rose-500 to-pink-500 rounded-b-[3rem] z-0 pointer-events-none" />

            <div className="relative z-10">
              {/* Header Matches */}
              <div className="px-2 mb-4 text-center">
                <h3 className="text-white font-black text-2xl mb-1 tracking-tight">Your Matches</h3>
                <p className="text-white/90 text-sm font-bold">{processedColleges.length} colleges available</p>
              </div>

              {/* Range Filters Panel: Borderless Simple Draggers */}
              <div className="py-2 mb-6 text-white space-y-3">
                {/* Fees Drag Line Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-bold text-white/90">
                    <span className="text-[11px] uppercase tracking-wider font-extrabold text-white/80">Fees Limit</span>
                    <span className="font-mono text-white font-black text-xs bg-white/10 px-2.5 py-1 rounded-md shadow-inner">
                      Up to {formatFeeLimitDisplay(maxFees)} / yr
                    </span>
                  </div>
                  <input
                    type="range"
                    min="20000"
                    max="300000"
                    step="5000"
                    value={maxFees}
                    onChange={(e) => {
                      setMinFees(0);
                      setMaxFees(Number(e.target.value));
                    }}
                    className="w-full appearance-none h-2 bg-white/30 rounded-lg outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:shadow-lg"
                  />
                </div>

                {/* Cutoff Rank Drag Line Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-bold text-white/90">
                    <span className="text-[11px] uppercase tracking-wider font-extrabold text-white/80">{rankType} Cutoff Rank</span>
                    <span className="font-mono text-white font-black text-xs bg-white/10 px-2.5 py-1 rounded-md shadow-inner">
                      Up to #{maxCutoff.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="150000"
                    step="1000"
                    value={maxCutoff}
                    onChange={(e) => {
                      setMinCutoff(0);
                      setMaxCutoff(Number(e.target.value));
                    }}
                    className="w-full appearance-none h-2 bg-white/30 rounded-lg outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:shadow-lg"
                  />
                </div>
              </div>

              {/* CARD CONTAINER WITH REALISTIC STACK LAYER */}
              <div className="relative mt-8 min-h-[580px]">
                {/* Floating pill */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 bg-white shadow-md text-rose-500 px-4 py-1.5 rounded-full flex items-center space-x-1 font-bold text-xs border border-rose-100">
                  <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                  <span>College Match</span>
                </div>

                {/* BACKGROUND STACK PREVIEW CARD */}
                {swipeIndex + 1 < processedColleges.length && (() => {
                  const nextCollege = processedColleges[swipeIndex + 1];
                  const nextHasImages = nextCollege.images && nextCollege.images.length > 0;
                  const nextImgUrl = nextHasImages ? nextCollege.images[0] : "";
                  const nextBestCourse = nextCollege.bestMatchedCourse || {};
                  return (
                    <div
                      key={nextCollege.id + "-stack-bg"}
                      className="absolute inset-0 bg-white w-full rounded-[2.5rem] shadow-md overflow-hidden text-slate-900 border border-slate-100 pointer-events-none transform scale-[0.94] translate-y-3 opacity-60 z-0 transition-all duration-300"
                    >
                      <div className="h-72 w-full relative bg-slate-900 flex items-center justify-center overflow-hidden">
                        {nextImgUrl ? (
                          <img src={nextImgUrl} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-rose-400 to-rose-600 flex flex-col items-center justify-center text-white/40">
                            <School className="w-20 h-20 opacity-40" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
                        <div className="absolute bottom-4 left-4 right-4 text-white">
                          <h2 className="text-2xl font-black leading-tight drop-shadow-md">{nextCollege.name}</h2>
                          <div className="flex items-center space-x-1 mt-1 text-sm font-semibold opacity-90">
                            <MapPin className="w-4 h-4" />
                            <span>{nextCollege.place} • {nextCollege.probability}% Match</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-6 opacity-60">
                        <p className="text-sm font-semibold text-slate-700 leading-snug mb-5 line-clamp-2">
                          {nextCollege.details || `Top college offering ${nextBestCourse.courseName || "various courses"} for your rank.`}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                <AnimatePresence mode="popLayout" custom={swipeDirection}>
                {swipeIndex < processedColleges.length ? (() => {
                  const college = processedColleges[swipeIndex];
                  const probInfo = getProbabilityLabel(college.probability);
                  const isFav = (currentUser.favorites || []).includes(college.id);
                  const hasImages = currentCollegeHasOfficialImages && currentCollegeImages.length > 0;
                  const imgUrl = hasImages ? currentCollegeImages[activeImageIndex] : "";
                  const bestCourse = college.bestMatchedCourse || {};
                  
                  return (
                    <motion.div
                      key={college.id}
                      custom={swipeDirection}
                      variants={{
                        initial: { opacity: 0, scale: 0.94, y: 12, rotate: 0 },
                        animate: { opacity: 1, scale: 1, y: 0, x: 0, rotate: 0 },
                        exit: (customDir) => {
                          if (customDir === "left") {
                            return { x: -650, rotate: -28, opacity: 0, scale: 0.8, transition: { duration: 0.35, ease: [0.32, 0.72, 0, 1] } };
                          }
                          if (customDir === "right") {
                            return { x: 650, rotate: 28, opacity: 0, scale: 0.8, transition: { duration: 0.35, ease: [0.32, 0.72, 0, 1] } };
                          }
                          if (customDir === "up") {
                            return { y: -650, opacity: 0, scale: 1.05, transition: { duration: 0.35, ease: [0.32, 0.72, 0, 1] } };
                          }
                          return { opacity: 0, scale: 0.85, x: -500, rotate: -20, transition: { duration: 0.35 } };
                        }
                      }}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ type: "spring", stiffness: 340, damping: 24 }}
                      drag={true}
                      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                      dragElastic={0.8}
                      onDragEnd={(e, { offset }) => {
                        // Horizontal Swipes
                        if (offset.x > 140) {
                          handleSwipeRight(college.id);
                        } else if (offset.x < -140) {
                          handleSwipeLeft();
                        }
                        
                        // Vertical Swipe Up
                        if (offset.y < -120) {
                          setSwipeDirection("up");
                          onSelectCollege(college);
                        }
                      }}
                      className="bg-white w-full rounded-[2.5rem] shadow-2xl overflow-hidden text-slate-900 border border-slate-100 relative cursor-grab active:cursor-grabbing z-10"
                    >
                      {/* Heart Animation Overlay */}
                      <AnimatePresence>
                        {showHeartAnimation && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 0.9] }}
                            exit={{ scale: 2, opacity: 0 }}
                            transition={{ duration: 0.6 }}
                            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
                          >
                            <Heart className="h-40 w-40 text-rose-500 fill-rose-500 filter drop-shadow-2xl animate-pulse" />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Image or Video Top Half with Slideshow Trigger */}
                      <div 
                        className="h-72 w-full relative bg-slate-900 flex items-center justify-center cursor-pointer overflow-hidden group"
                        onClick={() => setShowSlideshow(true)}
                      >
                        {college.videoUrl ? (
                          <AutoPlayVideo url={college.videoUrl} title={college.name} />
                        ) : hasImages ? (
                          <img 
                            src={imgUrl}
                            className="w-full h-full object-cover absolute inset-0 transition-transform duration-700 group-hover:scale-110"
                            alt={college.name}
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-rose-400 to-rose-600 flex flex-col items-center justify-center text-white/50">
                            <School className="w-24 h-24 mb-4 opacity-50" />
                            <span className="font-bold tracking-widest uppercase text-xs">Campus View</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
                        
                        {/* Slideshow / Video Hint */}
                        <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/30 text-[10px] text-white font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                          {college.videoUrl ? <Video className="w-3 h-3 text-rose-400" /> : null}
                          <span>{college.videoUrl ? "Playing Video" : "View Gallery"}</span>
                        </div>
                        
                        <div className="absolute bottom-4 left-4 right-4 text-white">
                          <h2 className="text-2xl font-black leading-tight drop-shadow-md">{college.name}</h2>
                          <div className="flex items-center space-x-1 mt-1 text-sm font-semibold opacity-90">
                            <MapPin className="w-4 h-4" />
                            <span>{college.place} • {college.probability}% Match</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Content Details */}
                      <div className="p-6">
                        <p className="text-sm font-semibold text-slate-700 leading-snug mb-5 line-clamp-2">
                          {college.details || `Top college offering ${bestCourse.courseName || "various courses"} for your rank.`}
                        </p>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-2.5 mb-6">
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex items-center"><DollarSign className="w-3 h-3 mr-0.5" /> Fees</span>
                            <span className="font-black text-slate-800 text-sm">₹{((bestCourse.fees || college.fees || 0) / 100000).toFixed(1)}L / yr</span>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex items-center"><Award className="w-3 h-3 mr-0.5" /> Round</span>
                            <span className="font-black text-rose-600 text-sm">{bestCourse.cutoffRound || `R${bestCourse.round || 1}`}</span>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex items-center"><Award className="w-3 h-3 mr-0.5 text-blue-500" /> CET Cutoff</span>
                            <span className="font-black text-blue-900 text-sm">#{bestCourse.cutoffRank?.toLocaleString() || "N/A"}</span>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex items-center"><Award className="w-3 h-3 mr-0.5 text-indigo-500" /> DCET Cutoff</span>
                            <span className="font-black text-indigo-900 text-sm">{bestCourse.dcetCutoffRank ? `#${bestCourse.dcetCutoffRank.toLocaleString()}` : "N/A"}</span>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex items-center"><Award className="w-3 h-3 mr-0.5 text-emerald-500" /> Avg Placement</span>
                            <span className="font-black text-emerald-800 text-sm">{bestCourse.averagePackage || "N/A"} LPA</span>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex items-center"><Award className="w-3 h-3 mr-0.5 text-purple-500" /> Max Placement</span>
                            <span className="font-black text-purple-900 text-sm">{bestCourse.highestPackage || "N/A"} LPA</span>
                          </div>
                        </div>

                        {/* Remove / View Details text button */}
                        <div className="text-center">
                          <button 
                            onClick={() => {
                              setSwipeDirection("up");
                              onSelectCollege(college);
                            }}
                            className="text-slate-400 font-bold text-xs flex items-center justify-center space-x-1 w-full hover:text-rose-500 transition-colors"
                          >
                            <span>ℹ️ Info & Specs</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })() : (
                  <div className="bg-white w-full rounded-[2.5rem] shadow-xl p-10 text-center border border-slate-100 z-10 relative">
                    <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="h-10 w-10 text-rose-500" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">No more matches!</h3>
                    <p className="text-slate-500 text-sm mb-6">You have swiped through all available colleges for your criteria.</p>
                    <button 
                      onClick={() => {
                        setSwipeDirection(null);
                        setSwipeIndex(0);
                      }}
                      className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold active:scale-95 transition-all shadow-lg shadow-rose-500/20"
                    >
                      Start Over
                    </button>
                  </div>
                )}
                </AnimatePresence>

                {/* Bottom Swipe Actions */}
                {swipeIndex < processedColleges.length && (
                  <div className="flex justify-between items-center mt-6 px-4 z-20 relative">
                    <button 
                      onClick={handleSwipeLeft}
                      className="w-16 h-16 bg-white/20 hover:bg-white/40 backdrop-blur-xl shadow-xl shadow-slate-900/5 rounded-full flex items-center justify-center border border-white/60 text-slate-800 hover:text-rose-600 active:scale-90 transition-all cursor-pointer group"
                      title="Pass / Swipe Left"
                    >
                      <span className="text-2xl font-black group-hover:scale-110 transition-transform">✕</span>
                    </button>
                    <div className="bg-white/20 backdrop-blur-xl border border-white/50 px-5 py-2 rounded-full text-[10px] font-black text-slate-800 uppercase tracking-widest text-center shadow-xs">
                      Swipe Cards
                    </div>
                    <button 
                      onClick={() => handleSwipeRight(processedColleges[swipeIndex].id)}
                      className="w-16 h-16 bg-white/20 hover:bg-white/40 backdrop-blur-xl shadow-xl shadow-rose-500/10 rounded-full flex items-center justify-center border border-white/60 text-rose-500 active:scale-90 transition-all cursor-pointer group"
                      title="Like / Add Favorite"
                    >
                      <Heart className={`h-7 w-7 group-hover:scale-110 transition-transform ${((currentUser.favorites || []).includes(processedColleges[swipeIndex].id)) ? 'fill-rose-500 text-rose-500' : 'text-rose-500'}`} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

        )}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md mx-auto relative pt-4 pb-24 px-2 sm:px-4"
          >
            {/* STEP 04: STRATEGIC OPTIONS */}
            <div className="glass rounded-[3rem] p-6 sm:p-10 text-slate-900 shadow-2xl relative overflow-hidden">
              {/* Decorative gradient orb */}
              <div className="absolute top-[-50%] right-[-20%] w-64 h-64 bg-rose-400/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-pink-400/20 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between mb-8 relative z-10">
                <div>
                  <h2 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">Strategic Option Entry</h2>
                  <p className="text-[10px] text-rose-500 mt-1.5 uppercase tracking-widest font-black">Recommended Sequence for Counseling</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2.5 bg-white/80 hover:bg-white border border-rose-100 text-rose-500 rounded-xl transition-all shadow-sm cursor-pointer">
                    <Share2 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={handleDownloadPDF}
                    className="p-2.5 bg-rose-500 hover:bg-rose-600 border border-rose-500 text-white rounded-xl transition-all cursor-pointer shadow-md shadow-rose-500/20 active:scale-95"
                    title="Download Official Strategy PDF"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {strategicOptions.length > 0 ? (
                  strategicOptions.slice(0, 10).map((college, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === Math.min(strategicOptions.length, 10) - 1;
                    const priorityText = isFirst 
                      ? "#1 Highest Priority" 
                      : isLast 
                        ? `#${idx + 1} Last Priority (Safety)` 
                        : `#${idx + 1} High Priority`;
                    const priorityBadgeStyle = isFirst 
                      ? "bg-rose-500 text-white shadow-md shadow-rose-500/20" 
                      : isLast 
                        ? "bg-emerald-600 text-white" 
                        : "bg-slate-900 text-white";

                    return (
                      <div key={college.id} className="group">
                        <div 
                          className="bg-white/80 border border-white/90 rounded-2xl p-4.5 hover:border-rose-500/50 transition-all cursor-pointer shadow-sm backdrop-blur-md space-y-3"
                          onClick={() => onSelectCollege(college)}
                        >
                          <div className="flex flex-wrap justify-between items-start gap-2 border-b border-slate-100/80 pb-2.5">
                            <div className="flex items-center space-x-2.5">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${priorityBadgeStyle}`}>
                                {priorityText}
                              </span>
                              <div>
                                <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-rose-600 transition-colors">{college.name}</h4>
                                <p className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">{college.bestMatchedCourse.courseName}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${getProbabilityLabel(college.probability).bg} ${getProbabilityLabel(college.probability).border} ${getProbabilityLabel(college.probability).color}`}>
                                {getProbabilityLabel(college.probability).label} ({college.probability}%)
                              </span>
                            </div>
                          </div>

                          {/* Cutoff Rank & Immediate College Details */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{rankType} Cutoff Rank</span>
                              <span className="font-black text-blue-600 text-sm">#{college.effectiveCutoff?.toLocaleString() || college.bestMatchedCourse.cutoffRank?.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">City / Campus Location</span>
                              <span className="font-bold text-slate-800 text-xs truncate block">{college.place || "Karnataka"}</span>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Tuition Fees</span>
                              <span className="font-bold text-emerald-700 text-xs">₹{(college.bestMatchedCourse.fees / 1000).toFixed(0)}k / year</span>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Avg Placement</span>
                              <span className="font-bold text-purple-700 text-xs">{college.bestMatchedCourse.averagePackage || college.averagePackage || "N/A"} LPA</span>
                            </div>
                          </div>

                          {/* College Quick Action Buttons */}
                          <div className="flex items-center justify-between pt-1 text-[11px]">
                            <span className="text-slate-500 font-medium flex items-center">
                              📍 {college.locationAddress || college.place}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectCollege(college);
                              }}
                              className="text-rose-500 hover:text-rose-600 font-extrabold text-[11px] flex items-center space-x-1"
                            >
                              <span>ℹ️ View Full College Details & Specs →</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center py-10 text-slate-500 font-bold">No strategic data available yet.</p>
                )}
              </div>

              {/* MANUAL STRATEGY ADVISORY REPORT WITH 5-STAR RATINGS */}
              <div className="mt-8 border-t border-slate-100 pt-8">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Award className="h-5 w-5 text-rose-500" />
                      <h3 className="text-lg font-black text-slate-900">Manual Strategy Advisory Report</h3>
                    </div>
                    <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                      Recommended Sequence for Counseling with Detailed 5-Star Ratings
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadPDF}
                    className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition-all cursor-pointer shadow-md shadow-rose-500/20 active:scale-95"
                  >
                    <FileDown className="h-4 w-4" />
                    <span>Download PDF Report</span>
                  </button>
                </div>

                {/* Metadata Summary Banner */}
                <div className="bg-slate-900 text-white rounded-2xl p-4 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs shadow-lg">
                  <div>
                    <span className="text-rose-400 font-extrabold uppercase tracking-wider text-[9px]">Student Name</span>
                    <p className="font-extrabold text-white mt-0.5 truncate">{currentUser.firstName || "Guest"} {currentUser.lastName || "Student"}</p>
                  </div>
                  <div>
                    <span className="text-rose-400 font-extrabold uppercase tracking-wider text-[9px]">Rank Mode</span>
                    <p className="font-black text-white mt-0.5">{rankType} Rank #{cetRank || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-rose-400 font-extrabold uppercase tracking-wider text-[9px]">Category</span>
                    <p className="font-extrabold text-white mt-0.5">{category || "General"}</p>
                  </div>
                  <div>
                    <span className="text-rose-400 font-extrabold uppercase tracking-wider text-[9px]">Counseling Round</span>
                    <p className="font-extrabold text-white mt-0.5">Round {round}</p>
                  </div>
                </div>

                {/* 5-STAR RECOMMENDED OPTION SEQUENCE */}
                <div className="space-y-4 mb-6">
                  {strategicOptions.length > 0 ? (
                    strategicOptions.slice(0, 10).map((college, idx) => {
                      const stars = calculateStarRating(college.probability, college.bestMatchedCourse.averagePackage);
                      const isFirst = idx === 0;
                      const isLast = idx === Math.min(strategicOptions.length, 10) - 1;
                      const priorityTag = isFirst 
                        ? "#1 Highest Priority" 
                        : isLast 
                          ? `#${idx + 1} Last Priority (Safety)` 
                          : `#${idx + 1} Priority`;

                      const tierLabel = isFirst 
                        ? "Top Dream Choice (Priority 1)" 
                        : idx < 3 
                          ? "Dream Option (Priority 1-3)" 
                          : idx < 7 
                            ? "High Match Target (Priority 4-7)" 
                            : "Safe Bet Guarantee (Priority 8+)";
                      const tierBadgeColor = idx < 3 ? "bg-amber-100 text-amber-800 border-amber-300" : idx < 7 ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-emerald-100 text-emerald-800 border-emerald-300";

                      return (
                        <div key={college.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-md hover:shadow-lg transition-all space-y-3">
                          <div className="flex flex-wrap justify-between items-start gap-2 border-b border-slate-100 pb-2">
                            <div className="flex items-center space-x-2">
                              <span className={`px-2.5 py-1 rounded-lg text-white font-black text-xs shrink-0 ${isFirst ? 'bg-rose-500 shadow-sm shadow-rose-500/30' : isLast ? 'bg-emerald-600' : 'bg-slate-900'}`}>
                                {priorityTag}
                              </span>
                              <div>
                                <h4 className="font-black text-slate-900 text-sm">{college.name}</h4>
                                <p className="text-[11px] font-bold text-rose-500">{college.bestMatchedCourse.courseName}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${tierBadgeColor}`}>
                                {tierLabel}
                              </span>
                              <div className="flex items-center space-x-1 mt-1 text-amber-400">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star key={s} className={`w-3.5 h-3.5 ${s <= stars ? "fill-amber-400 text-amber-400" : "text-slate-200 fill-slate-200"}`} />
                                ))}
                                <span className="text-[10px] font-extrabold text-slate-700 ml-1">({stars}.0 / 5.0)</span>
                              </div>
                            </div>
                          </div>

                          {/* Detailed Cutoff & College Specs Breakdown Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div>
                              <span className="text-slate-400 font-bold uppercase text-[9px] block">Admission Chance</span>
                              <span className="font-extrabold text-emerald-600">{college.probability}% Match</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold uppercase text-[9px] block">{rankType} Cutoff Rank</span>
                              <span className="font-extrabold text-blue-600">#{college.effectiveCutoff?.toLocaleString() || college.bestMatchedCourse.cutoffRank?.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold uppercase text-[9px] block">Placement Packages</span>
                              <span className="font-extrabold text-slate-800">Avg: {college.bestMatchedCourse.averagePackage} LPA</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold uppercase text-[9px] block">Annual Fees</span>
                              <span className="font-extrabold text-slate-800">₹{(college.bestMatchedCourse.fees / 1000).toFixed(0)}k/yr</span>
                            </div>
                          </div>

                          {/* Action & Details button right near cutoff info */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-50">
                            <div className="flex items-center space-x-2 text-[11px] text-slate-600 font-medium">
                              <ShieldCheck className="w-4 h-4 text-rose-500 shrink-0" />
                              <span>
                                <strong>Action:</strong> Enter as Option #{idx + 1} in {rankType} Round {round} option entry.
                              </span>
                            </div>
                            <button
                              onClick={() => onSelectCollege(college)}
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer flex items-center space-x-1"
                            >
                              <span>ℹ️ View Full College Details & Specs</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center py-6 text-slate-500 font-bold">No options generated yet. Adjust rank or branch selections.</p>
                  )}
                </div>

                {/* COUNSELING SEQUENCE RULES CARD */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2">
                  <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                    <CheckSquare className="w-4 h-4 text-rose-500" />
                    <span>Recommended Counseling Strategy Rules</span>
                  </h4>
                  <ul className="space-y-1.5 text-slate-700 font-medium pl-1">
                    <li className="flex items-start space-x-2">
                      <span className="text-amber-500 font-black">⭐ Rule 1:</span>
                      <span>Place top tier 5-star dream options in Position #1 to #3. There is no penalty for unallocated dream choices.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-500 font-black">⭐ Rule 2:</span>
                      <span>List realistic target colleges with 60%–85% probability in Position #4 to #7.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-emerald-500 font-black">⭐ Rule 3:</span>
                      <span>Always include at least 2 safe guarantee choices (&gt;90% match) in Position #8+ to ensure a confirmed seat in Round {round}.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <button 
                onClick={() => setStep(3)}
                className="w-full mt-8 py-4 glass text-slate-500 hover:text-rose-500 border border-white/80 rounded-2xl font-black transition-all text-[10px] uppercase tracking-[0.2em] cursor-pointer shadow-sm active:scale-95"
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
                  <div className="w-3 h-3 bg-rose-400 rounded-full" />
                  <div className="w-3 h-3 bg-emerald-400 rounded-full" />
                </div>
                <div className="bg-slate-200/50 border border-slate-200/40 px-4 py-1.5 rounded-full text-xs font-mono text-slate-600 truncate flex items-center space-x-2 flex-1 max-w-lg">
                  <Globe className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{inAppSiteUrl}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <a
                  href={inAppSiteUrl.startsWith("http") ? inAppSiteUrl : `https://${inAppSiteUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-slate-900 font-extrabold text-xs rounded-xl cursor-pointer shadow-sm active:scale-95 transition-all flex items-center space-x-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open in New Tab</span>
                </a>
                <button
                  onClick={() => setInAppSiteUrl(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-900 font-extrabold text-xs rounded-xl cursor-pointer shadow-sm active:scale-95 transition-all"
                >
                  Close Browser
                </button>
              </div>
            </div>

            {/* Friendly CSP Frame Embedding Advisory Banner */}
            <div className="bg-rose-50 border-b border-rose-200/60 px-6 py-2.5 flex items-center justify-between text-rose-900 text-xs font-semibold shrink-0 flex-wrap gap-1.5">
              <span className="flex items-center">
                <Info className="h-4 w-4 mr-2 text-rose-600 shrink-0" />
                <span>Note: If this college portal fails to load or says "took too long to respond", it is due to security policies restricting frame embedding. Click "Open in New Tab" to view it directly.</span>
              </span>
              <a
                href={inAppSiteUrl.startsWith("http") ? inAppSiteUrl : `https://${inAppSiteUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-rose-700 hover:text-rose-900 underline font-bold whitespace-nowrap"
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

      {/* IMAGE SLIDESHOW MODAL */}
      <AnimatePresence>
        {showSlideshow && currentCollege && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 flex flex-col"
          >
            <div className="p-6 flex items-center justify-between text-white">
              <div className="flex flex-col">
                <h3 className="font-display font-black text-xl tracking-tight">{currentCollege.name}</h3>
                <span className="text-xs text-white/60 font-bold uppercase tracking-widest">{activeImageIndex + 1} of {currentCollegeImages.length} Campus Photos</span>
              </div>
              <button 
                onClick={() => setShowSlideshow(false)}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all cursor-pointer"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 relative flex items-center justify-center p-4">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIndex(prev => (prev === 0 ? currentCollegeImages.length - 1 : prev - 1));
                }}
                className="absolute left-6 z-10 p-4 bg-black/40 border border-white/10 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-all active:scale-90"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>

              <motion.img
                key={activeImageIndex}
                initial={{ opacity: 0, scale: 0.9, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 1.1, x: -20 }}
                src={currentCollegeImages[activeImageIndex]}
                className="max-w-full max-h-[70vh] object-contain rounded-3xl shadow-2xl"
                alt="Campus view"
              />

              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIndex(prev => (prev === currentCollegeImages.length - 1 ? 0 : prev + 1));
                }}
                className="absolute right-6 z-10 p-4 bg-black/40 border border-white/10 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-all active:scale-90"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </div>

            <div className="p-8 flex items-center justify-center space-x-2">
              {currentCollegeImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === activeImageIndex ? "w-8 bg-rose-500" : "w-2 bg-white/20"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default StudentDashboard;
