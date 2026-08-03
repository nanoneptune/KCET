import express from "express";
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

// In-memory student profiles backup store
const inMemoryStudents: any[] = [];

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
      firstName: data.first_name || "",
      lastName: data.last_name || "",
      name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
      favorites: [],
      courses: [],
      isVerified: true,
      is_admin: false
    };

    // Upsert into Supabase profiles table
    try {
      await supabase.from('profiles').upsert({
        email: normalizedEmail,
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        is_verified: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'email' });
    } catch (dbErr) {
      console.warn("Supabase profile save warning:", dbErr);
    }

    // Upsert into inMemoryStudents
    const idx = inMemoryStudents.findIndex(s => s.email.toLowerCase() === normalizedEmail);
    if (idx >= 0) {
      inMemoryStudents[idx] = { ...inMemoryStudents[idx], ...user };
    } else {
      inMemoryStudents.push(user);
    }

    await supabase.from('auth_otps').delete().eq('email', normalizedEmail);
    res.json({ success: true, user });
  } catch (error: any) {
    console.error("Verification Error:", error);
    res.status(500).json({ error: "An error occurred during verification." });
  }
});

// API Route: Update Student Profile
app.post("/api/auth/update-profile", async (req, res) => {
  const { email, firstName, lastName, cetRank, dcetScore, examScore, courses, favorites } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required to update profile." });
  }

  const normalizedEmail = email.toLowerCase();
  
  // Exclude guest logins from profile updates
  if (normalizedEmail.startsWith("guest_") || normalizedEmail.endsWith("@predictor.local")) {
    return res.json({ success: true, user: req.body });
  }

  try {
    const profileRecord = {
      email: normalizedEmail,
      first_name: firstName || "",
      last_name: lastName || "",
      cet_rank: cetRank ? Number(cetRank) : null,
      dcet_score: dcetScore ? Number(dcetScore) : null,
      exam_score: examScore ? Number(examScore) : null,
      courses: courses || [],
      favorites: favorites || [],
      is_verified: true,
      updated_at: new Date().toISOString()
    };

    // Save in Supabase
    const { data, error } = await supabase
      .from('profiles')
      .upsert(profileRecord, { onConflict: 'email' })
      .select()
      .single();

    const resultUser = {
      email: normalizedEmail,
      firstName: data?.first_name || firstName || "",
      lastName: data?.last_name || lastName || "",
      cetRank: data?.cet_rank ?? (cetRank ? Number(cetRank) : undefined),
      dcetScore: data?.dcet_score ?? (dcetScore ? Number(dcetScore) : undefined),
      examScore: data?.exam_score ?? (examScore ? Number(examScore) : undefined),
      courses: data?.courses || courses || [],
      favorites: data?.favorites || favorites || [],
      isVerified: true
    };

    // Update in-memory cache as well
    const memIdx = inMemoryStudents.findIndex(s => s.email.toLowerCase() === normalizedEmail);
    if (memIdx >= 0) {
      inMemoryStudents[memIdx] = { ...inMemoryStudents[memIdx], ...resultUser };
    } else {
      inMemoryStudents.push(resultUser);
    }

    res.json({ success: true, user: resultUser });
  } catch (err: any) {
    console.warn("Backend profile sync notice (saved to memory cache):", err.message);

    const fallbackUser = {
      email: normalizedEmail,
      firstName: firstName || "",
      lastName: lastName || "",
      cetRank: cetRank ? Number(cetRank) : undefined,
      dcetScore: dcetScore ? Number(dcetScore) : undefined,
      examScore: examScore ? Number(examScore) : undefined,
      courses: courses || [],
      favorites: favorites || [],
      isVerified: true
    };

    const memIdx = inMemoryStudents.findIndex(s => s.email.toLowerCase() === normalizedEmail);
    if (memIdx >= 0) {
      inMemoryStudents[memIdx] = { ...inMemoryStudents[memIdx], ...fallbackUser };
    } else {
      inMemoryStudents.push(fallbackUser);
    }

    res.json({ success: true, user: fallbackUser });
  }
});

// API Route: Get Registered Students (For Admin Portal)
app.get("/api/admin/students", async (req, res) => {
  try {
    const { data, error } = await supabase.from('profiles').select('*');
    let loaded: any[] = [];
    if (!error && data && data.length > 0) {
      loaded = data.map((p: any) => ({
        email: p.email,
        firstName: p.first_name || p.firstName || "Student",
        lastName: p.last_name || p.lastName || "",
        cetRank: p.cet_rank || p.cetRank,
        dcetScore: p.dcet_score || p.dcetScore,
        courses: p.courses || [],
        favorites: p.favorites || [],
        isVerified: p.is_verified ?? true
      }));
    }

    // Merge with inMemoryStudents
    inMemoryStudents.forEach(m => {
      if (!loaded.some(l => l.email.toLowerCase() === m.email.toLowerCase())) {
        loaded.push(m);
      }
    });

    // Filter ONLY genuine email students (exclude guest_)
    const emailOnly = loaded.filter(s => {
      if (!s.email) return false;
      const e = s.email.toLowerCase();
      return !e.startsWith("guest_") && !e.endsWith("@predictor.local");
    });

    res.json({ students: emailOnly });
  } catch (err: any) {
    console.error("Get admin students error:", err);
    res.json({ students: inMemoryStudents.filter(s => s.email && !s.email.startsWith("guest_")) });
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

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });
    res.json({ prediction: response.text || "" });
  } catch (error: any) {
    console.error("AI Error:", error);
    res.status(500).json({ error: "Failed to generate prediction." });
  }
});

// API Route: AI College Details & Campus Research (Powered strictly by Groq API)
app.post("/api/ai/college-info", async (req, res) => {
  const groqApiKey = process.env.GROQ_API_KEY || "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";

  if (!groqApiKey) {
    return res.status(500).json({ error: "Groq API key is not configured." });
  }

  try {
    const { name, place } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "College Name is required." });
    }

    const collegeName = name.trim();
    const city = place ? place.trim() : "";

    const prompt = `You are an expert college research assistant and campus culture specialist for Indian engineering institutions.
Generate a detailed, fascinating, and well-structured overview for the college: "${collegeName}" ${city ? `located in ${city}` : ''}.

STRICT CONTENT RULES (MUST MANDATORILY FOLLOW):
1. DO NOT INCLUDE ANY INFORMATION ABOUT FEES, TUITION COSTS, CUTOFF RANKS, CET RANKS, DCET RANKS, OR ADMISSION MARKS. Fees and ranks are strictly forbidden from this description.
2. Focus purely on:
   - Campus Infrastructure & Modern Facilities (labs, library, sports grounds, hostels, Wi-Fi campus)
   - Academic Environment & Faculty Culture
   - Student Life, Clubs, Technical & Cultural Fests
   - Location Highlights & Connectivity in ${city || 'the area'}
   - Notable Achievements, Innovation Hubs & Campus Vibe

REQUIRED MARKDOWN FORMAT:
Structure the entire output using rich Markdown:
- Main title (# Title)
- Subheaders (## Section, ### Sub-section)
- Bold key terms (**key text**)
- Clean bullet lists (- point)
- Readable paragraph spacing.

Keep the text engaging, professional, and visually appealing.`;

    // Make request directly to Groq API
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are an expert Indian college and campus guide assistant."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.6,
        max_tokens: 1500
      })
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error("Groq API error response:", errorText);

      // Attempt fallback model if 70b has issues
      const fallbackResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.6,
          max_tokens: 1500
        })
      });

      if (!fallbackResponse.ok) {
        throw new Error(`Groq API failed: ${groqResponse.status} ${groqResponse.statusText}`);
      }

      const fallbackData = await fallbackResponse.json();
      const markdownText = fallbackData.choices?.[0]?.message?.content || `# ${collegeName}\n\nCampus details currently unavailable.`;
      return res.json({ details: markdownText });
    }

    const groqData = await groqResponse.json();
    const markdownText = groqData.choices?.[0]?.message?.content || `# ${collegeName}\n\nCampus details currently unavailable.`;

    res.json({ details: markdownText });
  } catch (error: any) {
    console.error("Groq AI College Info Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI college information using Groq." });
  }
});

export default app;
