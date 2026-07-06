const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

content = content.replace(/localDb\.colleges/g, "store.colleges");
content = content.replace(/saveDb\(\);/g, "writeDataStore(store);");
content = content.replace(/existingColleges = store\.colleges/, "store = readDataStore();\n    const existingColleges = store.colleges");
fs.writeFileSync('server.ts', content);
