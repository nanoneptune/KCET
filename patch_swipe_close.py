import re

with open('src/components/StudentDashboard.tsx', 'r') as f:
    content = f.read()

old_close = """                {/* Bottom Swipe Actions */}
                {swipeIndex < processedColleges.length && ("""

new_close = """                {/* Bottom Swipe Actions */}
                </AnimatePresence>
                {swipeIndex < processedColleges.length && ("""

content = content.replace(old_close, new_close)

with open('src/components/StudentDashboard.tsx', 'w') as f:
    f.write(content)
