const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');
content = content.replace(
  /const distPath = path\.join\(process\.cwd\(\), "dist"\);/,
  `if (process.env.VERCEL) return;\n  const distPath = path.join(process.cwd(), "dist");`
);
fs.writeFileSync('server.ts', content);
