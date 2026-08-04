import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Search, Sliders, Heart, School, Sparkles, MapPin, DollarSign, Award, 
  BookOpen, CheckSquare, Square, Info, Compass, Loader2, ChevronDown, 
  ChevronUp, Zap, Target, TrendingUp, ListOrdered, Share2, Download, Filter,
  FileDown, Globe, RefreshCw, ExternalLink, X, ChevronLeft, ChevronRight, Video,
  Star, RotateCcw, ShieldCheck, ZoomIn, ZoomOut, AlertCircle
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
  onVideoFullscreenChange?: (isFullscreen: boolean) => void;
}

const CATEGORIES = ["General", "OBC", "SC/ST"];
const ROUNDS = ["1", "2", "3"];

export function StudentDashboard({
  currentUser,
  colleges,
  onUpdateProfile,
  onToggleFavorite,
  onSelectCollege,
  showFavoritesOnly,
  onVideoFullscreenChange
}: StudentDashboardProps) {
  // Wizard Step State
  const [step, setStep] = useState(1);
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);
  
  // Local profile editing states
  const [cetRank, setCetRank] = useState<string>(currentUser.cetRank?.toString() || "");
  const [selectedCourses, setSelectedCourses] = useState<string[]>(currentUser.courses || []);
  const [category, setCategory] = useState("General");
  const [round, setRound] = useState("1");
  const [isTierFilterOpen, setIsTierFilterOpen] = useState(false);

  // Rank Type Switch (KCET vs DCET)
  const [rankType, setRankType] = useState<"KCET" | "DCET">("KCET");

  // Touch Pinch-to-Zoom handlers for Mobile Gallery
  const pinchTouchStartDist = useRef<number | null>(null);

  const handleTouchStartPinch = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchTouchStartDist.current = dist;
    }
  };

  const handleTouchMovePinch = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchTouchStartDist.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = dist - pinchTouchStartDist.current;
      if (Math.abs(delta) > 4) {
        setSlideshowZoomScale(prev => {
          const next = prev + (delta > 0 ? 0.08 : -0.08);
          return Math.min(4, Math.max(1, next));
        });
        pinchTouchStartDist.current = dist;
      }
    }
  };

  const handleTouchEndPinch = () => {
    pinchTouchStartDist.current = null;
  };
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
  const [slideshowZoomScale, setSlideshowZoomScale] = useState(1);
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

  // Card image Zoom & Pan states
  const [cardZoom, setCardZoom] = useState(1);
  const [cardPan, setCardPan] = useState({ x: 0, y: 0 });
  const isDraggingCardImg = useRef(false);
  const cardImgDragStart = useRef({ x: 0, y: 0 });

  const cardTouchStartDist = useRef<number | null>(null);
  const cardTouchStartZoom = useRef<number>(1);
  const cardTouchStartCenter = useRef<{ x: number; y: number } | null>(null);
  const cardTouchStartPan = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cardTouchSingleStart = useRef<{ x: number; y: number } | null>(null);

  // Slideshow Zoom & Pan state
  const [slideshowPan, setSlideshowPan] = useState({ x: 0, y: 0 });
  const isDraggingSlideshow = useRef(false);
  const slideshowDragStart = useRef({ x: 0, y: 0 });

  // Touch references for slideshow
  const slideshowTouchStartDist = useRef<number | null>(null);
  const slideshowTouchStartZoom = useRef<number>(1);
  const slideshowTouchStartCenter = useRef<{ x: number; y: number } | null>(null);
  const slideshowTouchStartPan = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const slideshowTouchSingleStart = useRef<{ x: number; y: number } | null>(null);

  // Reset zoom & pan when slide or swipe shifts
  useEffect(() => {
    setCardZoom(1);
    setCardPan({ x: 0, y: 0 });
    setActiveImageIndex(0);
    setInteractWithIframe(false);
  }, [swipeIndex]);

  useEffect(() => {
    setSlideshowZoomScale(1);
    setSlideshowPan({ x: 0, y: 0 });
  }, [activeImageIndex]);

  useEffect(() => {
    if (cardZoom <= 1) {
      setCardPan({ x: 0, y: 0 });
    }
  }, [cardZoom]);

  useEffect(() => {
    if (slideshowZoomScale <= 1) {
      setSlideshowPan({ x: 0, y: 0 });
    }
  }, [slideshowZoomScale]);

  // Card image gestures
  const handleCardImgMouseDown = (e: React.MouseEvent) => {
    if (cardZoom <= 1) return;
    e.preventDefault();
    isDraggingCardImg.current = true;
    cardImgDragStart.current = {
      x: e.clientX - cardPan.x,
      y: e.clientY - cardPan.y
    };
  };

  const handleCardImgMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingCardImg.current || cardZoom <= 1) return;
    e.preventDefault();
    setCardPan({
      x: e.clientX - cardImgDragStart.current.x,
      y: e.clientY - cardImgDragStart.current.y
    });
  };

  const handleCardImgMouseUpOrLeave = () => {
    isDraggingCardImg.current = false;
  };

  const handleCardImgTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      cardTouchSingleStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      cardTouchStartPan.current = { ...cardPan };
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      cardTouchStartDist.current = dist;
      cardTouchStartZoom.current = cardZoom;

      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      cardTouchStartCenter.current = { x: midX, y: midY };
      cardTouchStartPan.current = { ...cardPan };
    }
  };

  const handleCardImgTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && cardTouchSingleStart.current && cardZoom > 1) {
      const dx = e.touches[0].clientX - cardTouchSingleStart.current.x;
      const dy = e.touches[0].clientY - cardTouchSingleStart.current.y;
      setCardPan({
        x: cardTouchStartPan.current.x + dx,
        y: cardTouchStartPan.current.y + dy
      });
    } else if (e.touches.length === 2 && cardTouchStartDist.current !== null && cardTouchStartCenter.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const ratio = dist / cardTouchStartDist.current;
      const nextZoom = Math.min(4, Math.max(1, cardTouchStartZoom.current * ratio));
      setCardZoom(nextZoom);

      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      const dx = midX - cardTouchStartCenter.current.x;
      const dy = midY - cardTouchStartCenter.current.y;
      setCardPan({
        x: cardTouchStartPan.current.x + dx,
        y: cardTouchStartPan.current.y + dy
      });
    }
  };

  const handleCardImgTouchEnd = () => {
    cardTouchSingleStart.current = null;
    cardTouchStartDist.current = null;
    cardTouchStartCenter.current = null;
  };

  const toggleCardZoom = () => {
    setCardZoom(prev => (prev > 1 ? 1 : 2.5));
  };

  // Slideshow gestures
  const handleSlideshowMouseDown = (e: React.MouseEvent) => {
    if (slideshowZoomScale <= 1) return;
    e.preventDefault();
    isDraggingSlideshow.current = true;
    slideshowDragStart.current = {
      x: e.clientX - slideshowPan.x,
      y: e.clientY - slideshowPan.y
    };
  };

  const handleSlideshowMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingSlideshow.current || slideshowZoomScale <= 1) return;
    e.preventDefault();
    setSlideshowPan({
      x: e.clientX - slideshowDragStart.current.x,
      y: e.clientY - slideshowDragStart.current.y
    });
  };

  const handleSlideshowMouseUpOrLeave = () => {
    isDraggingSlideshow.current = false;
  };

  const handleSlideshowTouchStart = (e: React.TouchEvent) => {
    if (slideshowZoomScale === 1) {
      if (e.touches.length === 1) {
        slideshowTouchSingleStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      return;
    }

    if (e.touches.length === 1) {
      slideshowTouchSingleStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      slideshowTouchStartPan.current = { ...slideshowPan };
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      slideshowTouchStartDist.current = dist;
      slideshowTouchStartZoom.current = slideshowZoomScale;

      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      slideshowTouchStartCenter.current = { x: midX, y: midY };
      slideshowTouchStartPan.current = { ...slideshowPan };
    }
  };

  const handleSlideshowTouchMove = (e: React.TouchEvent) => {
    if (slideshowZoomScale === 1) return;

    if (e.touches.length === 1 && slideshowTouchSingleStart.current) {
      const dx = e.touches[0].clientX - slideshowTouchSingleStart.current.x;
      const dy = e.touches[0].clientY - slideshowTouchSingleStart.current.y;
      setSlideshowPan({
        x: slideshowTouchStartPan.current.x + dx,
        y: slideshowTouchStartPan.current.y + dy
      });
    } else if (e.touches.length === 2 && slideshowTouchStartDist.current !== null && slideshowTouchStartCenter.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const ratio = dist / slideshowTouchStartDist.current;
      const nextZoom = Math.min(4, Math.max(1, slideshowTouchStartZoom.current * ratio));
      setSlideshowZoomScale(nextZoom);

      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      const dx = midX - slideshowTouchStartCenter.current.x;
      const dy = midY - slideshowTouchStartCenter.current.y;
      setSlideshowPan({
        x: slideshowTouchStartPan.current.x + dx,
        y: slideshowTouchStartPan.current.y + dy
      });
    }
  };

  const slideshowTouchEndRef = useRef<(e: React.TouchEvent) => void>(() => {});
  const handleSlideshowTouchEnd = (e: React.TouchEvent) => {
    slideshowTouchEndRef.current(e);
  };

  const toggleSlideshowZoom = () => {
    setSlideshowZoomScale(prev => (prev > 1 ? 1 : 2.5));
  };

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
      let reportText = "";

      // 1. Try Backend API
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

        const contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.includes("application/json")) {
          const data = await res.json();
          if (data.prediction) {
            reportText = data.prediction;
          }
        }
      } catch (backendErr) {
        console.warn("Backend prediction API notice, trying direct client fallback:", backendErr);
      }

      // 2. Fallback: Direct Groq Client Call
      if (!reportText) {
        const apiKey = (import.meta as any).env?.VITE_GROQ_API_KEY || "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";
        const promptText = `You are a senior career counselor for Karnataka ${rankType} engineering admissions.
Student Details:
- Rank: ${cetRank || "Not provided"}
- Category: ${category}
- Target Round: Round ${round}
- Interested Branches: ${selectedCourses.join(", ") || "Engineering Branches"}

Provide a comprehensive, encouraging Markdown strategy report covering:
1. 🎯 **Strategic Analysis & Rank Viability**: Direct analysis of admission chances for Round ${round}.
2. 📋 **Recommended Option Entry Sequence**: Top choices for option filling.
3. 💡 **Pro-Counseling Tips**: Key pitfalls to avoid during option entry.`;

        const modelsToTry = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
        for (const modelName of modelsToTry) {
          try {
            const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model: modelName,
                messages: [
                  { role: "system", content: "You are an expert Karnataka engineering admissions counselor." },
                  { role: "user", content: promptText }
                ],
                temperature: 0.6,
                max_tokens: 1500
              })
            });

            if (groqRes.ok) {
              const gData = await groqRes.json();
              const result = gData.choices?.[0]?.message?.content;
              if (result) {
                reportText = result;
                break;
              }
            }
          } catch (e) {
            console.warn("Direct Groq client call error:", e);
          }
        }
      }

      // 3. Fallback: Local Smart Counselor Generator
      if (!reportText) {
        reportText = `### 🎯 Strategic Counseling Advisory Report for Round ${round}

**Student Rank:** ${cetRank ? `#${Number(cetRank).toLocaleString()}` : "Unranked"} | **Category:** ${category} | **Exam:** ${rankType}

#### 1. 📊 Option Entry Strategy for Round ${round}
- **Top Dream Choices (Priority 1-3):** Place high-tier colleges like RVCE, BMSCE, or MSRIT at the top of your option list regardless of rank.
- **High Viability Options (Priority 4-7):** Include solid mid-tier colleges matching your cutoff window.
- **Safety Net Options (Priority 8-10):** Include at least 3 backup options where cutoffs comfortably exceed your current rank.

#### 💡 Key Guidance Rules
1. **Never skip option entries:** Fill at least 15 to 20 option preferences.
2. **Freeze vs Float:** If you get a top 3 choice in Round ${round}, consider accepting or upgrading carefully.`;
      }

      setAiReport(reportText);
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
          return selectedCourses.some(sc => {
            const scLower = sc.toLowerCase().trim();
            const rLower = r.courseName.toLowerCase().trim();

            if (rLower === scLower || rLower.includes(scLower) || scLower.includes(rLower)) return true;

            // Strip fluff words for smart token matching
            const clean = (str: string) => str.replace(/\b(engineering|bachelor|degree|of|in|science|technology|integrated|department|course|and|&)\b/gi, " ").replace(/[()]/g, "").trim();
            const scClean = clean(scLower);
            const rClean = clean(rLower);

            if (scClean && rClean) {
              const scTokens = scClean.split(/\s+/).filter(t => t.length >= 2);
              const rTokens = rClean.split(/\s+/).filter(t => t.length >= 2);
              if (scTokens.length > 0 && rTokens.length > 0) {
                return scTokens.some(st => rTokens.some(rt => st === rt || st.includes(rt) || rt.includes(st)));
              }
            }
            return false;
          });
        }
        return true;
      }) || [];

      // Exclude college completely if none of its courses match the branch selection or filters
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

  // Assign the actual slideshowTouchEnd implementation inside useEffect so it has closure over currentCollege/currentCollegeImages
  useEffect(() => {
    slideshowTouchEndRef.current = (e: React.TouchEvent) => {
      if (slideshowZoomScale === 1 && slideshowTouchSingleStart.current && e.changedTouches.length > 0) {
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const dx = endX - slideshowTouchSingleStart.current.x;
        const dy = endY - slideshowTouchSingleStart.current.y;
        
        if (Math.abs(dx) > 50 && Math.abs(dy) < 100) {
          const totalSlides = currentCollegeImages.length + (currentCollege?.videoUrl ? 1 : 0);
          if (dx > 0) {
            setSlideshowZoomScale(1);
            setActiveImageIndex(prev => (prev === 0 ? totalSlides - 1 : prev - 1));
          } else {
            setSlideshowZoomScale(1);
            setActiveImageIndex(prev => (prev === totalSlides - 1 ? 0 : prev + 1));
          }
        }
      }

      slideshowTouchSingleStart.current = null;
      slideshowTouchStartDist.current = null;
      slideshowTouchStartCenter.current = null;
    };
  }, [slideshowZoomScale, currentCollege, currentCollegeImages]);

  // Automatic photo slideshow for active college card (if not zoomed)
  useEffect(() => {
    if (showSlideshow) return;
    if (!currentCollegeImages || currentCollegeImages.length <= 1) return;

    const interval = setInterval(() => {
      if (cardZoom > 1) return;
      setActiveImageIndex(prev => (prev + 1) % currentCollegeImages.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [showSlideshow, currentCollegeImages, swipeIndex, cardZoom]);

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 pt-12 sm:pt-14 md:pt-12 pb-24 md:pb-12 text-slate-100 overflow-y-auto">
      
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
            className="w-full max-w-sm mx-auto relative pt-1 sm:pt-4 pb-20 md:pb-24"
          >
            {/* STEP 01: RANK & CATEGORY */}
            <div className="backdrop-blur-md bg-white/95 border border-slate-100 rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 md:p-12 shadow-2xl shadow-rose-900/10 text-center">
              <label className="block text-[10px] sm:text-[11px] font-black text-rose-500 uppercase tracking-[0.2em] mb-4 sm:mb-8">
                Step 01: Enter your Rank & Category
              </label>
              
              <div className="max-w-xs mx-auto mb-5 sm:mb-10">
                <div className="relative">
                  <span className="absolute left-1 sm:left-0 top-1/2 -translate-y-1/2 text-xl sm:text-2xl font-black text-rose-400/30">#</span>
                  <input
                    type="text"
                    value={cetRank}
                    onChange={(e) => setCetRank(e.target.value.replace(/\D/g, ""))}
                    placeholder="Rank"
                    className="w-full text-5xl sm:text-7xl font-black text-slate-900 placeholder:text-slate-300 border-none focus:ring-0 p-0 text-center tabular-nums outline-hidden"
                  />
                </div>
                {/* KCET vs DCET Switch Button */}
                <div className="mt-2.5 sm:mt-4 flex flex-col items-center">
                  <div className="inline-flex bg-slate-100/90 p-1 sm:p-1.5 rounded-2xl border border-slate-200/80 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setRankType("KCET")}
                      className={`px-4 py-1.5 sm:px-6 sm:py-2 text-[11px] sm:text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
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
                      className={`px-4 py-1.5 sm:px-6 sm:py-2 text-[11px] sm:text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                        rankType === "DCET"
                          ? "bg-rose-500 text-white shadow-md shadow-rose-500/20 scale-102"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      DCET Rank
                    </button>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1.5 font-semibold">
                    Selected Mode: <span className="text-rose-500 font-black">{rankType}</span> Counseling
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-6 text-left">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-rose-500/90 uppercase tracking-widest ml-1">Category</label>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full appearance-none bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 sm:px-6 sm:py-4 text-slate-900 font-extrabold text-xs sm:text-sm focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-hidden transition-all cursor-pointer"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat} className="bg-white text-slate-900 font-bold">{cat}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-500 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-rose-500/90 uppercase tracking-widest ml-1">Counseling Round</label>
                  <div className="flex p-1 bg-slate-50 border border-slate-200/80 rounded-2xl">
                    {ROUNDS.map(r => (
                      <button
                        key={r}
                        onClick={() => setRound(r)}
                        className={`flex-1 py-2.5 sm:py-3.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                          round === r 
                          ? "bg-rose-500 text-white shadow-md shadow-rose-500/10 font-extrabold" 
                          : "text-slate-500 hover:text-rose-400"
                        }`}
                      >
                        Round {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                disabled={!cetRank}
                onClick={() => setStep(2)}
                className="mt-5 sm:mt-10 w-full py-4 sm:py-5 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-2xl font-black transition-all flex items-center justify-center space-x-2 group shadow-lg shadow-rose-500/20 active:scale-98 cursor-pointer"
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
            className="w-full max-w-sm mx-auto relative pt-1 sm:pt-4 pb-16 md:pb-24 h-[calc(100vh-5.5rem)] md:h-auto flex flex-col justify-between overflow-hidden"
          >
            {/* STEP 02: BRANCHES */}
            <div className="backdrop-blur-md bg-white/95 border border-slate-100 rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-8 md:p-12 shadow-2xl shadow-rose-900/10 flex flex-col h-full overflow-hidden justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 sm:mb-8">
                  <label className="block text-[10px] sm:text-[11px] font-black text-rose-500 uppercase tracking-[0.2em]">
                    Step 02: Pick your preferred branches
                  </label>
                  <div className="text-[10px] sm:text-[11px] font-black text-rose-500 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full">
                    {selectedCourses.length} Selected
                  </div>
                </div>

                <div className="relative mb-3 sm:mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search branches (e.g. CSE, Civil...)"
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 sm:py-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-hidden transition-all"
                  />
                </div>

                {/* Branch options container - ONLY this list scrolls */}
                <div className="flex flex-wrap gap-2 max-h-[38vh] sm:max-h-[46vh] overflow-y-auto p-1.5 scrollbar-thin">
                  {dynamicAvailableCourses.filter(c => c.toLowerCase().includes(courseSearch.toLowerCase())).map(course => {
                    const isSelected = selectedCourses.includes(course);
                    const isHot = ["Computer Science", "Information Science", "AI & DS"].some(h => course.includes(h));
                    return (
                      <button
                        key={course}
                        onClick={() => handleCourseToggle(course)}
                        className={`flex items-center space-x-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-xs font-bold transition-all border cursor-pointer ${
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
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-4 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setStep(1)}
                  className="py-3.5 sm:py-4 bg-slate-100 hover:bg-slate-200 border border-slate-100 text-slate-600 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer active:scale-99"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="py-3.5 sm:py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 shadow-lg shadow-rose-500/20 active:scale-98 cursor-pointer"
                >
                  <span>Predict My Colleges</span>
                  <span className="stroke-[2.5]">→</span>
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
            className="w-full max-w-full sm:max-w-md mx-auto relative pt-0 sm:pt-2 pb-16 md:pb-24 px-0 sm:px-4"
          >
            <div className="relative z-10">
              {/* Top Middle College Match & Count Badge */}
              {!isVideoFullscreen && (
                <div className="flex justify-center mb-3 pt-1">
                  <div className="bg-white/90 backdrop-blur-md shadow-sm text-slate-900 px-4 py-1.5 rounded-full flex items-center space-x-1.5 font-black border border-rose-100">
                    <Sparkles className="w-4 h-4 text-rose-500 fill-rose-500" />
                    <span className="text-rose-600 font-black text-sm sm:text-base">{processedColleges.length} matches</span>
                  </div>
                </div>
              )}

              {/* CARD CONTAINER - Filled in mobile view */}
              <div className="relative min-h-[500px] h-[calc(100vh-210px)] max-h-[660px] flex flex-col justify-between">

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
                      drag={cardZoom === 1}
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
                      className="bg-white w-full h-full rounded-none sm:rounded-[2.5rem] shadow-none sm:shadow-2xl overflow-hidden text-slate-900 border-0 sm:border border-slate-100 relative cursor-grab active:cursor-grabbing z-10 flex flex-col justify-between"
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
                        className="h-44 sm:h-56 w-full shrink-0 relative bg-slate-900 flex items-center justify-center overflow-hidden group"
                        onClick={() => {
                          if (cardZoom === 1) {
                            setShowSlideshow(true);
                          }
                        }}
                      >
                        {hasImages ? (
                          <div 
                            className="w-full h-full relative overflow-hidden touch-none"
                            onMouseDown={handleCardImgMouseDown}
                            onMouseMove={handleCardImgMouseMove}
                            onMouseUp={handleCardImgMouseUpOrLeave}
                            onMouseLeave={handleCardImgMouseUpOrLeave}
                            onTouchStart={handleCardImgTouchStart}
                            onTouchMove={handleCardImgTouchMove}
                            onTouchEnd={handleCardImgTouchEnd}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              toggleCardZoom();
                            }}
                          >
                            <img 
                              src={imgUrl}
                              className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-200"
                              style={{ 
                                transform: `scale(${cardZoom}) translate(${cardPan.x / cardZoom}px, ${cardPan.y / cardZoom}px)`,
                                transformOrigin: "center"
                              }}
                              alt={college.name}
                            />
                          </div>
                        ) : college.videoUrl ? (
                          <AutoPlayVideo 
                            url={college.videoUrl} 
                            title={college.name} 
                            onFullscreenChange={(fs) => {
                              setIsVideoFullscreen(fs);
                              onVideoFullscreenChange?.(fs);
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-rose-400 to-rose-600 flex flex-col items-center justify-center text-white/50">
                            <School className="w-16 h-16 mb-2 opacity-50" />
                            <span className="font-bold tracking-widest uppercase text-xs">Campus View</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                        
                        {/* Slideshow / Video Hint */}
                        <div className="absolute top-2.5 right-2.5 bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/30 text-[9px] text-white font-black uppercase tracking-widest opacity-90 group-hover:opacity-100 transition-opacity flex items-center space-x-1 z-20">
                          {college.videoUrl ? <Video className="w-3 h-3 text-rose-400" /> : null}
                          <span>{college.videoUrl ? "Photos & Video" : "View Gallery"}</span>
                        </div>
                        
                        <div className="absolute bottom-2.5 left-3 right-3 text-white pointer-events-none z-10">
                          <h2 className="text-base sm:text-xl font-black leading-tight drop-shadow-md">{college.name}</h2>
                          <div className="flex items-center space-x-1 mt-0.5 text-xs font-semibold opacity-90">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{college.place} • {college.probability}% Match</span>
                          </div>
                        </div>
                      </div>

                      {/* Centered Navigation Controls Below Image (Out of Image) */}
                      {hasImages && currentCollegeImages.length > 1 && (
                        <div 
                          className="w-full bg-slate-50 border-b border-slate-100 py-1.5 flex items-center justify-center space-x-4 shrink-0 z-20 select-none"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCardZoom(1);
                              setActiveImageIndex(prev => (prev === 0 ? currentCollegeImages.length - 1 : prev - 1));
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-white hover:bg-rose-50 border border-slate-200 text-slate-700 hover:text-rose-500 hover:border-rose-300 shadow-xs transition-all cursor-pointer text-xs font-black active:scale-90"
                            title="Previous Image"
                          >
                            &lt;
                          </button>
                          <span className="text-[10px] font-black text-slate-500 tracking-widest uppercase bg-slate-100 border border-slate-200/60 px-2.5 py-0.5 rounded-full tabular-nums">
                            {activeImageIndex + 1} of {currentCollegeImages.length}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCardZoom(1);
                              setActiveImageIndex(prev => (prev === currentCollegeImages.length - 1 ? 0 : prev + 1));
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-white hover:bg-rose-50 border border-slate-200 text-slate-700 hover:text-rose-500 hover:border-rose-300 shadow-xs transition-all cursor-pointer text-xs font-black active:scale-90"
                            title="Next Image"
                          >
                            &gt;
                          </button>
                        </div>
                      )}

                      {/* Card Content Details - Fits card height without scroll */}
                      <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between overflow-hidden">
                        <p className="text-xs font-semibold text-slate-700 leading-snug my-0.5 line-clamp-2">
                          {college.details || `Top college offering ${bestCourse.courseName || "various courses"} for your rank.`}
                        </p>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 my-1">
                          <div className="bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-100 flex flex-col">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-0.5 flex items-center"><span className="text-xs font-black mr-0.5 text-slate-700">₹</span> Fees</span>
                            <span className="font-black text-slate-800 text-xs sm:text-sm">₹{((bestCourse.fees || college.fees || 0) / 100000).toFixed(1)}L / yr</span>
                          </div>
                          <div className="bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-100 flex flex-col">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-0.5 flex items-center"><Award className="w-3 h-3 mr-0.5" /> Round</span>
                            <span className="font-black text-rose-600 text-xs sm:text-sm">{bestCourse.cutoffRound || `R${bestCourse.round || 1}`}</span>
                          </div>
                          <div className="bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-100 flex flex-col">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-0.5 flex items-center"><Award className="w-3 h-3 mr-0.5 text-blue-500" /> CET Cutoff</span>
                            <span className="font-black text-blue-900 text-sm sm:text-base">#{bestCourse.cutoffRank?.toLocaleString() || "N/A"}</span>
                          </div>
                          <div className="bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-100 flex flex-col">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-0.5 flex items-center"><Award className="w-3 h-3 mr-0.5 text-indigo-500" /> DCET Cutoff</span>
                            <span className="font-black text-indigo-900 text-sm sm:text-base">{bestCourse.dcetCutoffRank ? `#${bestCourse.dcetCutoffRank.toLocaleString()}` : "N/A"}</span>
                          </div>
                          <div className="bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-100 flex flex-col">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-0.5 flex items-center"><Award className="w-3 h-3 mr-0.5 text-emerald-500" /> Avg Placement</span>
                            <span className="font-black text-emerald-800 text-xs sm:text-sm">{bestCourse.averagePackage || "N/A"} LPA</span>
                          </div>
                          <div className="bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-100 flex flex-col">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-0.5 flex items-center"><Award className="w-3 h-3 mr-0.5 text-purple-500" /> Max Placement</span>
                            <span className="font-black text-purple-900 text-xs sm:text-sm">{bestCourse.highestPackage || "N/A"} LPA</span>
                          </div>
                        </div>

                        {/* View Specs & Info prominent button */}
                        <div className="pt-1">
                          <button 
                            onClick={() => {
                              setSwipeDirection("up");
                              onSelectCollege(college);
                            }}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-xs py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 w-full border border-rose-200 transition-all active:scale-98 cursor-pointer shadow-xs"
                          >
                            <Info className="w-3.5 h-3.5 text-rose-500" />
                            <span>View Full Info & Specs →</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })() : (
                  <div className="bg-white w-full rounded-[2.5rem] shadow-xl p-8 sm:p-10 text-center border border-slate-100 z-10 relative">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      {processedColleges.length === 0 ? (
                        <AlertCircle className="h-8 w-8 sm:h-10 sm:w-10 text-rose-500" />
                      ) : (
                        <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 text-rose-500" />
                      )}
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2">
                      {processedColleges.length === 0 ? "No Matching Colleges Found" : "All matches reviewed!"}
                    </h3>
                    <p className="text-slate-500 text-xs sm:text-sm mb-6 max-w-sm mx-auto leading-relaxed">
                      {processedColleges.length === 0 ? (
                        selectedCourses.length > 0 ? (
                          <>None of the colleges offer your selected branch(es): <span className="font-bold text-rose-600">{selectedCourses.join(", ")}</span> for your current filter limits.</>
                        ) : (
                          <>No colleges match your rank, fee limit, or cutoff filter criteria.</>
                        )
                      ) : (
                        "You have swiped through all available colleges matching your criteria."
                      )}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      {processedColleges.length === 0 && selectedCourses.length > 0 ? (
                        <button 
                          onClick={() => setStep(2)}
                          className="w-full py-3.5 bg-rose-500 text-white rounded-2xl font-bold active:scale-95 transition-all shadow-lg shadow-rose-500/20 text-xs cursor-pointer"
                        >
                          Modify Selected Branches
                        </button>
                      ) : null}
                      <button 
                        onClick={() => {
                          setSwipeDirection(null);
                          setSwipeIndex(0);
                          setMinFees(0);
                          setMaxFees(300000);
                          setMinCutoff(0);
                          setMaxCutoff(150000);
                        }}
                        className={`w-full py-3.5 text-xs font-bold active:scale-95 transition-all rounded-2xl cursor-pointer ${
                          processedColleges.length === 0 && selectedCourses.length > 0
                            ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            : "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                        }`}
                      >
                        Reset Fee & Cutoff Filters
                      </button>
                    </div>
                  </div>
                )}
                </AnimatePresence>

                {/* Bottom Swipe Actions */}
                {swipeIndex < processedColleges.length && !isVideoFullscreen && (
                  <div className="flex justify-between items-center mt-3 px-2 z-20 relative">
                    <button 
                      onClick={handleSwipeLeft}
                      className="w-14 h-14 sm:w-16 sm:h-16 bg-white/30 hover:bg-white/50 backdrop-blur-xl shadow-xl shadow-slate-900/10 rounded-full flex items-center justify-center border border-white/60 text-slate-900 hover:text-rose-600 active:scale-90 transition-all cursor-pointer group"
                      title="Pass / Swipe Left"
                    >
                      <span className="text-xl sm:text-2xl font-black group-hover:scale-110 transition-transform">✕</span>
                    </button>
                    <div className="bg-white/30 backdrop-blur-xl border border-white/60 px-4 py-1.5 rounded-full text-[10px] font-black text-slate-900 uppercase tracking-widest text-center shadow-xs">
                      Swipe Cards
                    </div>
                    <button 
                      onClick={() => handleSwipeRight(processedColleges[swipeIndex].id)}
                      className="w-14 h-14 sm:w-16 sm:h-16 bg-white/30 hover:bg-white/50 backdrop-blur-xl shadow-xl shadow-rose-500/20 rounded-full flex items-center justify-center border border-white/60 text-rose-500 active:scale-90 transition-all cursor-pointer group"
                      title="Like / Add Favorite"
                    >
                      <Heart className={`h-6 w-6 sm:h-7 sm:w-7 group-hover:scale-110 transition-transform ${((currentUser.favorites || []).includes(processedColleges[swipeIndex].id)) ? 'fill-rose-500 text-rose-500' : 'text-rose-500'}`} />
                    </button>
                  </div>
                )}
              </div>

              {/* Range Filters Panel (Placed Below College Card & Swipe Buttons) */}
              {!isVideoFullscreen && (
                <div className="mt-3 px-2 sm:px-3 py-1 space-y-3">
                  {/* Fees Drag Line Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                      <span className="text-[11px] sm:text-xs uppercase tracking-wider font-extrabold text-slate-700">Fees Limit</span>
                      <span className="font-mono text-rose-600 font-black text-xs sm:text-sm bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md shadow-2xs">
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
                      className="w-full appearance-none h-2 bg-slate-200 rounded-lg outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-rose-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
                    />
                  </div>

                  {/* Cutoff Rank Drag Line Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                      <span className="text-xs sm:text-sm uppercase tracking-wider font-black text-slate-900">{rankType} CUTOFF RANK</span>
                      <span className="font-mono text-rose-600 font-black text-sm sm:text-base bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md shadow-2xs">
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
                      className="w-full appearance-none h-2 bg-slate-200 rounded-lg outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-rose-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
                    />
                  </div>
                </div>
              )}
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

      {/* IMAGE & VIDEO SLIDESHOW MODAL */}
      <AnimatePresence>
        {showSlideshow && currentCollege && (() => {
          const totalSlides = currentCollegeImages.length + (currentCollege.videoUrl ? 1 : 0);
          const isVideoSlide = currentCollege.videoUrl && activeImageIndex === currentCollegeImages.length;

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/95 flex flex-col"
            >
              <div className="p-4 sm:p-6 flex items-center justify-between text-white border-b border-white/10 shrink-0">
                <div className="flex flex-col">
                  <h3 className="font-display font-black text-lg sm:text-xl tracking-tight">{currentCollege.name}</h3>
                  <span className="text-xs text-white/60 font-bold uppercase tracking-widest">
                    {isVideoSlide 
                      ? "Campus Video Tour" 
                      : `${activeImageIndex + 1} of ${currentCollegeImages.length} Campus Photos`}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {!isVideoSlide && (
                    <>
                      <button
                        onClick={() => setSlideshowZoomScale(prev => Math.min(3.5, prev + 0.5))}
                        className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all cursor-pointer"
                        title="Zoom In"
                      >
                        <ZoomIn className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setSlideshowZoomScale(prev => Math.max(1, prev - 0.5))}
                        className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all cursor-pointer"
                        title="Zoom Out"
                      >
                        <ZoomOut className="h-5 w-5" />
                      </button>
                      {slideshowZoomScale > 1 && (
                        <button
                          onClick={() => setSlideshowZoomScale(1)}
                          className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all cursor-pointer"
                          title="Reset Zoom"
                        >
                          <RotateCcw className="h-5 w-5" />
                        </button>
                      )}
                    </>
                  )}
                  <button 
                    onClick={() => {
                      setSlideshowZoomScale(1);
                      setShowSlideshow(false);
                    }}
                    className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-all cursor-pointer text-white ml-2"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden bg-black/40">
                <div 
                  className="relative max-w-full max-h-[70vh] w-full flex items-center justify-center overflow-hidden touch-none"
                  onTouchStart={handleSlideshowTouchStart}
                  onTouchMove={handleSlideshowTouchMove}
                  onTouchEnd={handleSlideshowTouchEnd}
                >
                  {isVideoSlide ? (
                    <div className="w-full max-w-2xl aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10">
                      <AutoPlayVideo 
                        url={currentCollege.videoUrl!} 
                        title={currentCollege.name} 
                      />
                    </div>
                  ) : (
                    <motion.img
                      key={activeImageIndex}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      src={currentCollegeImages[activeImageIndex]}
                      style={{ 
                        transform: `scale(${slideshowZoomScale}) translate(${slideshowPan.x / slideshowZoomScale}px, ${slideshowPan.y / slideshowZoomScale}px)`,
                        transformOrigin: "center"
                      }}
                      className="max-w-full max-h-[70vh] object-contain rounded-2xl sm:rounded-3xl shadow-2xl transition-transform duration-200 cursor-zoom-in select-none"
                      alt="Campus view"
                      onMouseDown={handleSlideshowMouseDown}
                      onMouseMove={handleSlideshowMouseMove}
                      onMouseUp={handleSlideshowMouseUpOrLeave}
                      onMouseLeave={handleSlideshowMouseUpOrLeave}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        toggleSlideshowZoom();
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="p-4 sm:p-6 flex flex-col items-center justify-center space-y-4 shrink-0 border-t border-white/10 bg-black/40">
                {/* Dots Indicator */}
                <div className="flex items-center justify-center space-x-2">
                  {Array.from({ length: totalSlides }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSlideshowZoomScale(1);
                        setActiveImageIndex(idx);
                      }}
                      className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                        idx === activeImageIndex ? "w-8 bg-rose-500" : "w-2 bg-white/20"
                      }`}
                      title={idx === currentCollegeImages.length ? "Campus Video" : `Photo ${idx + 1}`}
                    />
                  ))}
                </div>

                {/* Left & Right navigation buttons centered at the bottom (fully down) */}
                {totalSlides > 1 && (
                  <div className="flex items-center justify-center space-x-6">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSlideshowZoomScale(1);
                        setActiveImageIndex(prev => (prev === 0 ? totalSlides - 1 : prev - 1));
                      }}
                      className="p-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-white transition-all active:scale-90 cursor-pointer flex items-center justify-center"
                      title="Previous Slide"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <span className="text-xs text-white/50 font-bold font-mono tracking-widest uppercase">
                      {activeImageIndex + 1} of {totalSlides}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSlideshowZoomScale(1);
                        setActiveImageIndex(prev => (prev === totalSlides - 1 ? 0 : prev + 1));
                      }}
                      className="p-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-white transition-all active:scale-90 cursor-pointer flex items-center justify-center"
                      title="Next Slide"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

export default StudentDashboard;
