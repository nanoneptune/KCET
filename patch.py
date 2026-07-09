import re

with open('src/components/StudentDashboard.tsx', 'r') as f:
    content = f.read()

with open('kama-step3-wrapper.txt', 'r') as f:
    wrapper_start = f.read()

with open('kama-step3.txt', 'r') as f:
    # remove the first 7 lines (the <motion.div...>)
    step3_content = '\n'.join(f.read().split('\n')[7:])

replacement = wrapper_start + step3_content + '\n        )}\n'

# Find Step 3
# Step 3 starts at `        {step === 3 && (` and ends right before `        {step === 4 && (`

pattern = re.compile(r'        \{step === 3 && \(\n          <motion\.div.*?        \{step === 4 && \(', re.DOTALL)

def repl(m):
    return replacement + '        {step === 4 && ('

new_content = pattern.sub(repl, content)

with open('src/components/StudentDashboard.tsx', 'w') as f:
    f.write(new_content)
