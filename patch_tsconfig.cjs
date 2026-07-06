const fs = require('fs');
let content = fs.readFileSync('tsconfig.json', 'utf-8');
content = content.replace(/"allowImportingTsExtensions": true/g, '"allowImportingTsExtensions": false');
fs.writeFileSync('tsconfig.json', content);
