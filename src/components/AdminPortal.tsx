import React, { useState, useRef, useEffect } from "react";
import { School, Search, FileDown, FileSpreadsheet, FileCode, Trash2, Edit3, Sparkles, Upload, Loader2, Save, MapPin, Phone, Globe, DollarSign, Award, PlusCircle , Database, Users, RefreshCcw} from "lucide-react";
import { College, StudentProfile } from "../types";
import { jsPDF } from "jspdf";

interface AdminPortalProps {
  colleges: College[];
  onAddCollege: (college: College, isEditing?: boolean) => Promise<void>;
  onDeleteCollege: (id: string) => Promise<void>;
  onImportColleges: (colleges: College[]) => Promise<void>;
  isFallback: boolean;
}

export default function AdminPortal({
  colleges,
  onAddCollege,
  onDeleteCollege,
  onImportColleges,
  isFallback
}: AdminPortalProps) {
  // Form states
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [details, setDetails] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [website, setWebsite] = useState("");
  
  // 5 Editable image links state variables
  const [image1, setImage1] = useState("");
  const [image2, setImage2] = useState("");
  const [image3, setImage3] = useState("");
  const [image4, setImage4] = useState("");
  const [image5, setImage5] = useState("");

  // Courses List state for multiple courses per college
  const [coursesList, setCoursesList] = useState<Array<{
    courseName: string;
    fees: number;
    cutoffRank: number;
    cutoffRankPreviousYear?: number;
    averagePackage: number;
    highestPackage: number;
  }>>([]);

  // Course sub-form inputs
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseFees, setNewCourseFees] = useState("");
  const [newCourseCutoff, setNewCourseCutoff] = useState("");
  const [newCoursePrevCutoff, setNewCoursePrevCutoff] = useState("");
  const [newCourseAvgPkg, setNewCourseAvgPkg] = useState("");
  const [newCourseHiPkg, setNewCourseHiPkg] = useState("");

  // UI Statuses
  
  const [viewMode, setViewMode] = useState<'colleges'|'students'>('colleges');
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetch("/api/admin/students?adminCode=831067")
      .then(r => r.json())
      .then(d => {
        if (d.data) setStudents(d.data);
      })
      .catch(console.error);
  }, []);

  const handleExportStudentsCSV = () => {
    if (students.length === 0) return alert("No students available.");
    const headers = ["Email", "First Name", "Last Name", "Verified", "CET Rank", "DCET Score"];
    const rows = students.map(s => [
      s.email,
      s.firstName,
      s.lastName,
      s.isVerified ? "Yes" : "No",
      s.cetRank || "-",
      s.dcetScore || "-"
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => '"' + c + '"').join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportTotalDatabase = () => {
    handleExportCSV();
    setTimeout(handleExportStudentsCSV, 500);
  };

  const handleExportStudentsPDF = () => {
    try {
      // Create HTML table and print it, as jspdf is available but we can do a quick window.print for the students table
      const printWindow = window.open("", "_blank");
      if (!printWindow) return alert("Pop-ups blocked");
      printWindow.document.write("<html><head><title>Students Export</title><style>table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid black; padding: 8px; text-align: left; }</style></head><body>");
      printWindow.document.write("<h2>Students Database</h2><table><tr><th>Email</th><th>Name</th><th>Verified</th><th>CET Rank</th></tr>");
      students.forEach(s => {
        printWindow.document.write(`<tr><td>${s.email}</td><td>${s.firstName} ${s.lastName}</td><td>${s.isVerified ? "Yes" : "No"}</td><td>${s.cetRank || "-"}</td></tr>`);
      });
      printWindow.document.write("</table></body></html>");
      printWindow.document.close();
      printWindow.print();
    } catch (e) {
      alert("Failed to export PDF");
    }
  };

  const handleSmartUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });

      const res = await fetch("/api/admin/smart-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          data: base64Data,
          adminCode: "831067"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.supabaseError) {
        setSuccessMsg(`Data was successfully parsed and matched for ${data.updatedCount} colleges in the LOCAL STORE. However, your Supabase database schema requires a schema update: "${data.supabaseError}". Please copy and run the SQL migration script (click 'View DB Setup SQL' above) in your Supabase SQL Editor to synchronize columns.`);
      } else {
        setSuccessMsg(`Successfully scraped and merged data for ${data.updatedCount} colleges! Refreshing...`);
        setTimeout(() => window.location.reload(), 2000);
      }
    } catch (err: any) {
      setErrorMsg("Smart Upload failed: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSyncDatabase = async () => {
    setSyncing(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/admin/sync-database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminCode: "831067" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      if (data.supabaseError) {
        setErrorMsg(`Sync saved 100% locally, but encountered a Supabase schema mismatch: "${data.supabaseError}". Please copy and run the SQL migration script (click 'View DB Setup SQL' above) in your Supabase SQL Editor to align columns.`);
      } else {
        setSuccessMsg(`Successfully synchronized ${data.syncedCount} records to Cloud Database!`);
      }
    } catch (err: any) {
      setErrorMsg("Sync failed: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
  const [showSqlDialog, setShowSqlDialog] = useState(false);
  const [sqlContent, setSqlContent] = useState("");

  const handleScrapeUrl = async () => {
    if (!scrapeUrl.trim() || !scrapeUrl.trim().startsWith("http")) {
      setErrorMsg("Please enter a valid HTTP/HTTPS URL to scrape first.");
      return;
    }

    setScraping(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/ai/scrape-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scrapeUrl.trim() })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      const scraped = result.data;
      if (scraped.name) setName(scraped.name);
      if (scraped.place) setPlace(scraped.place);
      if (scraped.locationAddress) setLocationAddress(scraped.locationAddress);
      if (scraped.details) setDetails(scraped.details);
      if (scraped.contactNumber) setContactNumber(scraped.contactNumber);
      if (scraped.website) setWebsite(scraped.website);

      // default packages/fees if present
      if (scraped.fees) {
        setNewCourseFees(String(scraped.fees));
      }

      // set image place holders (generating details can find actual matches)
      const genericPics = [
        "",
        "",
        "",
        "",
        ""
      ];
      setImage1(genericPics[0]);
      setImage2(genericPics[1]);
      setImage3(genericPics[2]);
      setImage4(genericPics[3]);
      setImage5(genericPics[4]);

      if (scraped.courses && scraped.courses.length > 0) {
        setCoursesList(scraped.courses.map((c: any) => ({
          courseName: c.courseName,
          fees: scraped.fees || 220000,
          cutoffRank: Math.floor(1000 + Math.random() * 8000),
          cutoffRankPreviousYear: Math.floor(1200 + Math.random() * 8000),
          averagePackage: c.averagePackage || scraped.averagePackage || 6.5,
          highestPackage: scraped.highestPackage || 15.0
        })));
      } else {
        setCoursesList([
          { courseName: "Computer Science Engineering", fees: scraped.fees || 220000, cutoffRank: 1250, cutoffRankPreviousYear: 1400, averagePackage: scraped.averagePackage || 7.5, highestPackage: scraped.highestPackage || 25 },
          { courseName: "Electronics & Communication Engineering", fees: (scraped.fees || 220000) - 20000, cutoffRank: 3400, cutoffRankPreviousYear: 3700, averagePackage: scraped.averagePackage ? scraped.averagePackage - 1 : 6.0, highestPackage: scraped.highestPackage || 20 }
        ]);
      }

      setSuccessMsg(`AI successfully scraped & populated form fields for "${scraped.name || 'college'}"! Feel free to edit below.`);
      setScrapeUrl("");
    } catch (err: any) {
      setErrorMsg("Failed to scrape URL: " + err.message);
    } finally {
      setScraping(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setId("");
    setName("");
    setPlace("");
    setLocationAddress("");
    setDetails("");
    setContactNumber("");
    setWebsite("");
    
    // reset 5 image links
    setImage1("");
    setImage2("");
    setImage3("");
    setImage4("");
    setImage5("");

    // reset courses
    setCoursesList([]);
    setNewCourseName("");
    setNewCourseFees("");
    setNewCourseCutoff("");
    setNewCoursePrevCutoff("");
    setNewCourseAvgPkg("");
    setNewCourseHiPkg("");

    setIsEditing(false);
    setErrorMsg("");
  };

  const handleEditLoad = (college: College) => {
    setId(college.id);
    setName(college.name);
    setPlace(college.place);
    setLocationAddress(college.locationAddress || "");
    setDetails(college.details);
    setContactNumber(college.contactNumber);
    setWebsite(college.website);

    // load images
    setImage1(college.images?.[0] || "");
    setImage2(college.images?.[1] || "");
    setImage3(college.images?.[2] || "");
    setImage4(college.images?.[3] || "");
    setImage5(college.images?.[4] || "");

    // load courses
    setCoursesList(college.courses || []);

    setIsEditing(true);
    setErrorMsg("");
    setSuccessMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAiGenerate = async () => {
    if (!name.trim() || !place.trim()) {
      setErrorMsg("Please enter both the College Name and Location/Place first to let Groq AI search and generate details!");
      return;
    }

    setGeneratingAi(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/ai/generate-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          place: place.trim(),
          course: "Computer Science Engineering"
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      const generated = result.data;
      setLocationAddress(generated.locationAddress || `${name.trim()}, ${place.trim()}`);
      setDetails(generated.details);
      setContactNumber(generated.contactNumber);
      setWebsite(generated.website);

      // set image textboxes
      setImage1(generated.images?.[0] || "");
      setImage2(generated.images?.[1] || "");
      setImage3(generated.images?.[2] || "");
      setImage4(generated.images?.[3] || "");
      setImage5(generated.images?.[4] || "");

      // build courses lists based on response or standard defaults if not present
      setCoursesList(generated.courses || [
        { courseName: "Computer Science Engineering", fees: generated.fees || 250000, cutoffRank: 1250, cutoffRankPreviousYear: 1400, averagePackage: generated.averagePackage || 14.5, highestPackage: generated.highestPackage || 48 },
        { courseName: "Information Science Engineering", fees: (generated.fees || 250000) - 20000, cutoffRank: 2400, cutoffRankPreviousYear: 2600, averagePackage: (generated.averagePackage || 14.5) - 2, highestPackage: (generated.highestPackage || 48) - 5 },
        { courseName: "Electronics & Communication Engineering", fees: (generated.fees || 250000) - 40000, cutoffRank: 4200, cutoffRankPreviousYear: 4500, averagePackage: (generated.averagePackage || 14.5) - 3, highestPackage: (generated.highestPackage || 48) - 8 }
      ]);

      setSuccessMsg("College specifications & 5 campus images successfully generated by Groq AI!");
    } catch (err: any) {
      setErrorMsg("Failed to auto-generate college details: " + err.message);
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleAddCourseToList = () => {
    if (!newCourseName.trim()) {
      setErrorMsg("Course Name is required to add a branch.");
      return;
    }
    const cObj = {
      courseName: newCourseName.trim(),
      fees: Number(newCourseFees) || 150000,
      cutoffRank: Number(newCourseCutoff) || 10000,
      cutoffRankPreviousYear: newCoursePrevCutoff.trim() ? Number(newCoursePrevCutoff) : undefined,
      averagePackage: Number(newCourseAvgPkg) || 6.5,
      highestPackage: Number(newCourseHiPkg) || 12.0
    };
    setCoursesList([...coursesList, cObj]);
    setNewCourseName("");
    setNewCourseFees("");
    setNewCourseCutoff("");
    setNewCoursePrevCutoff("");
    setNewCourseAvgPkg("");
    setNewCourseHiPkg("");
    setErrorMsg("");
  };

  const handleRemoveCourseFromList = (idx: number) => {
    setCoursesList(coursesList.filter((_, i) => i !== idx));
  };

  const handleSaveCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !place.trim()) {
      setErrorMsg("Name and Place are required fields.");
      return;
    }

    if (coursesList.length === 0) {
      setErrorMsg("Please add at least one course/branch details to this college.");
      return;
    }

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const activeImages = [image1, image2, image3, image4, image5].map(s => s.trim()).filter(Boolean);
      const savedImages = activeImages;

      // Derive basic package and fees for backward compatibility / database column fallbacks
      const computedFees = Math.max(...coursesList.map(c => c.fees));
      const computedAvgPkg = Number((coursesList.reduce((acc, c) => acc + c.averagePackage, 0) / coursesList.length).toFixed(1));
      const computedHiPkg = Math.max(...coursesList.map(c => c.highestPackage));

      const collegeObj: College = {
        id: id || "clg_" + Date.now(),
        name: name.trim(),
        place: place.trim(),
        locationAddress: locationAddress.trim() || `${name.trim()}, ${place.trim()}`,
        averagePackage: computedAvgPkg,
        highestPackage: computedHiPkg,
        course: coursesList[0]?.courseName || "General",
        fees: computedFees,
        details: details.trim(),
        contactNumber: contactNumber.trim(),
        website: website.trim(),
        images: savedImages,
        courses: coursesList
      };

      await onAddCollege(collegeObj, isEditing);
      setSuccessMsg(isEditing ? "College details successfully updated!" : "New college successfully registered with all courses!");
      resetForm();
    } catch (err: any) {
      setErrorMsg("Failed to save college: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (collegeId: string) => {
    if (window.confirm("Are you sure you want to delete this college from the registry?")) {
      try {
        await onDeleteCollege(collegeId);
        setSuccessMsg("College record successfully purged.");
      } catch (err: any) {
        setErrorMsg("Failed to delete college.");
      }
    }
  };

  // CSV Generator
  const handleExportCSV = () => {
    const headers = ["id", "name", "place", "course", "averagePackage", "highestPackage", "fees", "contactNumber", "website", "details", "images"];
    const csvRows = [headers.join(",")];

    for (const c of colleges) {
      const row = [
        `"${c.id}"`,
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.place.replace(/"/g, '""')}"`,
        `"${c.course.replace(/"/g, '""')}"`,
        c.averagePackage,
        c.highestPackage,
        c.fees,
        `"${c.contactNumber}"`,
        `"${c.website}"`,
        `"${c.details.replace(/"/g, '""').replace(/\n/g, " ")}"`,
        `"${JSON.stringify(c.images || []).replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(","));
    }

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `karnataka_colleges_list_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Parser (handles quotes & commas inside details gracefully)
  const parseCSVText = (csvText: string): string[][] => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentVal = "";
    let insideQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentVal += '"';
          i++; // skip next quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        currentRow.push(currentVal.trim());
        currentVal = "";
      } else if ((char === '\r' || char === '\n') && !insideQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        currentRow.push(currentVal.trim());
        if (currentRow.some(val => val !== "")) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentVal = "";
      } else {
        currentVal += char;
      }
    }
    if (currentVal || currentRow.length > 0) {
      currentRow.push(currentVal.trim());
      if (currentRow.some(val => val !== "")) {
        rows.push(currentRow);
      }
    }
    return rows;
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = parseCSVText(text);
        if (parsed.length < 2) {
          setErrorMsg("CSV file is empty or missing content.");
          return;
        }

        const headers = parsed[0].map(h => h.toLowerCase().replace(/["\s_]/g, ""));
        const importedColleges: College[] = [];

        // Identify indexes
        const idxId = headers.indexOf("id");
        const idxName = headers.indexOf("name");
        const idxPlace = headers.indexOf("place");
        const idxCourse = headers.indexOf("course");
        const idxAvg = headers.indexOf("averagepackage");
        const idxHighest = headers.indexOf("highestpackage");
        const idxFees = headers.indexOf("fees");
        const idxContact = headers.indexOf("contactnumber");
        const idxWeb = headers.indexOf("website");
        const idxDetails = headers.indexOf("details");
        const idxImages = headers.indexOf("images");

        const safeStr = (val: any, defaultVal = "") => {
          if (val === undefined || val === null) return defaultVal;
          return String(val).replace(/^"|"$/g, "").trim();
        };

        for (let idx = 1; idx < parsed.length; idx++) {
          const row = parsed[idx];
          if (row.length < 3) continue;

          let parsedImages: string[] = [];
          if (idxImages >= 0 && row[idxImages]) {
            try {
              // Clean brackets or check if JSON
              const imgStr = safeStr(row[idxImages]);
              if (imgStr && imgStr !== "undefined") {
                parsedImages = JSON.parse(imgStr);
              } else {
                parsedImages = [];
              }
            } catch (err) {
              parsedImages = row[idxImages] ? String(row[idxImages]).split(";").map(s => s.trim()) : [];
            }
          }

          const importedName = (idxName >= 0) ? safeStr(row[idxName]) : "";
          const importedPlace = (idxPlace >= 0) ? safeStr(row[idxPlace]) : "";
          const importedCourse = (idxCourse >= 0) ? safeStr(row[idxCourse], "Engineering") : "Engineering";
          const importedFees = (idxFees >= 0) ? Number(row[idxFees]) || 150000 : 150000;
          const importedAvgPkg = (idxAvg >= 0) ? Number(row[idxAvg]) || 6.5 : 6.5;
          const importedHiPkg = (idxHighest >= 0) ? Number(row[idxHighest]) || 12 : 12;

          const collegeObj: College = {
            id: (idxId >= 0 && row[idxId]) ? safeStr(row[idxId]) : "csv_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now(),
            name: importedName,
            place: importedPlace,
            locationAddress: `${importedName}, ${importedPlace}`,
            course: importedCourse,
            averagePackage: importedAvgPkg,
            highestPackage: importedHiPkg,
            fees: importedFees,
            contactNumber: (idxContact >= 0) ? safeStr(row[idxContact]) : "",
            website: (idxWeb >= 0) ? safeStr(row[idxWeb]) : "",
            details: (idxDetails >= 0) ? safeStr(row[idxDetails]) : "",
            images: parsedImages,
            courses: [
              {
                courseName: importedCourse,
                fees: importedFees,
                cutoffRank: 5000,
                cutoffRankPreviousYear: 6000,
                averagePackage: importedAvgPkg,
                highestPackage: importedHiPkg
              }
            ]
          };

          if (collegeObj.name && collegeObj.place) {
            importedColleges.push(collegeObj);
          }
        }

        if (importedColleges.length === 0) {
          setErrorMsg("Could not parse any valid colleges from the CSV. Please ensure headers are correct.");
          return;
        }

        await onImportColleges(importedColleges);
        setSuccessMsg(`Successfully imported & synchronized ${importedColleges.length} colleges from the CSV spreadsheet!`);
      } catch (err: any) {
        setErrorMsg("Failed to import CSV: " + err.message);
      } finally {
        if (csvInputRef.current) csvInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const [isRefining, setIsRefining] = useState(false);
  const [refineProgress, setRefineProgress] = useState({ current: 0, total: 0 });

  const handleAIRefineDatabase = async () => {
    if (!window.confirm("Are you sure you want to run AI Refinement on all colleges? This may take a few minutes.")) return;
    
    setIsRefining(true);
    setErrorMsg("");
    setSuccessMsg("");
    
    let successCount = 0;
    
    try {
      setRefineProgress({ current: 0, total: colleges.length });
      for (let i = 0; i < colleges.length; i++) {
        const c = colleges[i];
        
        try {
          const res = await fetch("/api/colleges/ai-refine", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ adminCode: "831067", college: c })
          });
          
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.refinedCollege) {
              const updated = {
                ...c,
                ...data.refinedCollege,
                // keep the original courses but update the top-level stats
              };
              
              await onAddCollege(updated, true);
              successCount++;
            }
          }
        } catch (e) {
          console.warn("AI refine error for", c.name, e);
        }
        
        setRefineProgress({ current: i + 1, total: colleges.length });
      }
      
      setSuccessMsg(`Successfully refined ${successCount} out of ${colleges.length} colleges using AI!`);
    } catch (err: any) {
      setErrorMsg("Refinement process failed.");
    } finally {
      setIsRefining(false);
      setRefineProgress({ current: 0, total: 0 });
    }
  };

  // PDF Exporter with high-quality layout using jsPDF
  const handleExportPDF = () => {
    const doc = new jsPDF("l", "mm", "a4");
    doc.setFont("helvetica", "bold");
    
    // Header
    doc.setFillColor(30, 41, 59); // Slate-900
    doc.rect(0, 0, 297, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("Karnataka Higher-Education Registry Report", 15, 18);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()} | Total Registered Colleges: ${colleges.length}`, 15, 28);

    // Columns
    doc.setFillColor(241, 245, 249); // Slate-100
    doc.rect(10, 45, 277, 10, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    
    doc.text("COLLEGE NAME", 12, 51);
    doc.text("PLACE", 95, 51);
    doc.text("COURSE", 155, 51);
    doc.text("FEES (INR/yr)", 215, 51);
    doc.text("AVG PKG", 245, 51);
    doc.text("HI PKG", 265, 51);

    // Rows
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);

    let y = 62;
    colleges.forEach((c) => {
      if (y > 185) {
        doc.addPage();
        // Re-draw subheader
        doc.setFillColor(30, 41, 59);
        doc.rect(0, 0, 297, 15, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text("Karnataka Higher-Education Registry Report (Continued)", 15, 10);

        y = 30;
        doc.setFillColor(241, 245, 249);
        doc.rect(10, y - 7, 277, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        doc.text("COLLEGE NAME", 12, y - 2);
        doc.text("PLACE", 95, y - 2);
        doc.text("COURSE", 155, y - 2);
        doc.text("FEES (INR/yr)", 215, y - 2);
        doc.text("AVG PKG", 245, y - 2);
        doc.text("HI PKG", 265, y - 2);
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        y += 8;
      }

      // Handle clipping/truncating strings to prevent overlapping
      const cName = c.name.length > 50 ? c.name.substring(0, 48) + "..." : c.name;
      const cPlace = c.place.length > 35 ? c.place.substring(0, 33) + "..." : c.place;
      const cCourse = c.course.length > 35 ? c.course.substring(0, 33) + "..." : c.course;

      doc.text(cName, 12, y);
      doc.text(cPlace, 95, y);
      doc.text(cCourse, 155, y);
      doc.text(`Rs. ${c.fees?.toLocaleString() || "0"}`, 215, y);
      doc.text(`${c.averagePackage} LPA`, 245, y);
      doc.text(`${c.highestPackage} LPA`, 265, y);

      y += 8;
    });

    doc.save(`karnataka_colleges_report_${Date.now()}.pdf`);
  };

  const loadSqlScript = async () => {
    try {
      const res = await fetch("/api/db-schema-sql");
      const text = await res.text();
      setSqlContent(text);
      setShowSqlDialog(true);
    } catch (err) {
      console.error(err);
    }
  };

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlContent);
    alert("Supabase table creation SQL scripts copied to clipboard!");
  };

  // Filter colleges inside administration panel
  const filteredColleges = colleges.filter(c =>
    c.name.toLowerCase().includes(adminSearch.toLowerCase()) ||
    c.place.toLowerCase().includes(adminSearch.toLowerCase()) ||
    c.course.toLowerCase().includes(adminSearch.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT CARD: Create / Edit College Panel (5cols) */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm sticky top-24">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-5">
              <div className="flex items-center space-x-2">
                <School className="h-5 w-5 text-blue-600" />
                <h2 className="font-display font-bold text-lg text-gray-900">
                  {isEditing ? "Edit College Parameters" : "Register Karnataka College"}
                </h2>
              </div>
              {isEditing && (
                <button
                  id="cancel-edit-btn"
                  onClick={resetForm}
                  className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl font-semibold">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-xl font-semibold animate-bounce">
                {successMsg}
              </div>
            )}

            {/* URL DATA SCRAPER SECTION */}
            <div className="mb-6 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl space-y-3">
              <div className="flex items-center space-x-1.5 text-amber-900">
                <Sparkles className="h-4 w-4 animate-pulse text-amber-700" />
                <span className="text-xs font-bold uppercase tracking-wider">AI URL Data Scraper</span>
              </div>
              <p className="text-[10.5px] text-amber-900/60 leading-relaxed font-medium">
                Paste any college admission URL or specification page. AI will read, analyze, and instantly populate all fields & branches!
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="E.g., https://reva.edu.in/admissions"
                  value={scrapeUrl}
                  onChange={(e) => setScrapeUrl(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white/80 border border-amber-200/40 rounded-xl text-xs focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-hidden transition-all font-medium text-amber-950"
                />
                <button
                  type="button"
                  disabled={scraping}
                  onClick={handleScrapeUrl}
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-xs active:scale-98 flex items-center space-x-1 shrink-0"
                >
                  {scraping ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Reading Page...</span>
                    </>
                  ) : (
                    <span>Scrape with AI</span>
                  )}
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveCollege} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    College Name
                  </label>
                  <input
                    id="admin-college-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="E.g., RV College of Engineering"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-amber-600 focus:bg-white focus:ring-1 focus:ring-amber-600 outline-hidden transition-all text-sm font-medium text-gray-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Place / City
                  </label>
                  <input
                    id="admin-college-place"
                    type="text"
                    required
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    placeholder="E.g., Bangalore"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-amber-600 focus:bg-white focus:ring-1 focus:ring-amber-600 outline-hidden transition-all text-sm font-medium text-gray-900"
                  />
                </div>
              </div>

              {/* AI Auto-Generate Trigger */}
              <button
                type="button"
                id="ai-details-autofill-btn"
                disabled={generatingAi}
                onClick={handleAiGenerate}
                className="w-full py-3 bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-800 hover:to-amber-950 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-70 disabled:cursor-wait shadow-md shadow-amber-900/10 active:scale-99"
              >
                {generatingAi ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>AI Counselor gathering details...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
                    <span>AI Auto-Generate Specs & Courses</span>
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Contact Phone
                  </label>
                  <input
                    id="admin-college-phone"
                    type="text"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="E.g., 080-68188100"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-amber-600 focus:bg-white focus:ring-1 focus:ring-amber-600 outline-hidden transition-all text-sm font-medium text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Official Website
                  </label>
                  <input
                    id="admin-college-website"
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="E.g., https://rvce.edu.in"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-amber-600 focus:bg-white focus:ring-1 focus:ring-amber-600 outline-hidden transition-all text-sm font-medium text-gray-900"
                  />
                </div>
              </div>

              {/* Location address moved here, below the official details & button */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Full Location Address</span>
                  <span className="text-[9px] font-bold text-slate-400 font-mono normal-case">Optional</span>
                </label>
                <input
                  id="admin-college-locationAddress"
                  type="text"
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  placeholder="E.g., Mysuru Rd, RV Vidyaniketan, Bengaluru, Karnataka"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-amber-600 focus:bg-white focus:ring-1 focus:ring-amber-600 outline-hidden transition-all text-sm font-medium text-gray-900"
                />
              </div>

              {/* Course Branch Manager Array */}
              <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-2xl space-y-3">
                <span className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Manage Course Branches ({coursesList.length})
                </span>

                {coursesList.length > 0 && (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {coursesList.map((c, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white rounded-xl border border-gray-100 text-xs shadow-2xs">
                        <div className="flex-1 min-w-0 pr-2">
                          <span className="block font-semibold text-gray-900 truncate">{c.courseName}</span>
                          <span className="block text-[10px] text-gray-500 font-mono">
                            Fees: ₹{c.fees?.toLocaleString() || "0"} | Cutoff: {c.cutoffRank} | Avg: {c.averagePackage}LPA
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCourseFromList(index)}
                          className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer shrink-0"
                          title="Remove branch"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sub-form to Add a Course Branch */}
                <div className="p-3 bg-white border border-gray-100 rounded-xl space-y-2 text-xs">
                  <span className="block font-bold text-gray-600 text-[10px] uppercase tracking-wider">Add New Branch details:</span>
                  
                  <input
                    type="text"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    placeholder="Course Branch Name (e.g. Computer Science)"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-lg"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={newCourseFees}
                      onChange={(e) => setNewCourseFees(e.target.value)}
                      placeholder="College Fees (INR)"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-lg text-xs"
                    />
                    <input
                      type="number"
                      value={newCourseCutoff}
                      onChange={(e) => setNewCourseCutoff(e.target.value)}
                      placeholder="CET Cutoff Rank"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      value={newCoursePrevCutoff}
                      onChange={(e) => setNewCoursePrevCutoff(e.target.value)}
                      placeholder="Prev Cutoff"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-lg text-xs"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={newCourseAvgPkg}
                      onChange={(e) => setNewCourseAvgPkg(e.target.value)}
                      placeholder="Avg LPA"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-lg text-xs"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={newCourseHiPkg}
                      onChange={(e) => setNewCourseHiPkg(e.target.value)}
                      placeholder="Max LPA"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddCourseToList}
                    className="w-full py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                  >
                    + Add Course to College list
                  </button>
                </div>
              </div>

              {/* Editable Images (5 URLs) */}
              <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-2xl space-y-2">
                <span className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Edit 5 College Image Links (URLs)
                </span>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={image1}
                    onChange={(e) => setImage1(e.target.value)}
                    placeholder="Campus Image URL 1"
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700"
                  />
                  <input
                    type="text"
                    value={image2}
                    onChange={(e) => setImage2(e.target.value)}
                    placeholder="Campus Image URL 2"
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700"
                  />
                  <input
                    type="text"
                    value={image3}
                    onChange={(e) => setImage3(e.target.value)}
                    placeholder="Campus Image URL 3"
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700"
                  />
                  <input
                    type="text"
                    value={image4}
                    onChange={(e) => setImage4(e.target.value)}
                    placeholder="Campus Image URL 4"
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700"
                  />
                  <input
                    type="text"
                    value={image5}
                    onChange={(e) => setImage5(e.target.value)}
                    placeholder="Campus Image URL 5"
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Description / Cutoff Details
                </label>
                <textarea
                  id="admin-college-details"
                  rows={3}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Enter specific counseling criteria or details..."
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-amber-600 focus:bg-white focus:ring-1 focus:ring-amber-600 outline-hidden transition-all text-sm font-medium"
                />
              </div>

              <button
                type="submit"
                id="save-college-submit-btn"
                disabled={saving}
                className="w-full py-3 bg-amber-800 hover:bg-amber-950 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-75 disabled:cursor-wait"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Synchronizing...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>{isEditing ? "Update College Specifications" : "Register and Save College"}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT CARD: Colleges Database Registry List & Sync (7cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
            
            
            {/* Headers & Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h2 className="font-display font-bold text-lg text-gray-900">
                  Karnataka Database Directory
                </h2>
                <div className="flex space-x-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setViewMode('colleges')}
                    className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all ${viewMode === 'colleges' ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    Colleges
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('students')}
                    className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all ${viewMode === 'students' ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    Students
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  onClick={handleExportTotalDatabase}
                  className="flex-1 sm:flex-initial flex items-center justify-center space-x-1 px-3 py-1.5 text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold rounded-lg transition-all"
                >
                  <Database className="h-3.5 w-3.5" />
                  <span>Total Database CSV</span>
                </button>
                
                <button
                  onClick={viewMode === 'colleges' ? handleExportPDF : handleExportStudentsPDF}
                  className="flex-1 sm:flex-initial flex items-center justify-center space-x-1 px-3 py-1.5 text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold rounded-lg transition-all cursor-pointer"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  <span>PDF</span>
                </button>
                
                <button
                  onClick={handleExportCSV}
                  className="flex-1 sm:flex-initial flex items-center justify-center space-x-1 px-3 py-1.5 text-xs border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold rounded-lg transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>CSV</span>
                </button>

                <button
                  onClick={handleSyncDatabase}
                  disabled={syncing}
                  className="flex-1 sm:flex-initial flex items-center justify-center space-x-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                  <span>Cloud Sync</span>
                </button>

                {viewMode === 'colleges' && (
                  <>
                    <button
                      onClick={() => csvInputRef.current?.click()}
                      className="flex-1 sm:flex-initial flex items-center justify-center space-x-1 px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all cursor-pointer"
                      title="Upload custom edited CSV to overwrite or update matching college details"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Upload CSV (Overwrite)</span>
                    </button>
                    <input
                      type="file"
                      accept=".csv"
                      ref={csvInputRef}
                      onChange={handleImportCSV}
                      className="hidden"
                    />

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 sm:flex-initial flex items-center justify-center space-x-1 px-3 py-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-all cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Smart Scrape (CSV/PDF)</span>
                    </button>
                    <input
                      type="file"
                      accept=".csv, .pdf"
                      ref={fileInputRef}
                      onChange={handleSmartUpload}
                      className="hidden"
                    />

                    <button
                      onClick={handleAIRefineDatabase}
                      disabled={isRefining}
                      className="flex-1 sm:flex-initial flex items-center justify-center space-x-1 px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50"
                      title="Use AI to fix college names, locations, generate details, and fix stats"
                    >
                      {isRefining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      <span>{isRefining ? `Refining (${refineProgress.current}/${refineProgress.total})` : "AI Refine Database"}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
{/* Keyword Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                id="admin-search-input"
                type="text"
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                placeholder="Search registered colleges by name, branch, or city..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-hidden transition-all"
              />
            </div>

            {/* List Table */}
            <div className="border border-gray-100 rounded-2xl overflow-hidden overflow-x-auto bg-slate-50/50 max-h-[580px] overflow-y-auto">
              {viewMode === "colleges" ? (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-gray-100 text-gray-500 font-bold">
                      <th className="p-3">College & Location</th>
                      <th className="p-3">Course Branches</th>
                      <th className="p-3 text-center">Packages</th>
                      <th className="p-3 text-center">Rating</th>
                    <th className="p-3 text-right">Max Fee</th>
                      <th className="p-3 text-center">Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredColleges.length > 0 ? (
                      filteredColleges.map((college) => (
                        <tr key={college.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="p-3">
                            <span className="font-extrabold text-gray-900 block">{college.name}</span>
                            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">{college.locationAddress || college.place}</span>
                            <span className="text-[10px] text-gray-400 flex items-center mt-0.5">
                              <MapPin className="h-2.5 w-2.5 mr-0.5" />
                              {college.place}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {college.courses && college.courses.length > 0 ? (
                                college.courses.map((c, i) => (
                                  <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded-md border border-blue-100" title={`Fees: ₹${c.fees?.toLocaleString() || "0"}`}>
                                    {c.courseName}
                                  </span>
                                ))
                              ) : (
                                <span className="px-1.5 py-0.5 bg-gray-50 text-gray-500 text-[10px] font-semibold rounded-md">
                                  {college.course}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center font-mono">
                            <span className="block text-[10px] text-emerald-700">Avg: {college.averagePackage} LPA</span>
                            <span className="block text-[10px] text-blue-700 font-bold">Max: {college.highestPackage} LPA</span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
                              <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                              {college.rating || "N/A"}
                            </span>
                          </td>
                          <td className="p-3 text-right font-bold font-mono text-gray-800">
                            ₹{college.fees?.toLocaleString() || "0"}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                id={`edit-college-btn-${college.id}`}
                                onClick={() => handleEditLoad(college)}
                                title="Edit specifications"
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                              >
                                <Edit3 className="h-4.5 w-4.5" />
                              </button>
                              <button
                                id={`delete-college-btn-${college.id}`}
                                onClick={() => handleDelete(college.id)}
                                title="Delete record"
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-400">
                          No colleges match your keyword search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-gray-100 text-gray-500 font-bold">
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Email Address</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">CET Rank / Scores</th>
                      <th className="p-3 text-center">Favorites</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {students.length > 0 ? (
                      students
                        .filter(s => 
                          (s.firstName || "").toLowerCase().includes(adminSearch.toLowerCase()) ||
                          (s.lastName || "").toLowerCase().includes(adminSearch.toLowerCase()) ||
                          (s.email || "").toLowerCase().includes(adminSearch.toLowerCase())
                        )
                        .map((student, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                            <td className="p-3">
                              <span className="font-extrabold text-gray-900 block">
                                {student.firstName} {student.lastName}
                              </span>
                            </td>
                            <td className="p-3 font-medium text-gray-600">
                              {student.email}
                            </td>
                            <td className="p-3 text-center">
                              {student.isVerified ? (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-100">
                                  Verified
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full border border-amber-100">
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono text-gray-700">
                              {student.cetRank ? (
                                <span className="block text-blue-700 font-bold">CET: {student.cetRank}</span>
                              ) : null}
                              {student.dcetScore ? (
                                <span className="block text-purple-700">DCET: {student.dcetScore}</span>
                              ) : null}
                              {student.examScore ? (
                                <span className="block text-gray-500">Board: {student.examScore}%</span>
                              ) : null}
                              {!student.cetRank && !student.dcetScore && !student.examScore ? (
                                <span className="text-gray-400 italic">Not set</span>
                              ) : null}
                            </td>
                            <td className="p-3 text-center font-bold text-gray-500">
                              {student.favorites?.length || 0} ❤
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-400">
                          No registered students available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SQL Script View Dialogue */}
      {showSqlDialog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <FileCode className="h-5 w-5 text-amber-400" />
                <div>
                  <h3 className="font-display font-bold text-base text-white">
                    Supabase SQL Initialization Schema
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Copy and run this inside your Supabase SQL Editor to enable real-time storage
                  </p>
                </div>
              </div>
              <button
                id="close-sql-dialog"
                onClick={() => setShowSqlDialog(false)}
                className="text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-850 p-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-900">
              <pre className="text-xs font-mono text-amber-300 leading-relaxed whitespace-pre-wrap select-all">
                {sqlContent}
              </pre>
            </div>

            <div className="p-4 bg-white border-t border-gray-100 flex justify-between items-center">
              <p className="text-[10px] text-gray-400">
                Tip: Standard columns automatically map to Supabase!
              </p>
              <div className="flex space-x-2">
                <button
                  id="copy-sql-btn"
                  onClick={copySqlToClipboard}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase rounded-lg transition-all cursor-pointer"
                >
                  Copy Script
                </button>
                <button
                  id="close-sql-dialog-footer"
                  onClick={() => setShowSqlDialog(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-gray-700 text-xs font-bold uppercase rounded-lg transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
