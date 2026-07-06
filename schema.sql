-- Schema for RankToCollege Database

-- Table to store college information
CREATE TABLE colleges (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    place VARCHAR(150) NOT NULL,
    location_address TEXT NOT NULL,
    website VARCHAR(255) NOT NULL,
    contact_number VARCHAR(50) NOT NULL,
    images TEXT[] NOT NULL, -- Array of 5 image URLs editable by faculty
    rating DECIMAL(2,1) DEFAULT 4.0,
    details TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to store courses associated with each college
CREATE TABLE college_courses (
    id SERIAL PRIMARY KEY,
    college_id VARCHAR(100) REFERENCES colleges(id) ON DELETE CASCADE,
    course_name VARCHAR(150) NOT NULL,
    average_package DECIMAL(5,2) NOT NULL, -- in LPA
    highest_package DECIMAL(5,2) NOT NULL, -- in LPA
    fees INTEGER NOT NULL, -- College Fees in INR
    cutoff_rank INTEGER NOT NULL, -- Current year cutoff
    cutoff_rank_previous_year INTEGER -- Previous year cutoff
);

-- Table to store registered students
CREATE TABLE users (
    email VARCHAR(255) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    cet_rank INTEGER,
    dcet_score INTEGER,
    exam_score INTEGER,
    courses VARCHAR(150)[] DEFAULT '{}',
    favorites VARCHAR(100)[] DEFAULT '{}',
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance tuning
CREATE INDEX idx_colleges_name ON colleges(name);
CREATE INDEX idx_college_courses_rank ON college_courses(cutoff_rank);
CREATE INDEX idx_college_courses_fees ON college_courses(fees);
