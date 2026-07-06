export interface CollegeCourse {
  courseName: string;
  averagePackage: number; // in LPA
  highestPackage: number; // in LPA
  fees: number; // in INR (College Fees)
  cutoffRank: number;
  cutoffRankPreviousYear?: number;
  categoryCutoffs?: Record<string, number>; // e.g., { "GM": 5000, "SC": 12000, "KKR": 8000 }
}

export interface College {
  id: string;
  name: string;
  place: string;
  locationAddress: string; // location address
  website: string;
  images: string[]; // 5 images of campus (can be edited by faculty)
  rating?: number;
  courses: CollegeCourse[];
  details: string;
  contactNumber: string;
  // Summary properties for backward compatibility
  course?: string;
  fees?: number;
  averagePackage?: number;
  highestPackage?: number;
}

export interface StudentProfile {
  email: string;
  firstName: string;
  lastName: string;
  cetRank?: number;
  dcetScore?: number;
  examScore?: number;
  courses: string[]; // selected courses
  favorites: string[]; // list of college IDs
  isVerified: boolean;
}

export interface VerificationSession {
  email: string;
  firstName: string;
  lastName: string;
  otp: string;
  expiresAt: number;
}
