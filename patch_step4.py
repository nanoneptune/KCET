import re

with open('src/components/StudentDashboard.tsx', 'r') as f:
    content = f.read()

old_step4 = """            {/* STEP 04: STRATEGIC OPTIONS */}
            <div className="bg-white/95 border border-slate-100 rounded-[2.5rem] p-8 text-slate-900 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Strategic Option Entry</h2>
                  <p className="text-xs text-rose-400 mt-1 uppercase tracking-widest font-black">Recommended Sequence for Counseling</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-100 text-slate-600 rounded-xl transition-all cursor-pointer">
                    <Share2 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={async () => {"""

new_step4 = """            {/* STEP 04: STRATEGIC OPTIONS */}
            <div className="backdrop-blur-2xl bg-white/60 border border-white/60 rounded-[2.5rem] p-8 text-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
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
                    onClick={async () => {"""

content = content.replace(old_step4, new_step4)

old_list = """                    <div key={college.id} className="flex items-center space-x-4 group">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-100 flex items-center justify-center text-xs font-black text-slate-600 group-hover:border-rose-400 group-hover:text-rose-400 transition-all shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 bg-white border border-slate-100 rounded-2xl p-4 hover:border-rose-500/50 transition-all">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-sm text-slate-900 truncate">{college.name}</h4>
                            <p className="text-[10px] text-rose-400 uppercase tracking-widest font-black mt-0.5 truncate">{college.bestMatchedCourse.courseName}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${getProbabilityLabel(college.probability).bg} ${getProbabilityLabel(college.probability).border} ${getProbabilityLabel(college.probability).color}`}>
                              {getProbabilityLabel(college.probability).label}
                            </span>
                            <div className="text-xs font-black text-slate-900 mt-1">{college.probability}%</div>
                          </div>
                        </div>
                      </div>
                    </div>"""

new_list = """                    <div key={college.id} className="flex items-stretch space-x-4 group relative z-10">
                      {/* Timeline Line */}
                      {idx !== Math.min(strategicOptions.length, 10) - 1 && (
                        <div className="absolute left-4 top-10 bottom-[-16px] w-[2px] bg-gradient-to-b from-rose-200 to-transparent z-0" />
                      )}
                      
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 shadow-md shadow-rose-500/20 flex items-center justify-center text-xs font-black text-white group-hover:scale-110 transition-transform shrink-0 relative z-10 border-2 border-white">
                        {idx + 1}
                      </div>
                      
                      <div className="flex-1 bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm rounded-2xl p-4 hover:border-rose-300 hover:shadow-md hover:bg-white transition-all cursor-pointer relative overflow-hidden group-hover:-translate-y-0.5">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-rose-50 to-transparent rounded-tr-2xl pointer-events-none" />
                        
                        <div className="flex justify-between items-start gap-2 relative z-10">
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-sm text-slate-900 truncate tracking-tight">{college.name}</h4>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md uppercase tracking-wider font-bold border border-rose-100">{college.bestMatchedCourse.courseName}</span>
                              <span className="text-[10px] text-slate-400 font-medium truncate flex items-center"><MapPin className="w-3 h-3 mr-0.5" />{college.place}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0 flex flex-col items-end">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${getProbabilityLabel(college.probability).bg} ${getProbabilityLabel(college.probability).border} ${getProbabilityLabel(college.probability).color}`}>
                              {getProbabilityLabel(college.probability).label}
                            </span>
                            <div className="text-xs font-black text-slate-900 mt-1.5 tabular-nums">{college.probability}%</div>
                          </div>
                        </div>
                      </div>
                    </div>"""

content = content.replace(old_list, new_list)

with open('src/components/StudentDashboard.tsx', 'w') as f:
    f.write(content)
