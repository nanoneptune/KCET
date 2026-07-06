const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

const getStudentsEndpoint = `
app.get("/api/admin/students", async (req, res) => {
  const adminCode = req.query.adminCode;
  if (adminCode !== "831067") {
    return res.status(403).json({ error: "Invalid administrative access code." });
  }
  const store = readLocalStore();
  res.json({ success: true, data: store.users || [] });
});
`;

content = content.replace('app.post("/api/admin/smart-upload",', getStudentsEndpoint + '\n\napp.post("/api/admin/smart-upload",');
fs.writeFileSync('server.ts', content);
