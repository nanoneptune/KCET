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

  // In-memory OTP storage (for production, use Redis or a database)
  const otpStore = new Map<string, { otp: string, expires: number, firstName: string, lastName: string }>();

  // API Route: Send OTP
  app.post("/api/auth/send-otp", async (req, res) => {
    const { email, firstName, lastName } = req.body;
    
    if (!email || !firstName || !lastName) {
      return res.status(400).json({ error: "Email and name details are required." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(email.toLowerCase(), { otp, expires, firstName, lastName });

    // NOTE: In a production environment, you would use nodemailer or a service like Resend here.
    // For now, we return it in the response so the user can actually log in during testing.
    console.log(`OTP for ${email}: ${otp}`);
    
    res.json({ 
      success: true, 
      message: "OTP generated successfully",
      otp: otp // Returning OTP for development/testing ease
    });
  });

  // API Route: Verify OTP
  app.post("/api/auth/verify-otp", async (req, res) => {
    const { email, otp } = req.body;
    const normalizedEmail = email.toLowerCase();
    const record = otpStore.get(normalizedEmail);

    if (!record) {
      return res.status(400).json({ error: "No OTP requested for this email." });
    }

    if (Date.now() > record.expires) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({ error: "OTP has expired. Please request a new one." });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ error: "Invalid verification code." });
    }

    // Success! Prepare user profile
    const user = {
      email: normalizedEmail,
      name: `${record.firstName} ${record.lastName}`,
      favorites: [],
      is_admin: false
    };

    // Clean up
    otpStore.delete(normalizedEmail);

    res.json({ success: true, user });
  });

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
