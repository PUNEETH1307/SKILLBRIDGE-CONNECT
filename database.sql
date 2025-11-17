-- SkillBridge Connect Database Schema
CREATE DATABASE IF NOT EXISTS skillbridge;
USE skillbridge;
USE skillbridge;
-- ALTER TABLE workers ADD COLUMN service_areas LONGTEXT AFTER travel_radius;
-- Users table for authentication
-- ALTER TABLE workers ADD COLUMN rating DECIMAL(2,1) DEFAULT 0.0;
-- ALTER TABLE workers ADD COLUMN total_reviews INT DEFAULT 0;
CREATE TABLE IF NOT EXISTS users (
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
-- Create ratings table
CREATE TABLE IF NOT EXISTS rating (
  id INT AUTO_INCREMENT PRIMARY KEY,
  worker_id INT NOT NULL,
  user_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_worker (user_id, worker_id)
);
USE skillbridge;

-- Create certificates table
CREATE TABLE IF NOT EXISTS certificates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  worker_id INT NOT NULL,
  certificate_name VARCHAR(255) NOT NULL,
  description TEXT,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

-- Add certificate count column to workers if not exists
-- ALTER TABLE workers ADD COLUMN  certificate_count INT DEFAULT 0;


-- Update workers table to have rating and total_reviews columns
-- ALTER TABLE workers 
-- ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) DEFAULT 0.0,
-- ADD COLUMN IF NOT EXISTS total_reviews INT DEFAULT 0;

SELECT *
FROM users;
SELECT *
FROM workers;
-- Create indexes for better performance
-- CREATE INDEX idx_occupation ON workers(occupation);
-- CREATE INDEX idx_location ON workers(location);
-- CREATE INDEX idx_rating ON workers(rating);