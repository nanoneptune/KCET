const fs = require('fs');
let content = fs.readFileSync('tsconfig.json', 'utf-8');
content = content.replace(/"allowJs": true,/g, '"allowJs": true,\n    "esModuleInterop": true,');
fs.writeFileSync('tsconfig.json', content);
