-- Create test user for development
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
ON CONFLICT (provider, provider_id) DO NOTHING;
