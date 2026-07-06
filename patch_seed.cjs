const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');
content = content.replace(
  /seedDatabase\(\);/g,
  `if (!process.env.VERCEL) {\n  seedDatabase();\n}`
);
fs.writeFileSync('server.ts', content);
