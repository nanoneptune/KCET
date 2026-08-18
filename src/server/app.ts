import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { db, initDb } from "./db.js";

dotenv.config();

// Ensure Turso DB tables exist
initDb();

const app = express();
app.use(express.json({ limit: "10mb" }));

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

// Helper function to safely parse JSON strings from SQLite TEXT columns
function parseJson(val: any, fallback: any = []) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

// ==================== COLLEGES API ROUTES (TURSO DB) ====================

// GET /api/colleges - Fetch all colleges
app.get("/api/colleges", async (req, res) => {
  try {
    await initDb();
    const result = await db.execute("SELECT * FROM colleges ORDER FROM created_at DESC, name ASC");
    const colleges = result.rows.map((row: any) => ({
      id: String(row.id),
      name: String(row.name || ""),
      place: String(row.place || ""),
      locationAddress: String(row.location_address || ""),
      details: String(row.details || ""),
      contactNumber: String(row.contact_number || ""),
      website: String(row.website || ""),
      videoUrl: row.video_url ? String(row.video_url) : undefined,
      images: parseJson(row.images, []),
      courses: parseJson(row.courses, []),
      type: row.type ? String(row.type) : undefined,
      established: row.established ? Number(row.established) : undefined,
      rating: row.rating ? Number(row.rating) : undefined
    }));
    res.json({ success: true, colleges });
  } catch (err: any) {
    // If table ordered clause syntax issue or table empty, try simple select
    try {
      const result = await db.execute("SELECT * FROM colleges");
      const colleges = result.rows.map((row: any) => ({
        id: String(row.id),
        name: String(row.name || ""),
        place: String(row.place || ""),
        locationAddress: String(row.location_address || ""),
        details: String(row.details || ""),
        contactNumber: String(row.contact_number || ""),
        website: String(row.website || ""),
        videoUrl: row.video_url ? String(row.video_url) : undefined,
        images: parseJson(row.images, []),
        courses: parseJson(row.courses, []),
        type: row.type ? String(row.type) : undefined,
        established: row.established ? Number(row.established) : undefined,
        rating: row.rating ? Number(row.rating) : undefined
      }));
      res.json({ success: true, colleges });
    } catch (e: any) {
      console.error("Turso DB Get Colleges Error:", e);
      res.json({ success: true, colleges: [] });
    }
  }
});

// POST /api/colleges - Save or update a single college
app.post("/api/colleges", async (req, res) => {
  const college = req.body;
  if (!college || !college.id || !college.name) {
    return res.status(400).json({ error: "College ID and Name are required." });
  }

  try {
    await initDb();
    const imagesJson = JSON.stringify(college.images || []);
    const coursesJson = JSON.stringify(college.courses || []);
    const createdAt = new Date().toISOString();

    await db.execute({
      sql: `
        INSERT INTO colleges (
          id, name, place, location_address, details, contact_number, website, video_url, images, courses, type, established, rating, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          place = excluded.place,
          location_address = excluded.location_address,
          details = excluded.details,
          contact_number = excluded.contact_number,
          website = excluded.website,
          video_url = excluded.video_url,
          images = excluded.images,
          courses = excluded.courses,
          type = excluded.type,
          established = excluded.established,
          rating = excluded.rating;
      `,
      args: [
        college.id,
        college.name || "",
        college.place || "",
        college.locationAddress || "",
        college.details || "",
        college.contactNumber || "",
        college.website || "",
        college.videoUrl || null,
        imagesJson,
        coursesJson,
        college.type || null,
        college.established ? Number(college.established) : null,
        college.rating ? Number(college.rating) : null,
        createdAt
      ]
    });

    res.json({ success: true, college });
  } catch (err: any) {
    console.error("Turso DB Save College Error:", err);
    res.status(500).json({ error: err.message || "Failed to save college to Turso database." });
  }
});

// DELETE /api/colleges/:id - Delete a college
app.delete("/api/colleges/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "College ID is required." });

  try {
    await initDb();
    await db.execute({
      sql: "DELETE FROM colleges WHERE id = ?",
      args: [id]
    });
    res.json({ success: true, id });
  } catch (err: any) {
    console.error("Turso DB Delete College Error:", err);
    res.status(500).json({ error: err.message || "Failed to delete college from Turso database." });
  }
});

// POST /api/colleges/import - Bulk import colleges
app.post("/api/colleges/import", async (req, res) => {
  const { colleges } = req.body;
  if (!Array.isArray(colleges)) {
    return res.status(400).json({ error: "Invalid colleges array." });
  }

  try {
    await initDb();
    const createdAt = new Date().toISOString();
    
    for (const college of colleges) {
      if (!college.id || !college.name) continue;
      const imagesJson = JSON.stringify(college.images || []);
      const coursesJson = JSON.stringify(college.courses || []);

      await db.execute({
        sql: `
          INSERT INTO colleges (
            id, name, place, location_address, details, contact_number, website, video_url, images, courses, type, established, rating, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            place = excluded.place,
            location_address = excluded.location_address,
            details = excluded.details,
            contact_number = excluded.contact_number,
            website = excluded.website,
            video_url = excluded.video_url,
            images = excluded.images,
            courses = excluded.courses,
            type = excluded.type,
            established = excluded.established,
            rating = excluded.rating;
        `,
        args: [
          college.id,
          college.name || "",
          college.place || "",
          college.locationAddress || "",
          college.details || "",
          college.contactNumber || "",
          college.website || "",
          college.videoUrl || null,
          imagesJson,
          coursesJson,
          college.type || null,
          college.established ? Number(college.established) : null,
          college.rating ? Number(college.rating) : null,
          createdAt
        ]
      });
    }

    res.json({ success: true, count: colleges.length });
  } catch (err: any) {
    console.error("Turso DB Import Colleges Error:", err);
    res.status(500).json({ error: err.message || "Failed to import colleges." });
  }
});

// ==================== AUTH & PROFILES API ROUTES (TURSO DB) ====================

// API Route: Send OTP
app.post("/api/auth/send-otp", async (req, res) => {
  const { email, firstName, lastName } = req.body;
  
  if (!email || !firstName || !lastName) {
    return res.status(400).json({ error: "Email and name details are required." });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const normalizedEmail = email.toLowerCase();

  try {
    await initDb();
    await db.execute({
      sql: `
        INSERT INTO auth_otps (email, otp, expires_at, first_name, last_name)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET
          otp = excluded.otp,
          expires_at = excluded.expires_at,
          first_name = excluded.first_name,
          last_name = excluded.last_name;
      `,
      args: [normalizedEmail, otp, expiresAt, firstName, lastName]
    });

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
  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required." });
  }
  const normalizedEmail = email.toLowerCase();

  try {
    await initDb();
    const result = await db.execute({
      sql: "SELECT * FROM auth_otps WHERE email = ?",
      args: [normalizedEmail]
    });

    const record = result.rows[0];

    if (!record) {
      return res.status(400).json({ error: "No verification request found for this email." });
    }

    if (new Date() > new Date(String(record.expires_at))) {
      await db.execute({
        sql: "DELETE FROM auth_otps WHERE email = ?",
        args: [normalizedEmail]
      });
      return res.status(400).json({ error: "Verification code has expired." });
    }

    if (String(record.otp) !== String(otp)) {
      return res.status(400).json({ error: "Invalid verification code." });
    }

    const firstName = String(record.first_name || "");
    const lastName = String(record.last_name || "");

    const user = {
      email: normalizedEmail,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      favorites: [],
      courses: [],
      isVerified: true
    };

    // Upsert into profiles table
    try {
      await db.execute({
        sql: `
          INSERT INTO profiles (email, first_name, last_name, is_verified, updated_at)
          VALUES (?, ?, ?, 1, ?)
          ON CONFLICT(email) DO UPDATE SET
            first_name = excluded.first_name,
            last_name = excluded.last_name,
            is_verified = 1,
            updated_at = excluded.updated_at;
        `,
        args: [normalizedEmail, firstName, lastName, new Date().toISOString()]
      });
    } catch (dbErr) {
      console.warn("Turso profile save warning:", dbErr);
    }

    // Clean up OTP record
    await db.execute({
      sql: "DELETE FROM auth_otps WHERE email = ?",
      args: [normalizedEmail]
    });

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
  
  // Exclude guest logins from DB profile updates
  if (normalizedEmail.startsWith("guest_") || normalizedEmail.endsWith("@predictor.local")) {
    return res.json({ success: true, user: req.body });
  }

  try {
    await initDb();
    const coursesJson = JSON.stringify(courses || []);
    const favoritesJson = JSON.stringify(favorites || []);
    const updatedAt = new Date().toISOString();

    await db.execute({
      sql: `
        INSERT INTO profiles (
          email, first_name, last_name, cet_rank, dcet_score, exam_score, courses, favorites, is_verified, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        ON CONFLICT(email) DO UPDATE SET
          first_name = excluded.first_name,
          last_name = excluded.last_name,
          cet_rank = excluded.cet_rank,
          dcet_score = excluded.dcet_score,
          exam_score = excluded.exam_score,
          courses = excluded.courses,
          favorites = excluded.favorites,
          is_verified = 1,
          updated_at = excluded.updated_at;
      `,
      args: [
        normalizedEmail,
        firstName || "",
        lastName || "",
        cetRank ? Number(cetRank) : null,
        dcetScore ? Number(dcetScore) : null,
        examScore ? Number(examScore) : null,
        coursesJson,
        favoritesJson,
        updatedAt
      ]
    });

    const resultUser = {
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

    res.json({ success: true, user: resultUser });
  } catch (err: any) {
    console.error("Profile sync error:", err);
    res.status(500).json({ error: err.message || "Failed to update profile." });
  }
});

// API Route: Get Registered Students (For Admin Portal)
app.get("/api/admin/students", async (req, res) => {
  try {
    await initDb();
    const result = await db.execute("SELECT * FROM profiles");
    const students = result.rows
      .map((p: any) => ({
        email: String(p.email || ""),
        firstName: String(p.first_name || p.firstName || "Student"),
        lastName: String(p.last_name || p.lastName || ""),
        cetRank: p.cet_rank ? Number(p.cet_rank) : undefined,
        dcetScore: p.dcet_score ? Number(p.dcet_score) : undefined,
        examScore: p.exam_score ? Number(p.exam_score) : undefined,
        courses: parseJson(p.courses, []),
        favorites: parseJson(p.favorites, []),
        isVerified: p.is_verified === 1 || p.is_verified === true
      }))
      .filter((s: any) => {
        if (!s.email) return false;
        const e = s.email.toLowerCase();
        return !e.startsWith("guest_") && !e.endsWith("@predictor.local");
      });

    res.json({ students });
  } catch (err: any) {
    console.error("Get admin students error:", err);
    res.json({ students: [] });
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

// API Route: AI College Details & Campus Research (Powered strictly by Groq API with fallback)
app.post("/api/ai/college-info", async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  const groqApiKey = process.env.GROQ_API_KEY || "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";

  try {
    const { name, place } = req.body || {};
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

    // Strategy 1: Groq API with llama-3.3-70b-versatile
    if (groqApiKey) {
      const modelsToTry = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"];

      for (const modelName of modelsToTry) {
        try {
          const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${groqApiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: modelName,
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

          if (groqResponse.ok) {
            const groqData = await groqResponse.json();
            const markdownText = groqData.choices?.[0]?.message?.content;
            if (markdownText) {
              return res.json({ details: markdownText, provider: `Groq (${modelName})` });
            }
          } else {
            const errBody = await groqResponse.text();
            console.warn(`Groq model ${modelName} returned ${groqResponse.status}:`, errBody);
          }
        } catch (mErr) {
          console.warn(`Groq attempt with ${modelName} failed:`, mErr);
        }
      }
    }

    // Strategy 2: Gemini API Fallback
    const ai = getAI();
    if (ai) {
      try {
        const geminiRes = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: prompt,
        });
        if (geminiRes.text) {
          return res.json({ details: geminiRes.text, provider: "Gemini Flash" });
        }
      } catch (gErr) {
        console.warn("Gemini fallback error:", gErr);
      }
    }

    // Strategy 3: Structured Default Campus Guide
    const defaultGuide = `# ${collegeName} ${city ? `(${city})` : ''}

## 🏫 Campus Overview & Infrastructure
**${collegeName}** is one of the prominent educational institutions ${city ? `in ${city}` : 'in Karnataka'}. The campus features state-of-the-art academic blocks, modern digital lecture halls, advanced engineering laboratories, and high-speed Wi-Fi connectivity throughout the department premises.

## 🔬 Academic Environment & Research
- **Faculty & Mentorship:** Highly experienced academic staff and industry-oriented teaching methodologies.
- **Innovation & Labs:** Specialized research centers, project innovation labs, and active student tech chapters.
- **Library & Digital Resources:** Extensive physical library collections alongside online journal access for students.

## 🎉 Student Life & Campus Culture
- **Clubs & Societies:** Active IEEE student branches, coding clubs, robotics teams, and cultural forums.
- **Annual Events:** Highlights include annual inter-college technical symposiums and vibrant cultural festivals.
- **Hostels & Amenities:** On-campus hostel facilities for boys and girls with sports grounds and cafeteria.

## 📍 Location & Connectivity
Situated in ${city || 'a well-connected area'}, offering convenient access to public transportation, industrial hubs, and student residential areas.`;

    res.json({ details: defaultGuide, provider: "Default Campus Guide" });
  } catch (error: any) {
    console.error("Groq AI College Info Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI college information using Groq." });
  }
});

// Fallback for unmatched API routes - guarantees pure JSON responses
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
});

export default app;
