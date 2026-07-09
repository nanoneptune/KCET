import re

with open('src/components/StudentDashboard.tsx', 'r') as f:
    content = f.read()

motion_card = """                    <motion.div
                      layout
                      className="bg-white w-full rounded-[2.5rem] shadow-xl overflow-hidden text-slate-900 border border-slate-100"
                    >"""

new_motion_card = """                    <motion.div
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
"""

content = content.replace(motion_card, new_motion_card)

with open('src/components/StudentDashboard.tsx', 'w') as f:
    f.write(content)
