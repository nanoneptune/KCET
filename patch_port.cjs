const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');
content = content.replace(
  /const PORT = process\.env\.PORT \|\| 3000;/g,
  `const PORT = parseInt(process.env.PORT || "3000", 10);`
);
fs.writeFileSync('server.ts', content);
