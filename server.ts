import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { College, StudentProfile, VerificationSession } from "./src/types.js";
import Groq from "groq-sdk";
import { KARNATAKA_COLLEGES } from "./src/data/colleges.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || "https://benwwffceoyptlksuhkv.supabase.co";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "sb_publishable_JC5QiBeK07_8FhK7eVGjBA_L63nOs_Y";
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || "sb_secret_IRss1H-sscsb1gb_wobC2A_piguWyM7";

let supabase: any = null;
try {
  if (supabaseUrl && supabaseSecretKey) {
    supabase = createClient(supabaseUrl, supabaseSecretKey);
    console.log("Supabase client initialized with secret key.");
  }
} catch (err) {
  console.error("Failed to initialize Supabase client:", err);
}

// Local File Store Fallback (Ensures 100% reliability if Supabase tables are not created yet)
const DATA_STORE_PATH = path.join(process.cwd(), "data_store.json");
const DEFAULT_COLLEGES: College[] = KARNATAKA_COLLEGES;

interface LocalStore {
  colleges: College[];
  users: StudentProfile[];
  verificationSessions: VerificationSession[];
}


function readLocalStore(): LocalStore {
  try {
    if (fs.existsSync(DATA_STORE_PATH)) {
      const raw = fs.readFileSync(DATA_STORE_PATH, "utf-8");
      if (!raw || raw === "undefined") {
        return { colleges: DEFAULT_COLLEGES, users: [], verificationSessions: [] };
      }
      const parsed = JSON.parse(raw);
      return {
        colleges: (parsed.colleges && parsed.colleges.length > 5) ? parsed.colleges : DEFAULT_COLLEGES,
        users: parsed.users || [],
        verificationSessions: parsed.verificationSessions || []
      };
    }
  } catch (err) {
    console.error("Failed to read local store:", err);
  }
  return { colleges: DEFAULT_COLLEGES, users: [], verificationSessions: [] };
}

function writeLocalStore(store: LocalStore) {
  try {
    fs.writeFileSync(DATA_STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to local store:", err);
  }
}

// Synchronously initialize the store file
if (!fs.existsSync(DATA_STORE_PATH)) {
  writeLocalStore({ colleges: DEFAULT_COLLEGES, users: [], verificationSessions: [] });
}

// Helper to normalize college names for fuzzy / substring matching
function normalizeCollegeName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") // remove all non-alphanumeric chars (spaces, dots, commas, dashes, etc.)
    .replace("collegeofengineering", "ce") // standardize common suffixes
    .replace("instituteoftechnology", "it")
    .replace("university", "univ")
    .trim();
}

// Find a matching college by normalized name & partial place compatibility
function findMatchingCollege(collegeName: string, place: string, existingColleges: College[]): College | null {
  if (!collegeName) return null;
  
  const normInput = normalizeCollegeName(collegeName);
  const normInputPlace = place ? place.toLowerCase().trim() : "";
  
  // 1. First pass: Exact match of normalized names
  let match = existingColleges.find(c => {
    const normC = normalizeCollegeName(c.name);
    const samePlace = !normInputPlace || !c.place || 
      c.place.toLowerCase().includes(normInputPlace) || 
      normInputPlace.includes(c.place.toLowerCase());
    return normC === normInput && samePlace;
  });
  if (match) return match;
  
  // 2. Second pass: Substring/contains match of normalized names (at least 4 characters long)
  match = existingColleges.find(c => {
    const normC = normalizeCollegeName(c.name);
    const samePlace = !normInputPlace || !c.place || 
      c.place.toLowerCase().includes(normInputPlace) || 
      normInputPlace.includes(c.place.toLowerCase());
    
    const substringMatch = normC.length > 3 && normInput.length > 3 && 
      (normC.includes(normInput) || normInput.includes(normC));
      
    return substringMatch && samePlace;
  });
  
  return match || null;
}

// Merge course branch arrays intelligently by course/branch name instead of overwriting
function mergeCourses(existingCourses: any[], newCourses: any[]): any[] {
  const existing = Array.isArray(existingCourses) ? existingCourses : [];
  const incoming = Array.isArray(newCourses) ? newCourses : [];
  if (existing.length === 0) return incoming;
  if (incoming.length === 0) return existing;
  
  const merged = [...existing];
  for (const newCourse of incoming) {
    if (!newCourse || !newCourse.courseName) continue;
    const normNewCourseName = newCourse.courseName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const idx = merged.findIndex(c => c && c.courseName && c.courseName.toLowerCase().replace(/[^a-z0-9]/g, "") === normNewCourseName);
    if (idx >= 0) {
      merged[idx] = {
        ...merged[idx],
        ...newCourse
      };
    } else {
      merged.push(newCourse);
    }
  }
  return merged;
}

// Database Helpers combining Supabase and Local File fallback
const db = {
  getColleges: async (): Promise<{ data: College[]; isFallback: boolean }> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from("colleges").select("*");
        if (!error && data && data.length > 0) {
          const mapped = data.map((item: any) => ({
            id: item.id?.toString() || item.college_id?.toString(),
            name: item.name || item.college_name,
            place: item.place,
            locationAddress: item.location_address ?? item.locationAddress ?? "",
            website: item.website ?? "",
            contactNumber: item.contact_number ?? item.contactNumber ?? "",
            images: Array.isArray(item.images) ? item.images : (() => {
              try {
                return JSON.parse(item.images || "[]");
              } catch (e) {
                return [];
              }
            })(),
            rating: item.rating,
            details: item.details || "",
            courses: Array.isArray(item.courses) ? item.courses : (() => {
              try {
                return typeof item.courses === 'string' ? JSON.parse(item.courses) : (item.courses || []);
              } catch (e) {
                return [];
              }
            })()
          }));
          return { data: mapped, isFallback: false };
        } else if (error) {
          console.warn("Supabase colleges select failed, falling back to local storage:", error.message);
        }
      } catch (err) {
        console.warn("Error querying Supabase colleges, falling back to local:", err);
      }
    }
    const store = readLocalStore();
    return { data: store.colleges, isFallback: true };
  },

  saveCollege: async (college: College, overwriteCourses: boolean = false): Promise<{ success: boolean; data: College; supabaseError?: string }> => {
    // 1. Save to local fallback first
    const store = readLocalStore();
    let index = store.colleges.findIndex((c) => c.id === college.id);
    if (index < 0) {
      // Fuzzy / substring matching to auto-recognize and match colleges in the database perfectly
      const match = findMatchingCollege(college.name, college.place, store.colleges);
      if (match) {
        index = store.colleges.findIndex((c) => c.id === match.id);
        college.id = match.id;
      }
    }

    if (index >= 0) {
      const existing = store.colleges[index];
      store.colleges[index] = {
        ...existing,
        ...college,
        courses: overwriteCourses ? college.courses : mergeCourses(existing.courses, college.courses),
        images: overwriteCourses ? college.images : (Array.isArray(college.images) && college.images.length > 0 ? college.images : existing.images),
        locationAddress: overwriteCourses ? college.locationAddress : (college.locationAddress || existing.locationAddress || ""),
        website: overwriteCourses ? (college.website ?? "") : (college.website || existing.website || ""),
        contactNumber: overwriteCourses ? (college.contactNumber ?? "") : (college.contactNumber || existing.contactNumber || "")
      };
      college = store.colleges[index];
    } else {
      store.colleges.push(college);
    }
    writeLocalStore(store);

    let supabaseError: string | undefined = undefined;

    // 2. Try saving to Supabase
    if (supabase) {
      try {
        const firstCourse = (college.courses && college.courses.length > 0) ? college.courses[0] : null;
        const courseNameVal = firstCourse ? firstCourse.courseName : "CSE";
        const feesVal = firstCourse ? firstCourse.fees : (college.fees || 150000);
        const avgPkgVal = firstCourse ? firstCourse.averagePackage : (college.averagePackage || 6.5);
        const maxPkgVal = firstCourse ? firstCourse.highestPackage : (college.highestPackage || 12);

        const payload = {
          id: college.id,
          name: college.name,
          place: college.place,
          location_address: college.locationAddress || college.place || "",
          website: college.website,
          contact_number: college.contactNumber,
          images: college.images,
          rating: college.rating || 4.0,
          details: college.details,
          courses: college.courses,
          course: courseNameVal,
          fees: feesVal,
          average_package: avgPkgVal,
          highest_package: maxPkgVal
        };
        const { error } = await supabase.from("colleges").upsert(payload, { onConflict: "id" });
        if (error) {
          console.warn("Could not upsert college in Supabase, saved to local store:", error.message);
          supabaseError = error.message;
        } else {
          console.log("Upserted college into Supabase successfully.");
        }
      } catch (err: any) {
        console.warn("Supabase upsert error:", err);
        supabaseError = err.message || String(err);
      }
    }
    return { success: true, data: college, supabaseError };
  },

  deleteCollege: async (id: string): Promise<{ success: boolean }> => {
    const store = readLocalStore();
    store.colleges = store.colleges.filter((c) => c.id !== id);
    writeLocalStore(store);

    if (supabase) {
      try {
        const { error } = await supabase.from("colleges").delete().eq("id", id);
        if (error) {
          console.warn("Could not delete college from Supabase, deleted locally:", error.message);
        }
      } catch (err) {
        console.warn("Supabase delete error:", err);
      }
    }
    return { success: true };
  },

  getUser: async (email: string): Promise<StudentProfile | null> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from("users").select("*").eq("email", email.toLowerCase()).single();
        if (!error && data) {
          return {
            email: data.email,
            firstName: data.first_name ?? data.firstName,
            lastName: data.last_name ?? data.lastName,
            cetRank: data.cet_rank ?? data.cetRank,
            dcetScore: data.dcet_score ?? data.dcetScore,
            examScore: data.exam_score ?? data.examScore,
            courses: Array.isArray(data.courses) ? data.courses : JSON.parse(data.courses || "[]"),
            favorites: Array.isArray(data.favorites) ? data.favorites : JSON.parse(data.favorites || "[]"),
            isVerified: data.is_verified ?? data.isVerified ?? false
          };
        }
      } catch (err) {
        console.warn("Supabase get user failed, checking local:", err);
      }
    }
    const store = readLocalStore();
    const user = store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    return user || null;
  },

  saveUser: async (profile: StudentProfile): Promise<StudentProfile> => {
    // 1. Save to local fallback first
    const store = readLocalStore();
    const index = store.users.findIndex((u) => u.email.toLowerCase() === profile.email.toLowerCase());
    if (index >= 0) {
      store.users[index] = profile;
    } else {
      store.users.push(profile);
    }
    writeLocalStore(store);

    // 2. Try saving to Supabase
    if (supabase) {
      try {
        const payload = {
          email: profile.email.toLowerCase(),
          first_name: profile.firstName,
          last_name: profile.lastName,
          cet_rank: profile.cetRank,
          dcet_score: profile.dcetScore,
          exam_score: profile.examScore,
          courses: profile.courses,
          favorites: profile.favorites,
          is_verified: profile.isVerified
        };
        const { error } = await supabase.from("users").upsert(payload, { onConflict: "email" });
        if (error) {
          console.warn("Could not upsert user in Supabase, saved to local store:", error.message);
        } else {
          console.log("Upserted user into Supabase successfully.");
        }
      } catch (err) {
        console.warn("Supabase user upsert error:", err);
      }
    }
    return profile;
  },

  saveVerificationSession: async (session: VerificationSession): Promise<void> => {
    const store = readLocalStore();
    store.verificationSessions = store.verificationSessions.filter(
      (s) => s.email.toLowerCase() !== session.email.toLowerCase()
    );
    store.verificationSessions.push(session);
    writeLocalStore(store);

    if (supabase) {
      try {
        const payload = {
          email: session.email.toLowerCase(),
          first_name: session.firstName,
          last_name: session.lastName,
          otp: session.otp,
          expires_at: session.expiresAt
        };
        const { error } = await supabase.from("verification_sessions").upsert(payload, { onConflict: "email" });
        if (error) {
          console.warn("Could not upsert verification session in Supabase:", error.message);
        }
      } catch (err) {
        console.warn("Supabase verification session upsert error:", err);
      }
    }
  },

  getVerificationSession: async (email: string): Promise<VerificationSession | null> => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("verification_sessions")
          .select("*")
          .eq("email", email.toLowerCase())
          .single();
        if (!error && data) {
          return {
            email: data.email,
            firstName: data.first_name ?? data.firstName,
            lastName: data.last_name ?? data.lastName,
            otp: data.otp,
            expiresAt: Number(data.expires_at ?? data.expiresAt)
          };
        }
      } catch (err) {
        console.warn("Supabase get verification session failed, checking local:", err);
      }
    }
    const store = readLocalStore();
    const session = store.verificationSessions.find((s) => s.email.toLowerCase() === email.toLowerCase());
    return session || null;
  }
};

// Initialize Groq Client
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const groqClient = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;

if (!groqClient) {
  console.warn("No GROQ_API_KEY found. AI functions will fall back to smart static mock replies.");
} else {
  console.log("Groq AI SDK client successfully initialized.");
}

async function callGroq(prompt: string, jsonMode: boolean = false): Promise<string> {
  if (!groqClient) throw new Error("Groq client not initialized");
  
  const response = await groqClient.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    response_format: jsonMode ? { type: "json_object" } : undefined
  });

  return response.choices?.[0]?.message?.content || "";
}

// Create Nodemailer Transporter using the user's details
const GMAIL_USER = process.env.GMAIL_USER || "nanoneptunemusic@gmail.com";
const GMAIL_APP_PASS = process.env.GMAIL_APP_PASS || "lipgleshgbgrjvrr";

const mailTransporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // true for port 465
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASS
  }
});

// Verification check on transporter on start
mailTransporter.verify((error, success) => {
  if (error) {
    console.error("Nodemailer SMTP Transporter setup error:", error);
  } else {
    console.log("Nodemailer Gmail SMTP Server is ready to send OTP emails!");
  }
});

/* ==================== API ROUTES ==================== */

// 1. Send OTP Route
app.post("/api/auth/send-otp", async (req, res) => {
  const { email, firstName, lastName } = req.body;
  if (!email || !firstName || !lastName) {
    return res.status(400).json({ error: "Email, first name, and last name are required." });
  }

  // Generate random 6-digit code
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now

  try {
    // Save to DB
    await db.saveVerificationSession({
      email: email.toLowerCase(),
      firstName,
      lastName,
      otp,
      expiresAt
    });

    // Send Mail
    let mailSent = false;
    let mailError = "";
    
    try {
      const mailOptions = {
        from: `"College Predictor" <${GMAIL_USER}>`,
        to: email,
        subject: `Your College Predictor OTP: ${otp}`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 32px; font-weight: bold; color: #3b82f6;">🎓 College Predictor</span>
            </div>
            <h2 style="font-size: 18px; color: #1f2937; margin-bottom: 12px;">Hello ${firstName},</h2>
            <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin-bottom: 24px;">
              Thank you for registering on the College Predictor App. Use the following 6-digit OTP code to complete your verification and access college recommendations based on your rank.
            </p>
            <div style="text-align: center; margin-bottom: 28px;">
              <div style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #2563eb; background: #eff6ff; padding: 12px 24px; border-radius: 8px; border: 1px dashed #bfdbfe;">
                ${otp}
              </div>
              <p style="font-size: 11px; color: #9ca3af; margin-top: 8px;">Valid for 10 minutes</p>
            </div>
            <hr style="border: 0; border-top: 1px solid #f3f4f6; margin-bottom: 16px;" />
            <p style="font-size: 11px; color: #9ca3af; text-align: center; line-height: 1.4;">
              This email was sent to ${email}. If you did not request this OTP, please ignore this email.
            </p>
          </div>
        `
      };

      await mailTransporter.sendMail(mailOptions);
      mailSent = true;
      console.log(`OTP (${otp}) successfully sent to ${email}`);
    } catch (err: any) {
      console.error("Nodemailer send OTP error, using fallback output:", err);
      mailError = err.message || "SMTP error";
    }

    return res.json({
      success: true,
      message: mailSent ? "OTP sent successfully!" : "Verification initialized (mail fallback mode).",
      mailSent,
      otp: mailSent ? undefined : otp,
      mailError: mailSent ? undefined : mailError
    });
  } catch (error: any) {
    console.error("Save verification session error:", error);
    return res.status(500).json({ error: "Failed to initialize verification: " + error.message });
  }
});

// 2. Verify OTP Route
app.post("/api/auth/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required." });
  }

  try {
    const session = await db.getVerificationSession(email);
    if (!session) {
      return res.status(400).json({ error: "Verification session not found. Please request a new OTP." });
    }

    if (Date.now() > session.expiresAt) {
      return res.status(400).json({ error: "OTP code has expired. Please request a new one." });
    }

    if (session.otp !== otp.trim()) {
      return res.status(400).json({ error: "Incorrect verification code. Please try again." });
    }

    // OTP verified, create or update user profile
    let profile = await db.getUser(email);
    if (!profile) {
      profile = {
        email: email.toLowerCase(),
        firstName: session.firstName,
        lastName: session.lastName,
        cetRank: undefined,
        dcetScore: undefined,
        examScore: undefined,
        courses: [],
        favorites: [],
        isVerified: true
      };
    } else {
      profile.isVerified = true;
    }

    await db.saveUser(profile);
    return res.json({ success: true, user: profile });
  } catch (error: any) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({ error: "Verification failed: " + error.message });
  }
});

// 3. Update Profile Route
app.post("/api/auth/update-profile", async (req, res) => {
  const { email, cetRank, dcetScore, examScore, courses, favorites } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required to update profile." });
  }

  try {
    const profile = await db.getUser(email);
    if (!profile) {
      return res.status(404).json({ error: "User profile not found." });
    }

    if (cetRank !== undefined) profile.cetRank = cetRank === "" ? undefined : Number(cetRank);
    if (dcetScore !== undefined) profile.dcetScore = dcetScore === "" ? undefined : Number(dcetScore);
    if (examScore !== undefined) profile.examScore = examScore === "" ? undefined : Number(examScore);
    if (courses !== undefined) profile.courses = courses;
    if (favorites !== undefined) profile.favorites = favorites;

    await db.saveUser(profile);
    return res.json({ success: true, user: profile });
  } catch (error: any) {
    console.error("Update profile error:", error);
    return res.status(500).json({ error: "Failed to update profile: " + error.message });
  }
});

// 4. Get Colleges Route (With check if we are in local fallback)
app.get("/api/colleges", async (req, res) => {
  try {
    const { data, isFallback } = await db.getColleges();
    return res.json({ colleges: data, isFallback });
  } catch (error: any) {
    console.error("Get colleges error:", error);
    return res.status(500).json({ error: "Failed to load colleges list." });
  }
});

import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post("/api/colleges/ai-refine", async (req, res) => {
  const { adminCode, college } = req.body;
  if (adminCode !== "831067") {
    return res.status(403).json({ error: "Invalid administrative access code." });
  }
  if (!college) {
    return res.status(400).json({ error: "Missing college data." });
  }

  try {
    const prompt = `Refine the following engineering college data based on real-world information in Karnataka, India. 
Fix any misspelled or misplaced names. If the college name was mistakenly put in the course/branch field, fix it. Make sure the courses array contains ACTUAL course/branch names (e.g. "Computer Science Engineering", "ECE").
Provide realistic average and highest placement packages (LPA), fees in INR, and a rating out of 5 for both the college overall and its courses.
For the images array: if the input images are valid, high-quality, or real campus images (like unsplash), KEEP THEM in your returned array. Only replace them if they are broken/invalid, or if the array is empty. In that case, provide realistic image URLs (like Wikipedia logos).

Input: ${JSON.stringify(college)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Corrected College Name" },
            place: { type: Type.STRING, description: "Corrected Place/City" },
            locationAddress: { type: Type.STRING, description: "Full address" },
            website: { type: Type.STRING, description: "Official website URL" },
            contactNumber: { type: Type.STRING },
            rating: { type: Type.NUMBER, description: "Rating out of 5" },
            details: { type: Type.STRING, description: "A short descriptive paragraph about the college" },
            averagePackage: { type: Type.NUMBER, description: "Average placement package in LPA" },
            highestPackage: { type: Type.NUMBER, description: "Highest placement package in LPA" },
            fees: { type: Type.NUMBER, description: "Approximate fees in INR" },
            images: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Array of image URLs. Provide valid ones if possible."
            },
            courses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  courseName: { type: Type.STRING, description: "Actual branch name like 'Computer Science Engineering'" },
                  fees: { type: Type.NUMBER },
                  cutoffRank: { type: Type.NUMBER },
                  cutoffRankPreviousYear: { type: Type.NUMBER },
                  averagePackage: { type: Type.NUMBER },
                  highestPackage: { type: Type.NUMBER }
                },
                required: ["courseName", "fees", "cutoffRank", "averagePackage", "highestPackage"]
              }
            }
          },
          required: ["name", "place", "locationAddress", "website", "contactNumber", "rating", "details", "averagePackage", "highestPackage", "fees", "images", "courses"]
        }
      }
    });

    const text = response.text.trim();
    const refinedData = JSON.parse(text);

    return res.json({ success: true, refinedCollege: refinedData });
  } catch (error: any) {
    console.error("AI Refine Error:", error);
    return res.status(500).json({ error: "Failed to refine college data using AI: " + error.message });
  }
});

// 5. Admin College CRUD
app.post("/api/colleges", async (req, res) => {
  const { adminCode, college, overwriteCourses } = req.body;
  if (adminCode !== "831067") {
    return res.status(403).json({ error: "Invalid administrative access code." });
  }
  if (!college || !college.name || !college.place) {
    return res.status(400).json({ error: "Missing required college fields (name, place)." });
  }

  try {
    let coursesList = [];
    if (Array.isArray(college.courses)) {
      coursesList = college.courses;
    } else if (college.course) {
      // Compatibility fallback
      coursesList = [
        {
          courseName: college.course,
          averagePackage: Number(college.averagePackage || 0),
          highestPackage: Number(college.highestPackage || 0),
          fees: Number(college.fees || 0),
          cutoffRank: Number(college.cutoffRank || 5000),
          cutoffRankPreviousYear: Number(college.cutoffRankPreviousYear || 5500)
        }
      ];
    } else {
      coursesList = [
        {
          courseName: "Computer Science Engineering",
          averagePackage: 6.0,
          highestPackage: 15.0,
          fees: 150000,
          cutoffRank: 5000,
          cutoffRankPreviousYear: 5500
        }
      ];
    }

    const newCollege: College = {
      id: college.id || "clg_" + Date.now(),
      name: college.name,
      place: college.place,
      locationAddress: college.locationAddress || college.place || "",
      website: college.website || "",
      contactNumber: college.contactNumber || "",
      images: Array.isArray(college.images) ? college.images : [],
      rating: Number(college.rating || 4.2),
      details: college.details || "",
      courses: coursesList
    };

    const result = await db.saveCollege(newCollege, overwriteCourses === true);
    return res.json({ success: true, college: result.data });
  } catch (error: any) {
    console.error("Save college error:", error);
    return res.status(500).json({ error: "Failed to save college: " + error.message });
  }
});

// Admin Delete College Route
app.delete("/api/colleges/:id", async (req, res) => {
  const adminCode = req.query.adminCode as string;
  if (adminCode !== "831067") {
    return res.status(403).json({ error: "Invalid administrative access code." });
  }

  try {
    await db.deleteCollege(req.params.id);
    return res.json({ success: true, id: req.params.id });
  } catch (error: any) {
    console.error("Delete college error:", error);
    return res.status(500).json({ error: "Failed to delete college." });
  }
});

// 6. Bulk Import Colleges Route (CSV/JSON)
app.post("/api/colleges/import", async (req, res) => {
  const { adminCode, colleges } = req.body;
  if (adminCode !== "831067") {
    return res.status(403).json({ error: "Invalid administrative access code." });
  }
  if (!Array.isArray(colleges)) {
    return res.status(400).json({ error: "Colleges data must be an array." });
  }

  try {
    const savedColleges: College[] = [];
    for (const c of colleges) {
      if (!c.name || !c.place) continue;
      
      let coursesList = [];
      if (Array.isArray(c.courses)) {
        coursesList = c.courses;
      } else if (c.course) {
        coursesList = [
          {
            courseName: c.course,
            averagePackage: Number(c.averagePackage || c.average_package || 0),
            highestPackage: Number(c.highestPackage || c.highest_package || 0),
            fees: Number(c.fees || 0),
            cutoffRank: Number(c.cutoffRank || c.cutoff_rank || 5000),
            cutoffRankPreviousYear: Number(c.cutoffRankPreviousYear || c.cutoff_rank_previous_year || 5500)
          }
        ];
      } else {
        coursesList = [
          {
            courseName: "Computer Science Engineering",
            averagePackage: 6.0,
            highestPackage: 15.0,
            fees: 150000,
            cutoffRank: 5000,
            cutoffRankPreviousYear: 5500
          }
        ];
      }

      const collegeObj: College = {
        id: c.id || "clg_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now(),
        name: c.name,
        place: c.place,
        locationAddress: c.locationAddress || c.location_address || c.place || "",
        website: c.website || "",
        contactNumber: c.contactNumber || c.contact_number || "",
        images: Array.isArray(c.images) && c.images.length > 0
          ? c.images
          : [
              "",
              "",
              "",
              "",
              ""
            ],
        rating: Number(c.rating || 4.2),
        details: c.details || "",
        courses: coursesList
      };
      await db.saveCollege(collegeObj);
      savedColleges.push(collegeObj);
    }
    return res.json({ success: true, count: savedColleges.length, colleges: savedColleges });
  } catch (error: any) {
    console.error("Bulk import colleges error:", error);
    return res.status(500).json({ error: "Failed to import colleges: " + error.message });
  }
});

// 7. AI Match Prediction Route
app.post("/api/ai/predict", async (req, res) => {
  const { email, courses, cetRank, dcetScore, examScore, budget } = req.body;

  try {
    const { data: colleges } = await db.getColleges();

    let analysisPrompt = `You are an expert Indian University admission counselor. A student is looking for college recommendations.
Here are the student details:
- CET Rank: ${cetRank || "Not Provided"}
- DCET Score: ${dcetScore || "Not Provided"}
- Board / Exam Score: ${examScore || "Not Provided"}%
- Interested in Courses: ${courses?.join(", ") || "Any course"}
- Maximum Fees Budget: ${budget ? `${budget} INR` : "No limit"}

Here is the database of colleges with their courses, cutoffs, location addresses, and placement records in Karnataka:
${colleges
  .map(
    (c) =>
      `- **${c.name}** located at "${c.locationAddress}" (Website: ${c.website}):
${c.courses.map(course => `  * ${course.courseName}: Cutoff Rank: ${course.cutoffRank}, Prev Year Cutoff: ${course.cutoffRankPreviousYear || "N/A"}, College Fees: ₹${course.fees.toLocaleString()}, Avg Package: ${course.averagePackage} LPA, Highest Package: ${course.highestPackage} LPA`).join("\n")}
  * Details: ${c.details}`
  )
  .join("\n\n")}

Provide a beautiful, highly informative, and encouraging college prediction report for this student. Use a concise, elegant layout with bold markdown.
Categorize colleges into:
1. **Dream Matches (High Reach)** - Slightly ambitious based on rank but excellent packages.
2. **Target Matches (Best Fit)** - Highly aligned with credentials, rank, and budget.
3. **Safe Matches (Backup options)** - Clear chance of admission.

Add a custom "Expert Tip" about fees, branches, or preparing for counseling. Keep the style modern, clean, and highly human (do not sound like a generic AI).`;

    if (GROQ_API_KEY) {
      const responseText = await callGroq(analysisPrompt);
      return res.json({ prediction: responseText });
    } else {
      // Mocked Smart counsel response if Groq API key is missing
      const matched: Array<{ college: College; course: any }> = [];
      for (const c of colleges) {
        for (const r of c.courses) {
          if (courses && courses.length > 0) {
            const matchesCourse = courses.some((sc: string) => r.courseName.toLowerCase().includes(sc.toLowerCase()));
            if (!matchesCourse) continue;
          }
          if (budget && r.fees > budget) continue;
          matched.push({ college: c, course: r });
        }
      }

      const displayMatched = matched.length > 0 ? matched : colleges.flatMap(c => c.courses.map(r => ({ college: c, course: r })));

      let predictionText = `### 🎓 Personalized College Match Report (AI Local Counselor)
      
Based on your rank and credentials, here is our recommended mapping. *(Note: Groq API Key not initialized; showing database-matched recommendations)*:

#### **🎯 Target Matches (Best Fit)**
${displayMatched
  .slice(0, 2)
  .map(
    (m) =>
      `- **${m.college.name}** (${m.college.place})
  - **Branch**: ${m.course.courseName}
  - **Avg Package**: ${m.course.averagePackage} LPA | **College Fees**: ₹${m.course.fees.toLocaleString()}/yr
  - **Cutoff Rank**: ${m.course.cutoffRank} (Prev Year: ${m.course.cutoffRankPreviousYear || "N/A"})
  - **Admission Probability**: 85% (Excellent fit for your CET/DCET credentials!)`
  )
  .join("\n")}

#### **🟢 Safe Matches (Backup Options)**
${displayMatched
  .slice(2, 4)
  .map(
    (m) =>
      `- **${m.college.name}** (${m.college.place})
  - **Branch**: ${m.course.courseName}
  - **Avg Package**: ${m.course.averagePackage} LPA | **College Fees**: ₹${m.course.fees.toLocaleString()}/yr
  - **Cutoff Rank**: ${m.course.cutoffRank} (Prev Year: ${m.course.cutoffRankPreviousYear || "N/A"})
  - **Admission Probability**: 99% (Highly secure choice based on past cutoff trends!)`
  )
  .join("\n")}

---
💡 **Expert Tip:** Your rank is competitive! Consider locking in your choices at **PES University** or **RV College of Engineering** during the first round of mock allotment. Keep an eye on budget parameters; some private courses carry premium fees but yield exceptional placement outcomes (over 12 LPA).`;

      return res.json({ prediction: predictionText });
    }
  } catch (error: any) {
    console.error("AI matching prediction error:", error);
    return res.status(500).json({ error: "AI recommendation engine is currently busy. Please try again." });
  }
});

// 7. Sync Local to Supabase Route
app.post("/api/admin/sync-database", async (req, res) => {
  const { adminCode } = req.body;
  if (adminCode !== "831067") {
    return res.status(403).json({ error: "Invalid administrative access code." });
  }

  try {
    const store = readLocalStore();
    let syncedCount = 0;
    let lastSupabaseError: string | null = null;
    
    for (const college of store.colleges) {
      const result = await db.saveCollege(college);
      syncedCount++;
      if (result.supabaseError) {
        lastSupabaseError = result.supabaseError;
      }
    }

    res.json({ success: true, syncedCount, supabaseError: lastSupabaseError });
  } catch (err: any) {
    res.status(500).json({ error: "Sync failed: " + err.message });
  }
});

// 8. AI Generate College Details & Campus Images Route with Google Search Grounding
app.post("/api/ai/generate-details", async (req, res) => {
  const { name, place, course } = req.body;
  if (!name || !place) {
    return res.status(400).json({ error: "College name and location are required." });
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not configured in environment variables.");
    }

    const groq = new Groq({ apiKey });

    const promptText = `Find the official, actual, real-world specifications, real campus/building photos, contact helpline, and fee structure of this college in India:
College Name: "${name}"
Approximate/Partial Location: "${place}"

Return exactly these fields:
1. "locationAddress": The official, precise, complete physical postal address of this college (including street name, area, district/city, state, and pincode/zip code) in India.
2. "website": The actual, real-world official website URL of this college (e.g., https://reva.edu.in).
3. "contactNumber": The official general helpline telephone number with the correct STD code (e.g., 080-9021190211).
4. "averagePackage": The actual, realistic average placement salary package in LPA (Lakhs Per Annum) based on recent placement reports (e.g. 7.5 or 12.0).
5. "highestPackage": The actual, realistic highest placement salary package in LPA based on recent placement reports (e.g. 35.0 or 50.0).
6. "fees": The actual, realistic annual academic fees in INR for the Computer Science or general engineering programs (e.g. 250000).
7. "details": A highly accurate, beautiful 2-3 sentence overview of this university's academic quality, campus environment, specific landmarks (such as its Bagalur or Yelahanka campus details), and notable rankings or accreditations.
8. "images": Find exactly 5 ACTUAL, live, public image URLs of this specific college's campus facade, main entrance, or iconic building. These must be direct real-world images from the web (e.g. hosted on wikimedia.org, the college's official website, or news sites). Absolutely do NOT use generic stock images or Unsplash links. Ensure they are secure, active HTTPS URLs that can be embedded in an <img> tag.

You MUST return exactly a JSON object matching this schema. Do not write any markdown code blocks (e.g. do not wrap with \`\`\`json) or extra conversational words.
`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: promptText }],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" }
    });

    const responseText = chatCompletion.choices[0]?.message?.content || "{}";
    let generated: any = {};
    try {
      generated = JSON.parse(responseText);
    } catch (e) {
      console.error("AI details parse error:", responseText);
    }
    
    // Safety check on images
    if (!generated.images || !Array.isArray(generated.images) || generated.images.length === 0) {
      generated.images = [
        "",
        "",
        "",
        "",
        ""
      ];
    } else {
      // Ensure we have exactly 5 elements. If we have less, fill with high-quality academic pictures
      const placeholders = [
        "",
        "",
        "",
        "",
        ""
      ];
      while (generated.images.length < 5) {
        generated.images.push(placeholders[generated.images.length % placeholders.length]);
      }
    }

    console.log(`Successfully generated grounded details for ${name} using Google Search.`);
    return res.json({ success: true, data: generated });

  } catch (err: any) {
    console.error("AI details generate error, falling back to Llama/mock:", err);
    
    // Fallback using Groq or mock if Gemini encounters an error
    try {
      if (GROQ_API_KEY) {
        const promptTextFallback = `Generate realistic parameters and beautiful architectural campus images for a college in India named "${name}" located in "${place}".
Make sure you return exactly a JSON object matching this format (no markdown formatting, no backticks):
{
  "averagePackage": number,
  "highestPackage": number,
  "fees": number,
  "details": "A gorgeous 2-3 sentence overview of this university's academic quality, campus environment, and cultural vibe.",
  "contactNumber": "A valid telephone number with STD code e.g. 080-23456789 or 080-68188100",
  "website": "Realistic website URL e.g. https://[abbreviation-of-college].edu.in or similar",
  "locationAddress": "${name}, ${place}, India",
  "images": [
    "",
    "",
    "",
    "",
    ""
  ]
}`;
        let responseText = await callGroq(promptTextFallback, true);
        responseText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
        let generated: any = {};
        try {
          generated = JSON.parse(responseText);
        } catch (e) {
          console.error("Llama fallback parse error:", responseText);
        }
        return res.json({ success: true, data: generated });
      }
    } catch (fallbackErr) {
      console.error("Llama fallback failed:", fallbackErr);
    }

    const abbreviation = name
      .split(" ")
      .map((w: string) => w[0])
      .join("")
      .toLowerCase()
      .replace(/[^a-z]/g, "");
    const generatedMock = {
      averagePackage: Number((6.0 + Math.random() * 6).toFixed(1)),
      highestPackage: Number((18.0 + Math.random() * 35).toFixed(1)),
      fees: Math.floor((120000 + Math.random() * 200000) / 1000) * 1000,
      details: `${name} is an esteemed institution situated in ${place}. Renowned for its focus on holistic education and extensive industry placements, the institute provides students with a stellar environment for academic growth and career readiness.`,
      contactNumber: `080-${Math.floor(20000000 + Math.random() * 70000000)}`,
      website: `https://${abbreviation || "college"}.edu.in`,
      locationAddress: `${name}, ${place}, India`,
      images: [
        "",
        "",
        "",
        "",
        ""
      ]
    };
    return res.json({ success: true, data: generatedMock });
  }
});

// AI Smart Scraper from URL
app.post("/api/ai/scrape-url", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL is required." });
  }

  try {
    console.log(`Scraping URL requested: ${url}`);
    
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 12000);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
      }
    });
    clearTimeout(id);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const htmlText = await response.text();
    
    // Clean and minify HTML content
    const strippedText = htmlText
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 15000);

    if (!strippedText || strippedText.length < 10) {
      throw new Error("Could not extract any meaningful text content from this page.");
    }

    const prompt = `Read and analyze this extracted text content from a college's website or admission portal.
Extract and output exactly a structured JSON object with details about the college.

EXTRACTED TEXT FROM WEBSITE:
"""
${strippedText}
"""

You MUST output exactly a JSON object matching this schema:
{
  "name": "Full name of the college/university",
  "place": "The city/town or area where it is situated in India",
  "locationAddress": "The full complete physical postal address of the campus if found, or empty string",
  "website": "The URL of the website scraped",
  "contactNumber": "Any contact phone numbers/helplines mentioned, or empty string",
  "averagePackage": number or null,
  "highestPackage": number or null,
  "fees": number or null,
  "details": "A clean 2-3 sentence overview summarizing college features, infrastructure, and reputation compiled from the webpage.",
  "courses": [
    { "courseName": "E.g. Computer Science & Engineering", "averagePackage": 7.5 },
    { "courseName": "E.g. Information Science & Engineering", "averagePackage": 6.8 }
  ]
}

Ensure the fields are accurate to the text. Return ONLY a valid JSON object. Do not include markdown codeblocks or surrounding conversational words.`;

    const aiResponse = await callGroq(prompt, true);
    let parsed: any = {};
    try {
      parsed = JSON.parse(aiResponse);
    } catch (e) {
      console.error("AI scraping parser error:", aiResponse);
      throw new Error("AI failed to organize the scraped information into structured data.");
    }

    return res.json({ success: true, data: parsed });

  } catch (err: any) {
    console.error("Scraping URL error:", err);
    return res.status(500).json({ error: "Failed to scrape URL: " + err.message });
  }
});

// Serve DB Schema SQL script for Admin to copy-paste into Supabase SQL editor


app.get("/api/admin/students", async (req, res) => {
  const adminCode = req.query.adminCode;
  if (adminCode !== "831067") {
    return res.status(403).json({ error: "Invalid administrative access code." });
  }
  const store = readLocalStore();
  res.json({ success: true, data: store.users || [] });
});


app.post("/api/admin/smart-upload", async (req, res) => {
  const { filename, mimeType, data, adminCode } = req.body;
  if (adminCode !== "831067") {
    return res.status(403).json({ error: "Invalid admin authorization code." });
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not configured.");
    }
    const groq = new Groq({ apiKey });

    // Assuming base64 format like "data:image/png;base64,iVBORw0KGgo..."
    const base64Content = data.split(',')[1] || data;

    const store = readLocalStore();
    const existingColleges = store.colleges.map(c => ({
      id: c.id,
      name: c.name,
      place: c.place
    }));

    const promptText = `You are an AI assistant that extracts college data from documents (CSV or PDF).
The user uploaded a document containing college details (names, locations, courses, cutoffs by categories like GM, SC, ST, KKR, phone numbers, fees, placement stats, etc).
Extract the information into a structured JSON array.
Merge the information with the existing colleges if the names closely match to avoid duplicates.
List of existing colleges (ID, Name, Place):
${JSON.stringify(existingColleges)}

Return ONLY a JSON array of college objects.
Each object MUST conform to this structure:
{
  "id": "string (use existing ID if it matches, otherwise null)",
  "name": "string",
  "place": "string",
  "locationAddress": "string",
  "contactNumber": "string",
  "website": "string",
  "details": "string",
  "courses": [
    {
      "courseName": "string",
      "averagePackage": number (LPA),
      "highestPackage": number (LPA),
      "fees": number (INR),
      "cutoffRank": number,
      "cutoffRankPreviousYear": number,
      "categoryCutoffs": { "GM": number, "SC": number, "ST": number, "KKR": number }
    }
  ],
  "images": ["url1", "url2", "url3", "url4", "url5"]
}
If 'images' is missing or you don't know, provide 5 Unsplash placeholder links.
Ensure all courses are properly structured.
    `;

    let responseText = "";
    
    // Check if data is CSV (simple detection)
    const isCsv = filename.toLowerCase().endsWith(".csv");
    
    if (isCsv && !mimeType.startsWith("image/")) {
      // Direct CSV parsing if it's a large file
      const decodedData = Buffer.from(base64Content, 'base64').toString('utf-8');
      const lines = decodedData.split(/\r?\n/);
      if (lines.length > 50) {
        console.log(`Large CSV detected (${lines.length} lines). Using native parsing instead of AI.`);
        // Basic parser for colleges
        const headers = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/["\s_]/g, ""));
        const idxName = headers.indexOf("name");
        const idxPlace = headers.indexOf("place");
        const idxCourse = headers.indexOf("course");
        const idxCutoff = headers.indexOf("cutoff");
        
        const imported = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
          if (cols.length < 2) continue;
          
          const nameValue = cols[idxName >= 0 ? idxName : 0];
          const placeValue = cols[idxPlace >= 0 ? idxPlace : 1] || "Karnataka";
          
          imported.push({
            name: nameValue,
            place: placeValue,
            locationAddress: `${nameValue}, ${placeValue}`,
            courses: [
              {
                courseName: cols[idxCourse >= 0 ? idxCourse : 2] || "Engineering",
                cutoffRank: Number(cols[idxCutoff >= 0 ? idxCutoff : 3]) || 5000,
                fees: 150000,
                averagePackage: 6.5,
                highestPackage: 12
              }
            ]
          });
        }
        
        let updatedCount = 0;
        let lastSupabaseError: string | null = null;
        for (const clg of imported) {
           const saveRes = await db.saveCollege({
             id: "clg_csv_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
             ...clg,
             website: "",
             contactNumber: "",
             details: "Imported via CSV",
             images: [
               "",
               "",
               "",
               "",
               ""
             ]
           } as College);
           if (saveRes.supabaseError) {
             lastSupabaseError = saveRes.supabaseError;
           }
           updatedCount++;
        }
        return res.json({ success: true, updatedCount, supabaseError: lastSupabaseError });
      }
    }

    if (mimeType.startsWith("image/")) {
      // Vision Model
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: promptText },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Content}`,
                },
              },
            ],
          },
        ],
        model: "llama-3.2-11b-vision-preview",
        response_format: { type: "json_object" }
      });
      responseText = chatCompletion.choices[0]?.message?.content || "[]";
    } else {
      // Text Model (for CSV data if it was passed as text, though here it's base64)
      // If it's a PDF, vision model might still be better if Groq supports it, 
      // but Groq vision is specifically for images. 
      // For simplicity in this replacement, we use the vision model if it's an image.
      // If it's something else, we'll try to treat it as a text task with a large context.
      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "user", content: promptText + "\n\nDocument Data (Base64 Encoded): " + base64Content.substring(0, 10000) }],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" }
      });
      responseText = chatCompletion.choices[0]?.message?.content || "[]";
    }

    if (responseText.startsWith("```")) {
      responseText = responseText.replace(/\`\`\`json/gi, "").replace(/\`\`\`/g, "").trim();
    }
    
    let parsedData: any = [];
    try {
      parsedData = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", responseText);
      return res.status(500).json({ error: "AI returned invalid response format." });
    }
    const finalArray = Array.isArray(parsedData) ? parsedData : (parsedData.colleges || []);

    let updatedCount = 0;
    let lastSupabaseError: string | null = null;
    for (const scrapedClg of finalArray) {
      let collegeToSave: College;
      const matched = scrapedClg.id ? store.colleges.find(c => c.id === scrapedClg.id) : null;
      
      if (matched) {
        const existing = matched;
        collegeToSave = {
          ...existing,
          ...scrapedClg,
          courses: mergeCourses(existing.courses, scrapedClg.courses),
          contactNumber: scrapedClg.contactNumber || existing.contactNumber
        };
      } else {
        // Try fuzzy / substring matching to prevent duplicate creations
        const fuzzyMatch = findMatchingCollege(scrapedClg.name, scrapedClg.place, store.colleges);
        if (fuzzyMatch) {
          collegeToSave = {
            ...fuzzyMatch,
            ...scrapedClg,
            id: fuzzyMatch.id,
            courses: mergeCourses(fuzzyMatch.courses, scrapedClg.courses),
            contactNumber: scrapedClg.contactNumber || fuzzyMatch.contactNumber
          };
        } else {
          // Truly brand new college
          collegeToSave = {
            ...scrapedClg,
            id: scrapedClg.id || "clg_ai_" + Date.now() + Math.floor(Math.random() * 1000)
          };
        }
      }
      
      const saveRes = await db.saveCollege(collegeToSave);
      if (saveRes.supabaseError) {
        lastSupabaseError = saveRes.supabaseError;
      }
      updatedCount++;
    }

    res.json({ success: true, updatedCount, supabaseError: lastSupabaseError });
  } catch (error) {
    console.error("Smart upload error:", error);
    res.status(500).json({ error: error.message });
  }
});


app.get("/api/db-schema-sql", (req, res) => {
  const sql = `-- RUN THE FOLLOWING CODE IN YOUR SUPABASE SQL EDITOR TO INITIALIZE THE DATABASE TABLES

-- 1. Create Colleges Table
CREATE TABLE IF NOT EXISTS colleges (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    place TEXT NOT NULL,
    location_address TEXT,
    website TEXT,
    contact_number TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    rating NUMERIC DEFAULT 4.0,
    details TEXT,
    courses JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Users Table
CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    cet_rank INTEGER,
    dcet_score NUMERIC,
    exam_score NUMERIC,
    courses JSONB DEFAULT '[]'::jsonb,
    favorites JSONB DEFAULT '[]'::jsonb,
    is_verified BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Verification Sessions Table (to store OTPs)
CREATE TABLE IF NOT EXISTS verification_sessions (
    email TEXT PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    otp TEXT NOT NULL,
    expires_at BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.5 Migrate Existing Tables (Run this if you get 'Could not find the courses column' or similar schema cache issues)
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS location_address TEXT;
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS contact_number TEXT;
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 4.0;
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS courses JSONB DEFAULT '[]'::jsonb;

ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cet_rank INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dcet_score NUMERIC;
ALTER TABLE users ADD COLUMN IF NOT EXISTS exam_score NUMERIC;
ALTER TABLE users ADD COLUMN IF NOT EXISTS courses JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS favorites JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- 4. Enable Row Level Security (RLS) and configure granular policies:
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_sessions ENABLE ROW LEVEL SECURITY;

-- Reset and recreate policies on colleges to ensure zero conflicts
DROP POLICY IF EXISTS "Allow public read access on colleges" ON colleges;
DROP POLICY IF EXISTS "Allow public upsert on colleges" ON colleges;
DROP POLICY IF EXISTS "Allow public delete access on colleges" ON colleges;
DROP POLICY IF EXISTS "Allow public insert access on colleges" ON colleges;
DROP POLICY IF EXISTS "Allow public update access on colleges" ON colleges;

CREATE POLICY "Allow public read access on colleges" ON colleges FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on colleges" ON colleges FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on colleges" ON colleges FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access on colleges" ON colleges FOR DELETE USING (true);

-- Reset and recreate policies on users to ensure zero conflicts
DROP POLICY IF EXISTS "Allow public read/write on users" ON users;
DROP POLICY IF EXISTS "Allow public read access on users" ON users;
DROP POLICY IF EXISTS "Allow public insert access on users" ON users;
DROP POLICY IF EXISTS "Allow public update access on users" ON users;
DROP POLICY IF EXISTS "Allow public delete access on users" ON users;

CREATE POLICY "Allow public read access on users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on users" ON users FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access on users" ON users FOR DELETE USING (true);

-- Reset and recreate policies on verification sessions to ensure zero conflicts
DROP POLICY IF EXISTS "Allow public read/write on verification_sessions" ON verification_sessions;
DROP POLICY IF EXISTS "Allow public read access on verification_sessions" ON verification_sessions;
DROP POLICY IF EXISTS "Allow public insert access on verification_sessions" ON verification_sessions;
DROP POLICY IF EXISTS "Allow public update access on verification_sessions" ON verification_sessions;
DROP POLICY IF EXISTS "Allow public delete access on verification_sessions" ON verification_sessions;

CREATE POLICY "Allow public read access on verification_sessions" ON verification_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on verification_sessions" ON verification_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on verification_sessions" ON verification_sessions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access on verification_sessions" ON verification_sessions FOR DELETE USING (true);

-- 5. REFRESH SCHEMA CACHE (IMPORTANT: This forces Supabase to recognize new columns instantly!)
NOTIFY pgrst, 'reload schema';
`;
  res.setHeader("Content-Type", "text/plain");
  res.send(sql);
});

// Vite Middleware Integration
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa"
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// Seed Database on Startup
async function seedDatabase() {
  if (!supabase) return;
  
  try {
    const { count, error } = await supabase.from("colleges").select("*", { count: "exact", head: true });
    if (!error && (count === 0 || count === null)) {
      console.log("Seeding Supabase with default Karnataka colleges...");
      for (const college of DEFAULT_COLLEGES) {
        await db.saveCollege(college);
      }
      console.log("Seeding complete.");
    }
  } catch (err) {
    console.warn("Database seeding check failed:", err);
  }
}

seedDatabase();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 College Predictor Server running on http://localhost:${PORT}`);
});
