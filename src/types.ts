export interface CollegeCourse {
  courseName: string;
  averagePackage: number; // in LPA (Avg Placement)
  highestPackage: number; // in LPA (Maximum Placement)
  fees: number; // in INR (College Fees)
  cutoffRank: number; // CET Cutoff
  dcetCutoffRank?: number; // DCET Rank Cutoff
  cutoffRankPreviousYear?: number;
  round: number; // 1, 2, 3
  cutoffRound?: string; // 'R1', 'R2', 'R3'
  categories: {
    name: string;
    cutoff: number;
    dcetCutoff?: number;
  }[];
}

export interface College {
  gallery?: string[];
  type?: string;
  established?: number;
  id: string;
  name: string;
  place: string;
  locationAddress: string; // location address
  website: string;
  videoUrl?: string; // Campus / Course Video or YouTube URL
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
