import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// Initialize Supabase Admin Client (Server-side)
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
app.use(express.json());

// Lazy-initialized Email Transporter
let transporter: any = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }
  return transporter;
}

// API Route: Send OTP
app.post("/api/auth/send-otp", async (req, res) => {
  const { email, firstName, lastName } = req.body;
  
  if (!email || !firstName || !lastName) {
    return res.status(400).json({ error: "Email and name details are required." });
  }

  if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: "Server Database configuration missing." });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  try {
    const { error: upsertError } = await supabase
      .from('auth_otps')
      .upsert({ 
        email: email.toLowerCase(), 
        otp, 
        expires_at: expiresAt,
        first_name: firstName,
        last_name: lastName
      }, { onConflict: 'email' });

    if (upsertError) {
      console.error("Supabase OTP Error:", upsertError);
      throw new Error(`Database error: ${upsertError.message}. Make sure 'auth_otps' table exists.`);
    }

    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      const mailer = getTransporter();
      await mailer.sendMail({
        from: process.env.SMTP_FROM || `"College Predict" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `${otp} is your verification code`,
        text: `Hi ${firstName}, your verification code for College Predict is ${otp}. It expires in 10 minutes.`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 500px; margin: auto; border: 1px solid #eee; border-radius: 20px;">
            <h2 style="color: #f43f5e; text-align: center;">Verification Code</h2>
            <p>Hi <b>${firstName}</b>,</p>
            <p>Your verification code for College Predict is:</p>
            <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #f43f5e; padding: 30px; text-align: center; background: #fff5f7; border-radius: 15px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="text-align: center; color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="font-size: 11px; color: #999; text-align: center;">College Predict Enrollment Platform</p>
          </div>
        `,
      });
      res.json({ success: true, message: "OTP sent to your email address." });
    } else {
      console.log(`[DEV MODE] OTP for ${email}: ${otp}`);
      res.json({ success: true, message: "OTP generated (Dev Mode)", otp });
    }
  } catch (error: any) {
    console.error("Auth Exception:", error);
    res.status(500).json({ error: error.message || "Failed to process authentication request." });
  }
});

// API Route: Verify OTP
app.post("/api/auth/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  const normalizedEmail = email.toLowerCase();

  try {
    const { data, error } = await supabase
      .from('auth_otps')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    if (error || !data) {
      return res.status(400).json({ error: "No verification request found for this email." });
    }

    if (new Date() > new Date(data.expires_at)) {
      await supabase.from('auth_otps').delete().eq('email', normalizedEmail);
      return res.status(400).json({ error: "Verification code has expired." });
    }

    if (data.otp !== otp) {
      return res.status(400).json({ error: "Invalid verification code." });
    }

    const user = {
      email: normalizedEmail,
      name: `${data.first_name} ${data.last_name}`,
      favorites: [],
      is_admin: false
    };

    await supabase.from('auth_otps').delete().eq('email', normalizedEmail);
    res.json({ success: true, user });
  } catch (error: any) {
    console.error("Verification Error:", error);
    res.status(500).json({ error: "An error occurred during verification." });
  }
});

// Gemini AI Setup
let aiInstance: any = null;
function getAI() {
  if (!aiInstance && process.env.GEMINI_API_KEY) {
    aiInstance = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
  }
  return aiInstance;
}

// API Route: AI Prediction
app.post("/api/ai/predict", async (req, res) => {
  const ai = getAI();
  if (!ai) return res.status(500).json({ error: "Gemini API key not configured." });

  try {
    const { cetRank, category, courses } = req.body;
    const prompt = `You are a career counselor for Karnataka engineering admissions. 
    Student Rank: ${cetRank}, Category: ${category}, Interested Courses: ${courses?.join(", ")}
    Provide a counseling strategy report in Markdown.`;

    const response = await ai.getGenerativeModel({ model: "gemini-1.5-flash" }).generateContent(prompt);
    res.json({ prediction: response.response.text() });
  } catch (error: any) {
    console.error("AI Error:", error);
    res.status(500).json({ error: "Failed to generate prediction." });
  }
});

// Dev server / Static files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
    app.listen(3000, "0.0.0.0", () => console.log("Dev server running on http://localhost:3000"));
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
}

startServer();
export default app;
