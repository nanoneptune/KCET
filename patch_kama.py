import re

with open('src/components/StudentDashboard.tsx', 'r') as f:
    content = f.read()

# Replace the text inside "Header Profile Thumbnails (Matches)"
pattern = re.compile(r'              \{/\* Header Profile Thumbnails \(Matches\) \*/\}.*?              \{/\* CARD CONTAINER \*/\}', re.DOTALL)

replacement = """              {/* Header Matches */}
              <div className="px-2 mb-6 text-center">
                <h3 className="text-white font-black text-2xl mb-2 tracking-tight">Your Matches</h3>
                <p className="text-white/90 text-sm font-bold">{processedColleges.length} colleges available</p>
              </div>

              {/* CARD CONTAINER */}"""

new_content = pattern.sub(replacement, content)

with open('src/components/StudentDashboard.tsx', 'w') as f:
    f.write(new_content)
