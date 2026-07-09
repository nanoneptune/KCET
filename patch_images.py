import re

with open('src/components/StudentDashboard.tsx', 'r') as f:
    content = f.read()

# Replace imgUrl logic
old_img_logic = """                  const imgUrl = currentCollegeHasOfficialImages ? currentCollegeImages[activeImageIndex] : "https://res.cloudinary.com/dkvdbgijn/image/upload/v1783318134/education_tvpscl.png";"""

new_img_logic = """                  const hasImages = currentCollegeHasOfficialImages && currentCollegeImages.length > 0;
                  const imgUrl = hasImages ? currentCollegeImages[activeImageIndex] : "";"""

content = content.replace(old_img_logic, new_img_logic)

old_img_jsx = """                      {/* Image Top Half */}
                      <div className="h-72 w-full relative">
                        <img 
                          src={imgUrl}
                          className="w-full h-full object-cover absolute inset-0"
                          alt={college.name}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />"""

new_img_jsx = """                      {/* Image Top Half */}
                      <div className="h-72 w-full relative bg-slate-900 flex items-center justify-center">
                        {hasImages ? (
                          <img 
                            src={imgUrl}
                            className="w-full h-full object-cover absolute inset-0"
                            alt={college.name}
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-rose-400 to-rose-600 flex flex-col items-center justify-center text-white/50">
                            <School className="w-24 h-24 mb-4 opacity-50" />
                            <span className="font-bold tracking-widest uppercase text-xs">Campus View</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />"""

content = content.replace(old_img_jsx, new_img_jsx)

with open('src/components/StudentDashboard.tsx', 'w') as f:
    f.write(content)
