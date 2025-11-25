-- ============================================
-- SKILLBRIDGE CONNECT - RESET DATABASE SCRIPT
-- This will clear all data and reset auto-increment counters
-- ============================================
USE skillbridge;
-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;
-- Clear all tables in the correct order (respecting foreign keys)
TRUNCATE TABLE certificates;
TRUNCATE TABLE bookings;
TRUNCATE TABLE rating;
TRUNCATE TABLE workers;
TRUNCATE TABLE users;
-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
-- Confirm reset
SELECT 'Database reset complete!' as status;
SELECT COUNT(*) as users_count
FROM users;
SELECT COUNT(*) as workers_count
FROM workers;
SELECT COUNT(*) as bookings_count
FROM bookings;
SELECT COUNT(*) as ratings_count
FROM rating;
SELECT COUNT(*) as certificates_count
FROM certificates;