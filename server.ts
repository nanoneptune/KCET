import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini API Initialization
  let ai: any = null;
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // API Route: AI Prediction
  app.post("/api/ai/predict", async (req, res) => {
    if (!ai) {
      return res.status(500).json({ error: "Gemini API key not configured." });
    }

    try {
      const { cetRank, category, courses } = req.body;
      
      const prompt = `You are a career counselor for Karnataka engineering admissions. 
      Student Rank: ${cetRank}
      Category: ${category}
      Interested Courses: ${courses?.join(", ")}
      
      Provide a brief, encouraging counseling strategy report (Markdown format). 
      Include a section for Dream, Target, and Safe colleges based on typical Karnataka trends.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ prediction: response.text });
    } catch (error: any) {
      console.error("AI Prediction Error:", error);
      res.status(500).json({ error: "Failed to generate prediction." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
