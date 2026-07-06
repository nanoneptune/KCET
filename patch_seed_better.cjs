const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');
content = content.replace(
  /if \(\!process\.env\.VERCEL\) \{\n  seedDatabase\(\);\n\}/g,
  `if (process.env.NODE_ENV !== "production") {\n  seedDatabase();\n}`
);
fs.writeFileSync('server.ts', content);
