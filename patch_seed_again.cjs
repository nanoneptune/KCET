const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');
content = content.replace(
  /if \(process\.env\.NODE_ENV !== "production"\) \{\n  seedDatabase\(\);\n\}/g,
  `seedDatabase();`
);
fs.writeFileSync('server.ts', content);
