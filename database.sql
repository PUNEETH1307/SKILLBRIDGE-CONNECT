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
  rating INT NOT NULL CHECK (
    rating >= 1
    AND rating <= 5
  ),
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
USE skillbridge;
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id INT NOT NULL,
  receiver_id INT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_read BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);
-- CREATE INDEX idx_sender ON messages(sender_id);
-- CREATE INDEX idx_receiver ON messages(receiver_id);
USE skillbridge;
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  worker_id INT NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
  service_description TEXT,
  total_price DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);
-- CREATE INDEX idx_booking_date ON bookings(booking_date);
-- CREATE INDEX idx_booking_status ON bookings(status);
-- Add certificate count column to workers if not exists
-- ALTER TABLE workers ADD COLUMN  certificate_count INT DEFAULT 0;
-- Update workers table to have rating and total_reviews columns
-- ALTER TABLE workers 
-- ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) DEFAULT 0.0,
-- ADD COLUMN IF NOT EXISTS total_reviews INT DEFAULT 0;
-- Admin table for platform administrators
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin',
  permissions TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
-- Disputes table
CREATE TABLE IF NOT EXISTS disputes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT,
  worker_id INT,
  user_id INT,
  description TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'open',
  resolution TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- Commission/Payments tracking
CREATE TABLE IF NOT EXISTS commissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT,
  worker_id INT,
  total_amount DECIMAL(10, 2),
  commission_percentage INT DEFAULT 10,
  commission_amount DECIMAL(10, 2),
  platform_fee DECIMAL(10, 2),
  worker_payout DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);
SELECT *
FROM users;
SELECT *
FROM workers;
select *
from certificates;
select *
from rating;
select *
from messages;
select *
from bookings;
-- Create indexes for better performance
-- CREATE INDEX idx_occupation ON workers(occupation);
-- CREATE INDEX idx_location ON workers(location);
-- CREATE INDEX idx_rating ON workers(rating);