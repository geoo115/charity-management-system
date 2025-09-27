-- Initialize the database with basic structure
-- This is a minimal init script for development/testing

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create basic test users for load testing
-- Password: password123 (hashed with bcrypt)
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, email_verified, created_at, updated_at) VALUES
('test1@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'User1', 'visitor', true, true, NOW(), NOW()),
('test2@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'User2', 'donor', true, true, NOW(), NOW()),
('test3@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'User3', 'volunteer', true, true, NOW(), NOW()),
('stress1@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Stress', 'User1', 'visitor', true, true, NOW(), NOW()),
('stress2@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Stress', 'User2', 'donor', true, true, NOW(), NOW()),
('spike1@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Spike', 'User1', 'visitor', true, true, NOW(), NOW()),
('spike2@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Spike', 'User2', 'volunteer', true, true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Create some sample help requests for testing
INSERT INTO help_requests (user_id, category, priority, title, description, location, postcode, status, created_at, updated_at) VALUES
((SELECT id FROM users WHERE email = 'test1@example.com'), 'food_assistance', 'medium', 'Need food support', 'Family needs emergency food assistance', 'London', 'SE13 5AB', 'pending', NOW() - INTERVAL '2 days', NOW()),
((SELECT id FROM users WHERE email = 'stress1@example.com'), 'general_support', 'high', 'Housing assistance', 'Need help with temporary accommodation', 'London', 'SE13 6CD', 'pending', NOW() - INTERVAL '1 day', NOW()),
((SELECT id FROM users WHERE email = 'spike1@example.com'), 'food_assistance', 'urgent', 'Emergency food needed', 'Urgent food assistance required', 'London', 'SE13 7EF', 'assigned', NOW() - INTERVAL '3 hours', NOW())
ON CONFLICT DO NOTHING;

-- Create some sample donations for testing
INSERT INTO donations (donor_id, donation_type, amount, currency, payment_method, status, created_at) VALUES
((SELECT id FROM users WHERE email = 'test2@example.com'), 'monetary', 50.00, 'GBP', 'card', 'completed', NOW() - INTERVAL '1 week'),
((SELECT id FROM users WHERE email = 'stress2@example.com'), 'monetary', 25.00, 'GBP', 'card', 'completed', NOW() - INTERVAL '3 days'),
((SELECT id FROM users WHERE email = 'test2@example.com'), 'monetary', 100.00, 'GBP', 'card', 'completed', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- Print success message
\echo 'Database initialized successfully with test data for load testing';