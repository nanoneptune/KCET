import React, { useState, useEffect } from "react";
import { School, Search, Trash2, Edit3, Loader2, Save, MapPin, Phone, Globe, PlusCircle, Users, LayoutDashboard, Upload, Image as ImageIcon } from "lucide-react";
import { College, StudentProfile, CollegeCourse } from "../types";
import { supabase } from "../lib/supabase";

interface AdminPortalProps {
  colleges: College[];
  onAddCollege: (college: College, isEditing?: boolean) => Promise<void>;
  onDeleteCollege: (id: string) => Promise<void>;
}

export default function AdminPortal({
  colleges,
  onAddCollege,
  onDeleteCollege
}: AdminPortalProps) {
  // Form states
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [details, setDetails] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [website, setWebsite] = useState("");
  
  // 5 Editable image links
  const [image1, setImage1] = useState("");
  const [image2, setImage2] = useState("");
  const [image3, setImage3] = useState("");
  const [image4, setImage4] = useState("");
  const [image5, setImage5] = useState("");

  // Courses List state for multiple courses per college
  const [coursesList, setCoursesList] = useState<CollegeCourse[]>([]);

  // Course sub-form inputs
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseFees, setNewCourseFees] = useState("");
  const [newCourseAvgPkg, setNewCourseAvgPkg] = useState("");
  const [newCourseHiPkg, setNewCourseHiPkg] = useState("");
  const [newRound, setNewRound] = useState("1");
  
  // Three categories as requested
  const [cat1Name, setCat1Name] = useState("General");
  const [cat1Cutoff, setCat1Cutoff] = useState("");
  const [cat2Name, setCat2Name] = useState("OBC");
  const [cat2Cutoff, setCat2Cutoff] = useState("");
  const [cat3Name, setCat3Name] = useState("SC/ST");
  const [cat3Cutoff, setCat3Cutoff] = useState("");

  // UI Statuses
  const [viewMode, setViewMode] = useState<'colleges'|'students'>('colleges');
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  const CLOUD_NAME = "dkvdbgijn";
  const UPLOAD_PRESET = "college-predict";

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingIdx(idx);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.secure_url) {
        const setters = [setImage1, setImage2, setImage3, setImage4, setImage5];
        setters[idx](data.secure_url);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setErrorMsg("Failed to upload image.");
    } finally {
      setUploadingIdx(null);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      setStudents(data || []);
    } catch (err: any) {
      console.error("Error fetching students:", err);
    }
  };

  const resetForm = () => {
    setId("");
    setName("");
    setPlace("");
    setLocationAddress("");
    setDetails("");
    setContactNumber("");
    setWebsite("");
    setImage1("");
    setImage2("");
    setImage3("");
    setImage4("");
    setImage5("");
    setCoursesList([]);
    setNewCourseName("");
    setNewCourseFees("");
    setNewCourseAvgPkg("");
    setNewCourseHiPkg("");
    setNewRound("1");
    setCat1Cutoff("");
    setCat2Cutoff("");
    setCat3Cutoff("");
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
    setImage1(college.images?.[0] || "");
    setImage2(college.images?.[1] || "");
    setImage3(college.images?.[2] || "");
    setImage4(college.images?.[3] || "");
    setImage5(college.images?.[4] || "");
    setCoursesList(college.courses || []);
    setIsEditing(true);
    setErrorMsg("");
    setSuccessMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAddCourseToList = () => {
    if (!newCourseName.trim()) {
      setErrorMsg("Course Name is required to add a branch.");
      return;
    }
    if (!cat1Cutoff || !cat2Cutoff || !cat3Cutoff) {
      setErrorMsg("Please provide cutoff values for all three categories.");
      return;
    }

    const cObj: CollegeCourse = {
      courseName: newCourseName.trim(),
      fees: Number(newCourseFees) || 0,
      averagePackage: Number(newCourseAvgPkg) || 0,
      highestPackage: Number(newCourseHiPkg) || 0,
      round: Number(newRound),
      cutoffRank: Number(cat1Cutoff), // Using first category as default cutoff for listings
      categories: [
        { name: cat1Name, cutoff: Number(cat1Cutoff) },
        { name: cat2Name, cutoff: Number(cat2Cutoff) },
        { name: cat3Name, cutoff: Number(cat3Cutoff) }
      ]
    };
    setCoursesList([...coursesList, cObj]);
    setNewCourseName("");
    setNewCourseFees("");
    setNewCourseAvgPkg("");
    setNewCourseHiPkg("");
    setCat1Cutoff("");
    setCat2Cutoff("");
    setCat3Cutoff("");
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
      setErrorMsg("Please add at least one course/branch details.");
      return;
    }

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const activeImages = [image1, image2, image3, image4, image5].map(s => s.trim()).filter(Boolean);
      
      const collegeObj: College = {
        id: id || "clg_" + Date.now(),
        name: name.trim(),
        place: place.trim(),
        locationAddress: locationAddress.trim() || `${name.trim()}, ${place.trim()}`,
        averagePackage: coursesList.reduce((acc, c) => acc + c.averagePackage, 0) / coursesList.length,
        highestPackage: Math.max(...coursesList.map(c => c.highestPackage)),
        course: coursesList[0]?.courseName || "General",
        fees: Math.max(...coursesList.map(c => c.fees)),
        details: details.trim(),
        contactNumber: contactNumber.trim(),
        website: website.trim(),
        images: activeImages,
        courses: coursesList
      };

      await onAddCollege(collegeObj, isEditing);
      setSuccessMsg(isEditing ? "College updated successfully!" : "College registered successfully!");
      resetForm();
    } catch (err: any) {
      setErrorMsg("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (collegeId: string) => {
    if (window.confirm("Are you sure you want to delete this college?")) {
      try {
        await onDeleteCollege(collegeId);
        setSuccessMsg("College record deleted.");
      } catch (err: any) {
        setErrorMsg("Failed to delete college.");
      }
    }
  };

  const filteredColleges = colleges.filter(c =>
    c.name.toLowerCase().includes(adminSearch.toLowerCase()) ||
    c.place.toLowerCase().includes(adminSearch.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* View Toggle */}
      <div className="flex bg-white/50 backdrop-blur-xl p-1.5 rounded-2xl border border-white/60 shadow-lg max-w-fit mx-auto">
        <button
          onClick={() => setViewMode('colleges')}
          className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all cursor-pointer ${
            viewMode === 'colleges' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <School className="h-4 w-4" />
          <span>College Registry</span>
        </button>
        <button
          onClick={() => setViewMode('students')}
          className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all cursor-pointer ${
            viewMode === 'students' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Student Database</span>
        </button>
      </div>

      {viewMode === 'colleges' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: FORM */}
          <div className="lg:col-span-5">
            <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-8 shadow-2xl sticky top-24">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-slate-900 flex items-center space-x-3">
                  <div className="bg-rose-500 p-2 rounded-xl shadow-lg">
                    <PlusCircle className="h-6 w-6 text-white" />
                  </div>
                  <span>{isEditing ? "Edit College" : "Add College"}</span>
                </h2>
                {isEditing && (
                  <button onClick={resetForm} className="text-xs font-black text-rose-500 uppercase tracking-widest hover:underline cursor-pointer">
                    Cancel Edit
                  </button>
                )}
              </div>

              {errorMsg && <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-500 text-sm rounded-2xl font-bold">{errorMsg}</div>}
              {successMsg && <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm rounded-2xl font-bold">{successMsg}</div>}

              <form onSubmit={handleSaveCollege} className="space-y-6">
                <div className="space-y-4">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="College Name"
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-hidden transition-all font-medium"
                  />
                  <input
                    type="text"
                    required
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    placeholder="City / Place"
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-hidden transition-all font-medium"
                  />
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="College Details / Description"
                    rows={3}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-hidden transition-all font-medium"
                  />
                </div>

                {/* Courses Manager */}
                <div className="p-6 bg-slate-900 rounded-[2rem] space-y-4 border border-slate-800 shadow-2xl">
                  <h3 className="text-white font-black text-sm uppercase tracking-widest flex items-center space-x-2">
                    <LayoutDashboard className="h-4 w-4 text-rose-500" />
                    <span>Course Branches ({coursesList.length})</span>
                  </h3>
                  
                  {coursesList.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                      {coursesList.map((c, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                          <div className="min-w-0">
                            <span className="block text-white font-bold text-xs truncate">{c.courseName}</span>
                            <span className="block text-[10px] text-slate-400 font-mono">
                              Round {c.round} | Gen: {c.categories[0].cutoff} | {c.categories[1].name}: {c.categories[1].cutoff}
                            </span>
                          </div>
                          <button type="button" onClick={() => handleRemoveCourseFromList(i)} className="text-rose-400 p-1 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                    <input
                      type="text"
                      value={newCourseName}
                      onChange={(e) => setNewCourseName(e.target.value)}
                      placeholder="Course Name"
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs outline-hidden focus:border-rose-500 transition-all"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        value={newCourseFees}
                        onChange={(e) => setNewCourseFees(e.target.value)}
                        placeholder="Fees (INR)"
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs outline-hidden focus:border-rose-500 transition-all"
                      />
                      <select
                        value={newRound}
                        onChange={(e) => setNewRound(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-white text-xs outline-hidden focus:border-rose-500 transition-all"
                      >
                        <option value="1">Round 1</option>
                        <option value="2">Round 2</option>
                        <option value="3">Round 3</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-500 uppercase font-black ml-1">{cat1Name}</span>
                        <input
                          type="number"
                          value={cat1Cutoff}
                          onChange={(e) => setCat1Cutoff(e.target.value)}
                          placeholder="Cutoff"
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs outline-hidden focus:border-rose-500 transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-500 uppercase font-black ml-1">{cat2Name}</span>
                        <input
                          type="number"
                          value={cat2Cutoff}
                          onChange={(e) => setCat2Cutoff(e.target.value)}
                          placeholder="Cutoff"
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs outline-hidden focus:border-rose-500 transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-500 uppercase font-black ml-1">{cat3Name}</span>
                        <input
                          type="number"
                          value={cat3Cutoff}
                          onChange={(e) => setCat3Cutoff(e.target.value)}
                          placeholder="Cutoff"
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs outline-hidden focus:border-rose-500 transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddCourseToList}
                      className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-rose-500/20"
                    >
                      Add Course
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="Contact Number"
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-hidden transition-all text-sm font-medium"
                  />
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="Website URL"
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-hidden transition-all text-sm font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Campus Images (5 URLS or Upload)</span>
                  <div className="grid grid-cols-1 gap-3">
                    {[setImage1, setImage2, setImage3, setImage4, setImage5].map((setter, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={[image1, image2, image3, image4, image5][idx]}
                            onChange={(e) => setter(e.target.value)}
                            placeholder={`Image URL ${idx + 1}`}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-hidden transition-all"
                          />
                          <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                        </div>
                        <label className={`shrink-0 p-3 rounded-2xl border border-slate-100 transition-all cursor-pointer flex items-center justify-center hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500 ${uploadingIdx === idx ? 'bg-slate-50 animate-pulse' : 'bg-white shadow-sm'}`}>
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, idx)}
                            disabled={uploadingIdx !== null}
                          />
                          {uploadingIdx === idx ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white font-black rounded-3xl transition-all flex items-center justify-center space-x-3 cursor-pointer shadow-2xl active:scale-95"
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                  <span>{isEditing ? "Update Registry" : "Finalize Registration"}</span>
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT: LIST */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white/80 backdrop-blur-xl border border-white/60 p-6 rounded-[2.5rem] shadow-xl flex items-center space-x-4">
              <Search className="h-6 w-6 text-rose-500" />
              <input
                type="text"
                placeholder="Search registered colleges..."
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                className="flex-1 bg-transparent border-none focus:ring-0 text-lg font-bold text-slate-900 placeholder:text-slate-300"
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredColleges.map((c) => (
                <div key={c.id} className="group bg-white/80 backdrop-blur-xl border border-white/60 p-6 rounded-[2rem] shadow-lg hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="h-16 w-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-inner overflow-hidden">
                        {c.images?.[0] ? (
                          <img src={c.images[0]} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <School className="h-8 w-8 text-rose-500" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 leading-tight">{c.name}</h3>
                        <div className="flex items-center text-slate-400 text-sm font-bold mt-1">
                          <MapPin className="h-3.5 w-3.5 mr-1" />
                          <span>{c.place}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => handleEditLoad(c)} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all cursor-pointer">
                        <Edit3 className="h-5 w-5" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all cursor-pointer">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredColleges.length === 0 && (
                <div className="text-center py-20 bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-dashed border-slate-200">
                  <p className="text-slate-400 font-black">No matches found in the registry.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Student Database View */
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900 flex items-center space-x-3">
              <Users className="h-6 w-6 text-rose-500" />
              <span>Student Profiles ({students.length})</span>
            </h2>
            <button onClick={fetchStudents} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-rose-500 transition-all cursor-pointer">
              <Edit3 className="h-5 w-5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Student</th>
                  <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Verification</th>
                  <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Rank/Score</th>
                  <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Interests</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {students.map((s, i) => (
                  <tr key={i} className="hover:bg-slate-50/30 transition-all">
                    <td className="px-8 py-6">
                      <span className="block font-black text-slate-900 text-lg">{s.firstName} {s.lastName}</span>
                      <span className="block text-sm text-slate-400 font-medium">{s.email}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        s.isVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                      }`}>
                        {s.isVerified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xl font-mono font-black text-slate-900">
                        {s.cetRank || s.dcetScore || '-'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-wrap gap-1">
                        {s.courses?.map((c, idx) => (
                          <span key={idx} className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-md font-bold">
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
