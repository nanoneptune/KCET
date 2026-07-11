import path from "path";
import express from "express";
import app from "./src/server/app";

const PORT = 3000;

async function startServer() {
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
    
    // Cloud Run / Custom VPS entry point
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Production server running on port ${PORT}`);
    });
  } else {
    // Development server with Vite middleware
    try {
      // Dynamic import to avoid loading vite in production
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Development server running on http://localhost:${PORT}`);
      });
    } catch (e) {
      console.error("Failed to start development server:", e);
    }
  }
}

startServer();

export default app;
