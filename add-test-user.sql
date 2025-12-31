-- Run this SQL in Supabase SQL Editor to create test user
-- This creates a test user that can be used for development/testing

INSERT INTO users (id, email, name, image, provider, provider_id, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test@geobattle.dev',
  'Test User',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=test',
  'test',
  'test-user-001',
  NOW(),
  NOW()
)
ON CONFLICT (provider, provider_id) 
DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  image = EXCLUDED.image,
  updated_at = NOW();

-- Verify the test user was created
SELECT id, name, email, provider FROM users WHERE provider = 'test';
