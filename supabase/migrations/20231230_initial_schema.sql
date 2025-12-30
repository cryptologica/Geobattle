-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT,
  name TEXT,
  image TEXT,
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_id)
);

-- Games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cooldown_hours INTEGER DEFAULT 12,
  defense_window_hours INTEGER DEFAULT 72,
  attacks_per_day INTEGER DEFAULT 1,
  claims_per_day INTEGER DEFAULT 1,
  enabled_countries TEXT[] NOT NULL,
  use_us_states BOOLEAN DEFAULT FALSE,
  use_au_states BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User games junction table with 5 game limit
CREATE TABLE user_games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, game_id)
);

-- Check constraint for max 5 games per user
CREATE OR REPLACE FUNCTION check_user_game_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM user_games WHERE user_id = NEW.user_id) >= 5 THEN
    RAISE EXCEPTION 'User cannot join more than 5 games';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_user_game_limit
BEFORE INSERT ON user_games
FOR EACH ROW
EXECUTE FUNCTION check_user_game_limit();

-- User game resources table
CREATE TABLE user_game_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  available_attacks INTEGER DEFAULT 0,
  available_claims INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, game_id)
);

-- Territories table
CREATE TABLE territories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  geo_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('country', 'us_state', 'au_state')),
  parent_country TEXT,
  is_disabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, geo_id)
);

CREATE INDEX idx_territories_game_id ON territories(game_id);
CREATE INDEX idx_territories_type ON territories(type);

-- Ownership table
CREATE TABLE ownership (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  territory_id UUID NOT NULL REFERENCES territories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, territory_id)
);

CREATE INDEX idx_ownership_game_id ON ownership(game_id);
CREATE INDEX idx_ownership_user_id ON ownership(user_id);
CREATE INDEX idx_ownership_territory_id ON ownership(territory_id);

-- Attacks table
CREATE TABLE attacks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  territory_id UUID NOT NULL REFERENCES territories(id) ON DELETE CASCADE,
  attacker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  defender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'defended', 'captured')),
  resolved_at TIMESTAMPTZ,
  CHECK (attacker_id != defender_id)
);

CREATE INDEX idx_attacks_game_id ON attacks(game_id);
CREATE INDEX idx_attacks_territory_id ON attacks(territory_id);
CREATE INDEX idx_attacks_defender_id ON attacks(defender_id);
CREATE INDEX idx_attacks_status ON attacks(status);
CREATE INDEX idx_attacks_expires_at ON attacks(expires_at);

-- Territory cooldowns table
CREATE TABLE territory_cooldowns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  territory_id UUID NOT NULL REFERENCES territories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cooldowns_user_territory ON territory_cooldowns(user_id, territory_id, game_id);
CREATE INDEX idx_cooldowns_expires_at ON territory_cooldowns(expires_at);

-- Function to auto-resolve expired attacks
CREATE OR REPLACE FUNCTION resolve_expired_attacks()
RETURNS void AS $$
BEGIN
  -- Update expired attacks to captured and transfer ownership
  WITH expired_attacks AS (
    UPDATE attacks
    SET status = 'captured',
        resolved_at = NOW()
    WHERE status = 'pending'
      AND expires_at < NOW()
    RETURNING id, game_id, territory_id, attacker_id
  )
  INSERT INTO ownership (game_id, territory_id, user_id, claimed_at, updated_at)
  SELECT game_id, territory_id, attacker_id, NOW(), NOW()
  FROM expired_attacks
  ON CONFLICT (game_id, territory_id)
  DO UPDATE SET
    user_id = EXCLUDED.user_id,
    claimed_at = EXCLUDED.claimed_at,
    updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql;

-- Function to reset daily resources
CREATE OR REPLACE FUNCTION reset_daily_resources()
RETURNS void AS $$
BEGIN
  UPDATE user_game_resources ugr
  SET 
    available_attacks = g.attacks_per_day,
    available_claims = g.claims_per_day,
    last_reset_date = CURRENT_DATE,
    updated_at = NOW()
  FROM games g
  WHERE ugr.game_id = g.id
    AND ugr.last_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to clean expired cooldowns
CREATE OR REPLACE FUNCTION clean_expired_cooldowns()
RETURNS void AS $$
BEGIN
  DELETE FROM territory_cooldowns
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ownership_updated_at BEFORE UPDATE ON ownership
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON user_game_resources
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_game_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE attacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE territory_cooldowns ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users: Users can read all, only update their own
CREATE POLICY "Users can view all users"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid()::text = id::text);

-- Games: Everyone can read, only creator can update/delete
CREATE POLICY "Anyone can view games"
  ON games FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create games"
  ON games FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Creators can update own games"
  ON games FOR UPDATE
  USING (auth.uid()::text = creator_id::text);

CREATE POLICY "Creators can delete own games"
  ON games FOR DELETE
  USING (auth.uid()::text = creator_id::text);

-- User games: Users can view all, only modify their own
CREATE POLICY "Users can view all game memberships"
  ON user_games FOR SELECT
  USING (true);

CREATE POLICY "Users can join games"
  ON user_games FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can leave games"
  ON user_games FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- Resources: Users can view all in their games, only modify own
CREATE POLICY "Users can view resources"
  ON user_game_resources FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own resources"
  ON user_game_resources FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own resources"
  ON user_game_resources FOR UPDATE
  USING (auth.uid()::text = user_id::text);

-- Territories: Everyone can view
CREATE POLICY "Anyone can view territories"
  ON territories FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create territories"
  ON territories FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Game creators can update territories"
  ON territories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = territories.game_id
        AND games.creator_id::text = auth.uid()::text
    )
  );

-- Ownership: Everyone can view
CREATE POLICY "Anyone can view ownership"
  ON ownership FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create ownership"
  ON ownership FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update ownership"
  ON ownership FOR UPDATE
  USING (true);

-- Attacks: Everyone can view, authenticated can create/update
CREATE POLICY "Anyone can view attacks"
  ON attacks FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create attacks"
  ON attacks FOR INSERT
  WITH CHECK (auth.uid()::text = attacker_id::text);

CREATE POLICY "Defenders can update attacks"
  ON attacks FOR UPDATE
  USING (auth.uid()::text = defender_id::text);

-- Cooldowns: Users can view all, system can manage
CREATE POLICY "Anyone can view cooldowns"
  ON territory_cooldowns FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create cooldowns"
  ON territory_cooldowns FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete cooldowns"
  ON territory_cooldowns FOR DELETE
  USING (true);
