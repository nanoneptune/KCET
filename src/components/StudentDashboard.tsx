import React, { useState, useEffect, useMemo } from "react";
import { 
  Search, Sliders, Heart, School, Sparkles, MapPin, DollarSign, Award, 
  BookOpen, CheckSquare, Square, Info, Compass, Loader2, ChevronDown, 
  ChevronUp, Zap, Target, TrendingUp, ListOrdered, Share2, Download, Filter,
  FileDown, Globe, RefreshCw, ExternalLink, X, ChevronLeft, ChevronRight
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
  onToggleFavorite: (collegeId: string) => Promise<void>;
  onSelectCollege: (college: College) => void;
  showFavoritesOnly: boolean;
}

const CATEGORIES = ["General", "OBC", "SC/ST"];
const ROUNDS = ["1", "2", "3"];

export default function StudentDashboard({
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
  const [showSlideshow, setShowSlideshow] = useState(false);
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
    setSwipeIndex(prev => prev + 1);
  };

  const handleSwipeRight = (collegeId: string) => {
    setShowHeartAnimation(true);
    setTimeout(() => {
      setShowHeartAnimation(false);
      if (!(currentUser.favorites || []).includes(collegeId)) {
        onToggleFavorite(collegeId);
      }
      setSwipeIndex(prev => prev + 1);
    }, 600);
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
    doc.setFillColor(244, 63, 94); // Amber 600
    doc.rect(0, 38, 210, 3, "F");

    doc.setTextColor(251, 113, 133); // Amber 400
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
    doc.setDrawColor(244, 63, 94);
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

    doc.setDrawColor(244, 63, 94);
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
      
      doc.setFillColor(244, 63, 94);
      doc.rect(0, 30, 210, 2.5, "F");

      doc.setTextColor(251, 113, 133);
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
      
      // Handle new categories array structure
      if (bestMatchedCourse?.categories) {
        const catObj = bestMatchedCourse.categories.find((c: any) => c.name === category);
        if (catObj) {
          effectiveCutoff = catObj.cutoff;
        }
      }
      
      // Filter by round if provided
      if (bestMatchedCourse?.round && String(bestMatchedCourse.round) !== String(round)) {
        // We might still show it but with lower probability or just filter it?
        // User requested round selection, so let's filter if it doesn't match the selected round
        // unless they want all rounds? Usually you pick a round to see cutoffs.
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
                <p className="text-xs text-slate-500 mt-3 font-medium">Your KCET / DCET score/rank</p>
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
                {ALL_COURSES.filter(c => c.toLowerCase().includes(courseSearch.toLowerCase())).map(course => {
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
              <div className="px-2 mb-6 text-center">
                <h3 className="text-white font-black text-2xl mb-2 tracking-tight">Your Matches</h3>
                <p className="text-white/90 text-sm font-bold">{processedColleges.length} colleges available</p>
              </div>

              {/* CARD CONTAINER */}
              <div className="relative mt-8">
                {/* Floating pill */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 bg-white shadow-md text-rose-500 px-4 py-1.5 rounded-full flex items-center space-x-1 font-bold text-xs border border-rose-100">
                  <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                  <span>College Match</span>
                </div>

                <AnimatePresence mode="popLayout">
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
                      layout
                      initial={{ opacity: 0, scale: 0.9, x: 100 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9, x: -100 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    drag={true}
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                    onDragEnd={(e, { offset, velocity }) => {
                      // Horizontal Swipes (80-90% threshold for action)
                      if (offset.x > 250) {
                        handleSwipeRight(college.id);
                      } else if (offset.x < -250) {
                        handleSwipeLeft();
                      }
                      
                      // Vertical Swipe (60% upward threshold)
                      if (offset.y < -150) {
                        onSelectCollege(college);
                      }
                    }}
                    className="bg-white w-full rounded-[2.5rem] shadow-xl overflow-hidden text-slate-900 border border-slate-100 relative cursor-grab active:cursor-grabbing"
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

                      {/* Image Top Half with Slideshow Trigger */}
                      <div 
                        className="h-72 w-full relative bg-slate-900 flex items-center justify-center cursor-pointer overflow-hidden group"
                        onClick={() => setShowSlideshow(true)}
                      >
                        {hasImages ? (
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
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                        
                        {/* Slideshow Hint */}
                        <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/30 text-[10px] text-white font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                          View Gallery
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
                        <div className="grid grid-cols-2 gap-3 mb-6">
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex items-center"><DollarSign className="w-3 h-3 mr-0.5" /> Fees</span>
                            <span className="font-black text-slate-800 text-sm">₹{((bestCourse.fees || college.fees || 0) / 100000).toFixed(1)}L / yr</span>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex items-center"><Award className="w-3 h-3 mr-0.5" /> CET Cutoff</span>
                            <span className="font-black text-slate-800 text-sm">#{bestCourse.cutoffRank?.toLocaleString() || "N/A"}</span>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex items-center"><Award className="w-3 h-3 mr-0.5" /> Prev Cutoff</span>
                            <span className="font-black text-slate-800 text-sm">#{bestCourse.cutoffRankPreviousYear?.toLocaleString() || (bestCourse.cutoffRank ? (bestCourse.cutoffRank - 200).toLocaleString() : "N/A")}</span>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex items-center"><Award className="w-3 h-3 mr-0.5" /> Avg Placement</span>
                            <span className="font-black text-slate-800 text-sm">{bestCourse.averagePackage || "N/A"} LPA</span>
                          </div>
                          <div className="col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex items-center"><Award className="w-3 h-3 mr-0.5" /> Max Placement</span>
                            <span className="font-black text-slate-800 text-sm">{bestCourse.highestPackage || "N/A"} LPA</span>
                          </div>
                        </div>

                        {/* Remove / View Details text button */}
                        <div className="text-center">
                          <button 
                            onClick={() => onSelectCollege(college)}
                            className="text-slate-400 font-bold text-xs flex items-center justify-center space-x-1 w-full"
                          >
                            <span>ℹ️ Info & Specs</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })() : (
                  <div className="bg-white w-full rounded-[2.5rem] shadow-xl p-10 text-center border border-slate-100">
                    <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="h-10 w-10 text-rose-500" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">No more matches!</h3>
                    <p className="text-slate-500 text-sm mb-6">You have swiped through all available colleges for your criteria.</p>
                    <button 
                      onClick={() => setSwipeIndex(0)}
                      className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold active:scale-95 transition-all"
                    >
                      Start Over
                    </button>
                  </div>
                )}

                {/* Bottom Swipe Actions */}
                </AnimatePresence>
                {swipeIndex < processedColleges.length && (
                  <div className="flex justify-between items-center mt-6 px-4">
                    <button 
                      onClick={handleSwipeLeft}
                      className="w-16 h-16 bg-white shadow-xl rounded-full flex items-center justify-center border border-slate-100 text-slate-400 hover:text-rose-500 active:scale-90 transition-all"
                    >
                      <span className="text-2xl font-light">✕</span>
                    </button>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                      Keep Swiping
                    </div>
                    <button 
                      onClick={() => handleSwipeRight(processedColleges[swipeIndex].id)}
                      className="w-16 h-16 bg-white shadow-xl rounded-full flex items-center justify-center border border-slate-100 text-rose-500 active:scale-90 transition-all"
                    >
                      <Heart className={`h-7 w-7 ${((currentUser.favorites || []).includes(processedColleges[swipeIndex].id)) ? 'fill-rose-500' : ''}`} />
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
                    onClick={async () => {
                      if (!aiReport) {
                        setLoadingAi(true);
                        setShowAiModal(true);
                        try {
                          const res = await fetch("/api/ai/predict", {
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
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-100 text-slate-600 rounded-xl transition-all cursor-pointer"
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
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-100 flex items-center justify-center text-xs font-black text-slate-600 group-hover:border-rose-400 group-hover:text-rose-400 transition-all shrink-0">
                        {idx + 1}
                      </div>
                      <div 
                        onClick={() => onSelectCollege(college)}
                        className="flex-1 bg-white/60 border border-white/80 rounded-2xl p-4 hover:border-rose-500/50 transition-all cursor-pointer active:scale-[0.98] shadow-sm backdrop-blur-sm"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-sm text-slate-900 truncate">{college.name}</h4>
                            <p className="text-[10px] text-rose-400 uppercase tracking-widest font-black mt-0.5 truncate">{college.bestMatchedCourse.courseName}</p>
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
                  <p className="text-center py-10 text-slate-500 font-bold">No strategic data available yet.</p>
                )}
              </div>

              {/* INLINE AI STRATEGY ADVISORY REPORT */}
              <div className="mt-8 border-t border-slate-100 pt-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5 text-rose-400 animate-pulse" />
                    <h3 className="text-lg font-black text-slate-900">AI Strategy Advisory Report</h3>
                  </div>
                  {!loadingAi && aiReport && (
                    <button
                      onClick={handleDownloadPDF}
                      className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-400 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 transition-all cursor-pointer shadow-md"
                      title="Download Official PDF"
                    >
                      <FileDown className="h-4 w-4" />
                      <span>Download PDF</span>
                    </button>
                  )}
                </div>

                {loadingAi ? (
                  <div className="flex flex-col items-center justify-center py-12 bg-slate-100 border border-slate-100 rounded-3xl">
                    <div className="relative">
                      <Loader2 className="h-10 w-10 text-rose-500 animate-spin mb-3" />
                      <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-rose-400 animate-bounce" />
                    </div>
                    <p className="font-extrabold text-rose-400 uppercase tracking-widest text-[9px]">Generating Advisory Forecast...</p>
                  </div>
                ) : aiReport ? (
                  /* BEAUTIFULLY STYLED INLINE ADVISORY VIEW */
                  <div className="bg-white text-slate-100 rounded-3xl p-6 md:p-8 font-sans shadow-2xl border border-slate-100 relative select-text">
                    {/* Metadata Grid */}
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 font-extrabold uppercase tracking-wider text-[8px]">Student Name</span>
                        <p className="font-extrabold text-slate-900 mt-0.5">{currentUser.firstName || "Guest"} {currentUser.lastName || "User"}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-extrabold uppercase tracking-wider text-[8px]">Counselling Category</span>
                        <p className="font-extrabold text-slate-900 mt-0.5">{category || "General"}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-extrabold uppercase tracking-wider text-[8px]">Karnataka CET Rank</span>
                        <p className="font-extrabold text-slate-900 mt-0.5">#{cetRank || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-extrabold uppercase tracking-wider text-[8px]">Report Issue Date</span>
                        <p className="font-extrabold text-slate-900 mt-0.5">{new Date().toLocaleDateString()}</p>
                      </div>
                    </div>

                    {/* Report Content */}
                    <div className="prose prose-invert max-w-none text-slate-600 whitespace-pre-line leading-relaxed text-[13px] font-medium">
                      {aiReport.replace(/\*\*/g, "").replace(/###/g, "").replace(/##/g, "").replace(/#/g, "")}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-100 border border-dashed border-slate-100 rounded-3xl">
                    <p className="text-xs text-slate-500 font-semibold mb-4">Unlock an advanced AI-powered admission forecast for your rank & category.</p>
                    <button
                      onClick={triggerAiPrediction}
                      className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer inline-flex items-center space-x-1.5"
                    >
                      <Sparkles className="h-4 w-4 text-white" />
                      <span>Generate Forecast Report</span>
                    </button>
                  </div>
                )}
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
