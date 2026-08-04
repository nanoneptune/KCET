import React, { useState } from "react";
import { X, MapPin, Phone, Globe, DollarSign, Award, School, Heart, ChevronLeft, ChevronRight, Video, Sparkles, ZoomIn, ZoomOut, RotateCcw, Maximize2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { College } from "../types";
import AutoPlayVideo from "./AutoPlayVideo";

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
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);

  const handlePrevImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (college.images && college.images.length > 0) {
      setActiveImageIndex((prev) => (prev === 0 ? college.images.length - 1 : prev - 1));
      setZoomScale(1);
    }
  };

  const handleNextImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (college.images && college.images.length > 0) {
      setActiveImageIndex((prev) => (prev === college.images.length - 1 ? 0 : prev + 1));
      setZoomScale(1);
    }
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomScale(prev => Math.min(prev + 0.5, 3.5));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomScale(prev => Math.max(prev - 0.5, 1));
  };

  const handleResetZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomScale(1);
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
          
          {/* Video Preview (if videoUrl is present) */}
          {college.videoUrl && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                <Video className="h-3.5 w-3.5 text-rose-500 mr-1" />
                <span>Campus Video Tour (Auto-playing • No Audio)</span>
              </span>
              <div className="h-60 sm:h-72 w-full rounded-2xl overflow-hidden bg-slate-950 relative border border-slate-200 shadow-md">
                <AutoPlayVideo url={college.videoUrl} title={`${college.name} Video Tour`} interactive={true} />
              </div>
            </div>
          )}

          {/* Main Visual Carousel / Gallery */}
          {college.images && college.images.length > 0 && (
            <div className="space-y-3">
              <div 
                className="h-64 sm:h-80 w-full relative rounded-2xl overflow-hidden bg-slate-100 group cursor-pointer"
                onClick={() => {
                  setIsZoomOpen(true);
                  setZoomScale(1);
                }}
              >
                <img
                  src={college.images[activeImageIndex]}
                  alt={`${college.name} Campus ${activeImageIndex + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                />
                
                {/* Click to Zoom Hint Overlay */}
                <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center space-x-1 shadow-md opacity-90 group-hover:opacity-100 transition-opacity">
                  <ZoomIn className="h-3 w-3 text-rose-400" />
                  <span>Click to Zoom Image</span>
                </div>

                {/* Carousel overlays */}
                <button
                  id="details-carousel-prev"
                  onClick={handlePrevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 shadow-md text-gray-700 hover:bg-white active:scale-90 transition-all cursor-pointer z-10"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  id="details-carousel-next"
                  onClick={handleNextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 shadow-md text-gray-700 hover:bg-white active:scale-90 transition-all cursor-pointer z-10"
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

          {/* Full-Screen Campus Photo Lightbox / Zoom Viewer */}
          {isZoomOpen && college.images && college.images.length > 0 && (
            <div className="fixed inset-0 z-[300] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200">
              {/* Top Controls Header */}
              <div className="w-full flex items-center justify-between text-white z-20">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">{college.name}</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Image {activeImageIndex + 1} of {college.images.length} ({Math.round(zoomScale * 100)}% Zoom)</p>
                </div>

                {/* Zoom Action Toolbar */}
                <div className="flex items-center space-x-2 bg-slate-900/80 border border-slate-700/80 px-3 py-1.5 rounded-full shadow-lg">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    className="p-1.5 text-slate-300 hover:text-white transition-all active:scale-90 cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    className="px-2 py-0.5 text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-all cursor-pointer font-mono"
                    title="Reset Zoom"
                  >
                    {Math.round(zoomScale * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    className="p-1.5 text-slate-300 hover:text-white transition-all active:scale-90 cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <div className="w-px h-4 bg-slate-700 mx-1" />
                  <button
                    type="button"
                    onClick={() => setIsZoomOpen(false)}
                    className="p-1.5 text-slate-300 hover:text-rose-400 transition-all active:scale-90 cursor-pointer"
                    title="Close Lightbox"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Center Zoom Viewport */}
              <div className="flex-1 w-full relative flex items-center justify-center overflow-auto p-2 my-2">
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-2 sm:left-4 z-20 p-3 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 border border-slate-700 shadow-xl transition-all active:scale-90 cursor-pointer"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>

                <div className="overflow-auto max-w-full max-h-[75vh] flex items-center justify-center p-4">
                  <img
                    src={college.images[activeImageIndex]}
                    alt={`${college.name} Zoomed View`}
                    style={{ transform: `scale(${zoomScale})`, transition: 'transform 0.2s ease-out' }}
                    className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl origin-center cursor-zoom-in"
                    onClick={handleZoomIn}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-2 sm:right-4 z-20 p-3 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 border border-slate-700 shadow-xl transition-all active:scale-90 cursor-pointer"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>

              {/* Bottom Thumbnail Track */}
              <div className="flex gap-2 overflow-x-auto p-2 max-w-full z-20">
                {college.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveImageIndex(idx);
                      setZoomScale(1);
                    }}
                    className={`h-12 w-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                      activeImageIndex === idx ? "border-rose-500 scale-105" : "border-slate-800 opacity-50"
                    }`}
                  >
                    <img src={img} alt="Thumb" className="w-full h-full object-cover" />
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
                    <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">Fees</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">Round</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">CET Cutoff</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">DCET Cutoff</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">Avg Placement</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">Max Placement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {college.courses?.map((course, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-gray-900">{course.courseName}</td>
                      <td className="px-4 py-3 font-medium text-emerald-700">₹{course.fees?.toLocaleString() || "0"}</td>
                      <td className="px-4 py-3 font-bold text-rose-600">{course.cutoffRound || `R${course.round || 1}`}</td>
                      <td className="px-4 py-3 font-mono font-medium text-blue-600">
                        #{course.cutoffRank || "N/A"}
                        {course.categories && course.categories.length > 0 ? (
                          <div className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">
                            {course.categories.map(c => `${c.name}:${c.cutoff}`).join(", ")}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-indigo-600">
                        {course.dcetCutoffRank ? `#${course.dcetCutoffRank}` : "N/A"}
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-gray-800">{course.averagePackage || 0} LPA</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">{course.highestPackage || 0} LPA</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pt-3 border-t border-slate-100">
              <h3 className="font-display font-black text-gray-900 text-xs uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                <span>Campus Life & Detailed Overview</span>
              </h3>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-slate-700 text-xs sm:text-sm leading-relaxed">
                {college.details ? (
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h1 className="text-base sm:text-lg font-black text-slate-900 mt-2 mb-2 border-b border-slate-200 pb-1">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-sm sm:text-base font-extrabold text-slate-800 mt-3 mb-1.5">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-xs sm:text-sm font-bold text-rose-600 mt-2 mb-1">{children}</h3>,
                      p: ({ children }) => <p className="text-xs sm:text-sm text-slate-600 my-1.5 leading-relaxed">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 text-xs sm:text-sm text-slate-700 pl-2">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 text-xs sm:text-sm text-slate-700 pl-2">{children}</ol>,
                      li: ({ children }) => <li className="text-slate-700 font-medium">{children}</li>,
                      strong: ({ children }) => <strong className="font-extrabold text-slate-900">{children}</strong>,
                    }}
                  >
                    {college.details}
                  </ReactMarkdown>
                ) : (
                  <p className="text-xs sm:text-sm text-gray-500 italic">No additional description details have been entered for this college.</p>
                )}
              </div>
            </div>
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
