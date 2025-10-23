-- SkillBridge Connect Database Schema
CREATE DATABASE IF NOT EXISTS skillbridge;
USE skillbridge;
-- Users table for authentication
CREATE TABLE  IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Workers table for storing worker profiles
CREATE TABLE IF NOT EXISTS workers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    occupation VARCHAR(100) NOT NULL,
    experience VARCHAR(20) NOT NULL,
    specialties TEXT,
    hourly_rate INT NOT NULL,
    available_hours VARCHAR(50),
    location VARCHAR(255) NOT NULL,
    travel_radius VARCHAR(20),
    work_areas TEXT,
    description TEXT,
    certifications TEXT,
    verified BOOLEAN DEFAULT FALSE,
    rating DECIMAL(3, 2) DEFAULT 0.0,
    reviews_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
SELECT * FROM users;
SELECT * FROM workers;

-- Create indexes for better performance
-- CREATE INDEX idx_occupation ON workers(occupation);
-- CREATE INDEX idx_location ON workers(location);
-- CREATE INDEX idx_rating ON workers(rating);