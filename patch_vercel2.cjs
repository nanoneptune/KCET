const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');
content = content.replace(
  /if \(process\.env\.VERCEL\) return;\n  const distPath = path\.join\(process\.cwd\(\), "dist"\);/,
  `const distPath = path.join(process.cwd(), "dist");`
);
fs.writeFileSync('server.ts', content);
