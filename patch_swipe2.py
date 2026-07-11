import re

with open('src/components/StudentDashboard.tsx', 'r') as f:
    content = f.read()

old_swipe_body = """                {swipeIndex < processedColleges.length ? (() => {
                  const college = processedColleges[swipeIndex];
                  const probInfo = getProbabilityLabel(college.probability);
                  const isFav = (currentUser.favorites || []).includes(college.id);
                  const hasImages = currentCollegeHasOfficialImages && currentCollegeImages.length > 0;
                  const imgUrl = hasImages ? currentCollegeImages[activeImageIndex] : "";

                  return (
                    <motion.div
                      layout
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      onDragEnd={(e, { offset, velocity }) => {
                        if (offset.x > 100) {
                          handleSwipeRight(college.id);
                        } else if (offset.x < -100) {
                          handleSwipeLeft();
                        }
                      }}
                      className="bg-white w-full rounded-[2.5rem] shadow-xl overflow-hidden text-slate-900 border border-slate-100 relative"
                    >"""

new_swipe_body = """                <AnimatePresence mode="popLayout">
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
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      onDragEnd={(e, { offset, velocity }) => {
                        if (offset.x > 100) {
                          handleSwipeRight(college.id);
                        } else if (offset.x < -100) {
                          handleSwipeLeft();
                        }
                      }}
                      className="bg-white w-full rounded-[2.5rem] shadow-xl overflow-hidden text-slate-900 border border-slate-100 relative"
                    >"""

content = content.replace(old_swipe_body, new_swipe_body)

old_card_details = """                      {/* Card Content Details */}
                      <div className="p-6">
                        <p className="text-sm font-semibold text-slate-700 leading-snug mb-5">
                          {college.details || `Top college offering ${college.bestMatchedCourse?.courseName || "various courses"} for your rank.`}
                        </p>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-2 mb-6">
                          <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1">
                            <span>🏆</span>
                            <span>{college.rating} Rating</span>
                          </span>
                          <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1">
                            <span>📚</span>
                            <span>{college.bestMatchedCourse?.courseName || "General"}</span>
                          </span>
                          <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1">
                            <span>🎯</span>
                            <span>Cutoff: #{college.bestMatchedCourse?.cutoffRank?.toLocaleString() || "N/A"}</span>
                          </span>
                          <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1">
                            <span>📊</span>
                            <span>{probInfo.label}</span>
                          </span>
                        </div>"""

new_card_details = """                      {/* Card Content Details */}
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
                        </div>"""

content = content.replace(old_card_details, new_card_details)

with open('src/components/StudentDashboard.tsx', 'w') as f:
    f.write(content)
