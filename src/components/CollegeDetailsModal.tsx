import React, { useState } from "react";
import { X, MapPin, Phone, Globe, DollarSign, Award, School, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { College } from "../types";

interface CollegeDetailsModalProps {
  college: College;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}

export default function CollegeDetailsModal({
  college,
  onClose,
  isFavorite,
  onToggleFavorite
}: CollegeDetailsModalProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const handlePrevImage = () => {
    if (college.images && college.images.length > 0) {
      setActiveImageIndex((prev) => (prev === 0 ? college.images.length - 1 : prev - 1));
    }
  };

  const handleNextImage = () => {
    if (college.images && college.images.length > 0) {
      setActiveImageIndex((prev) => (prev === college.images.length - 1 ? 0 : prev + 1));
    }
  };

  const mapsQuery = `${college.name} ${college.locationAddress || college.place}`;
  const embedMapsUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapsQuery)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header bar */}
        <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-center p-1.5 shrink-0 shadow-xs overflow-hidden">
              <img src="https://res.cloudinary.com/dkvdbgijn/image/upload/v1783318134/education_tvpscl.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-base sm:text-lg text-gray-900 leading-tight">
                {college.name}
              </h2>
              <p className="text-xs text-gray-400 flex items-center mt-0.5">
                <MapPin className="h-3 w-3 mr-0.5 text-rose-500 shrink-0" />
                <span>{college.locationAddress || college.place}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Heart symbol */}
            <button
              id="details-favorite-toggle-btn"
              onClick={() => onToggleFavorite(college.id)}
              className="p-2.5 rounded-xl border border-gray-100 hover:bg-rose-50 text-gray-400 hover:text-rose-500 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title={isFavorite ? "Remove from Favorites" : "Mark as Favorite"}
            >
              <Heart className={`h-5 w-5 ${isFavorite ? "fill-rose-500 text-rose-500" : ""}`} />
            </button>

            <button
              id="details-close-btn"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Box */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          
          {/* Main Visual Carousel / Gallery */}
          {college.images && college.images.length > 0 && (
            <div className="space-y-3">
              <div className="h-64 sm:h-80 w-full relative rounded-2xl overflow-hidden bg-slate-100 group">
                <img
                  src={college.images[activeImageIndex]}
                  alt={`${college.name} Campus ${activeImageIndex + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                
                {/* Carousel overlays */}
                <button
                  id="details-carousel-prev"
                  onClick={handlePrevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 shadow-md text-gray-700 hover:bg-white active:scale-90 transition-all cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  id="details-carousel-next"
                  onClick={handleNextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 shadow-md text-gray-700 hover:bg-white active:scale-90 transition-all cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-1 rounded-md font-mono">
                  {activeImageIndex + 1} / {college.images.length}
                </div>
              </div>

              {/* Thumbnails indicator bar */}
              <div className="flex gap-2 justify-center">
                {college.images.map((img, idx) => (
                  <button
                    key={idx}
                    id={`details-thumbnail-${idx}`}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`h-11 w-16 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                      activeImageIndex === idx ? "border-blue-600 scale-105" : "border-transparent opacity-60"
                    }`}
                  >
                    <img src={img} alt="Thumbnail" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Academic & Placement metrics summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Highest Placement Package
              </span>
              <span className="text-sm sm:text-base font-black text-gray-800 flex items-center justify-center">
                <Award className="h-4 w-4 text-slate-500 mr-1" />
                <span>{college.courses && college.courses.length > 0 ? Math.max(...college.courses.map(r => r.highestPackage)) : college.highestPackage} LPA</span>
              </span>
            </div>

            <div className="bg-blue-50/40 rounded-2xl p-4 text-center border border-blue-100/30">
              <span className="block text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">
                Average Placement Package
              </span>
              <span className="text-sm sm:text-base font-black text-blue-900 flex items-center justify-center">
                <Award className="h-4 w-4 text-blue-500 mr-1 animate-pulse" />
                <span>{(college.courses && college.courses.length > 0 ? (college.courses.reduce((acc, r) => acc + r.averagePackage, 0) / college.courses.length).toFixed(1) : college.averagePackage)} LPA</span>
              </span>
            </div>
          </div>

          {/* Detailed Course & Cutoffs Specifications Table */}
          <div className="space-y-4">
            <h3 className="font-display font-bold text-gray-900 text-sm uppercase tracking-wider border-b border-gray-100 pb-1.5">
              Available Courses, Fees Structure & Cutoff Records
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-gray-100">
              <table className="min-w-full divide-y divide-gray-100 text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">Branch/Course</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">College Fees</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">CET Cutoff</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">Prev Cutoff</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">Avg Placement</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">Max Placement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {college.courses?.map((course, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-gray-900">{course.courseName}</td>
                      <td className="px-4 py-3 font-medium text-emerald-700">₹{course.fees?.toLocaleString() || "0"}</td>
                      <td className="px-4 py-3 font-mono font-medium text-blue-600">{course.cutoffRank}{course.categoryCutoffs && Object.keys(course.categoryCutoffs).length > 0 ? <div className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">{Object.entries(course.categoryCutoffs).map(([k,v]) => `${k}:${v}`).join(", ")}</div> : null}</td>
                      <td className="px-4 py-3 font-mono text-gray-500">{course.cutoffRankPreviousYear || "N/A"}</td>
                      <td className="px-4 py-3 font-mono font-medium text-gray-800">{course.averagePackage} LPA</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">{course.highestPackage} LPA</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-normal whitespace-pre-wrap pt-2">
              {college.details || "No additional description details have been entered for this college."}
            </p>
          </div>

          {/* Map Section */}
          <div className="space-y-3">
            <h3 className="font-display font-bold text-gray-900 text-sm uppercase tracking-wider border-b border-gray-100 pb-1.5">
              Huge Interactive Location Map
            </h3>
            <div className="w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-gray-100 shadow-xs relative bg-slate-50">
              <iframe
                id="college-google-map"
                src={embedMapsUrl}
                className="absolute inset-0 w-full h-full border-0"
                allowFullScreen
                loading="lazy"
                title={`${college.name} Location Map`}
              ></iframe>
            </div>
          </div>

        </div>

        {/* Action Redirection Buttons */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-2 sticky bottom-0 z-20">
          {college.contactNumber && (
            <a
              id="college-call-btn"
              href={`tel:${college.contactNumber}`}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-5 py-2.5 bg-white hover:bg-gray-100 border border-gray-200 text-gray-800 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              <Phone className="h-4 w-4 text-blue-600" />
              <span>Call: {college.contactNumber}</span>
            </a>
          )}

          {college.website && (
            <a
              id="college-website-btn"
              href={college.website.startsWith("http") ? college.website : `https://${college.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md shadow-blue-100 hover:shadow-lg transition-all cursor-pointer"
            >
              <Globe className="h-4 w-4" />
              <span>Visit Official Website</span>
            </a>
          )}
        </div>

      </div>
    </div>
  );
}
