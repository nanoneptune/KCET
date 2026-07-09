import re

with open('src/components/StudentDashboard.tsx', 'r') as f:
    content = f.read()

# Replace handleSwipeRight
old_swipe_right = """  const handleSwipeRight = (collegeId: string) => {
    if (!(currentUser.favorites || []).includes(collegeId)) {
      handleToggleFavorite(collegeId);
    }
    setSwipeIndex(prev => prev + 1);
  };"""

new_swipe_right = """  const handleSwipeRight = (collegeId: string) => {
    setShowHeartAnimation(true);
    setTimeout(() => {
      setShowHeartAnimation(false);
      if (!(currentUser.favorites || []).includes(collegeId)) {
        handleToggleFavorite(collegeId);
      }
      setSwipeIndex(prev => prev + 1);
    }, 600);
  };"""

content = content.replace(old_swipe_right, new_swipe_right)

with open('src/components/StudentDashboard.tsx', 'w') as f:
    f.write(content)
