// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          name: string | null;
          image: string | null;
          provider: string;
          provider_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email?: string | null;
          name?: string | null;
          image?: string | null;
          provider: string;
          provider_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          name?: string | null;
          image?: string | null;
          provider?: string;
          provider_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      games: {
        Row: {
          id: string;
          name: string;
          creator_id: string;
          cooldown_hours: number;
          defense_window_hours: number;
          attacks_per_day: number;
          claims_per_day: number;
          enabled_countries: string[];
          use_us_states: boolean;
          use_au_states: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          creator_id: string;
          cooldown_hours?: number;
          defense_window_hours?: number;
          attacks_per_day?: number;
          claims_per_day?: number;
          enabled_countries: string[];
          use_us_states?: boolean;
          use_au_states?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          creator_id?: string;
          cooldown_hours?: number;
          defense_window_hours?: number;
          attacks_per_day?: number;
          claims_per_day?: number;
          enabled_countries?: string[];
          use_us_states?: boolean;
          use_au_states?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_games: {
        Row: {
          id: string;
          user_id: string;
          game_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          game_id: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          game_id?: string;
          joined_at?: string;
        };
      };
      user_game_resources: {
        Row: {
          id: string;
          user_id: string;
          game_id: string;
          available_attacks: number;
          available_claims: number;
          last_reset_date: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          game_id: string;
          available_attacks?: number;
          available_claims?: number;
          last_reset_date?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          game_id?: string;
          available_attacks?: number;
          available_claims?: number;
          last_reset_date?: string;
          updated_at?: string;
        };
      };
      territories: {
        Row: {
          id: string;
          game_id: string;
          geo_id: string;
          name: string;
          type: 'country' | 'us_state' | 'au_state';
          parent_country: string | null;
          is_disabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          geo_id: string;
          name: string;
          type: 'country' | 'us_state' | 'au_state';
          parent_country?: string | null;
          is_disabled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          geo_id?: string;
          name?: string;
          type?: 'country' | 'us_state' | 'au_state';
          parent_country?: string | null;
          is_disabled?: boolean;
          created_at?: string;
        };
      };
      ownership: {
        Row: {
          id: string;
          game_id: string;
          territory_id: string;
          user_id: string;
          claimed_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          territory_id: string;
          user_id: string;
          claimed_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          territory_id?: string;
          user_id?: string;
          claimed_at?: string;
          updated_at?: string;
        };
      };
      attacks: {
        Row: {
          id: string;
          game_id: string;
          territory_id: string;
          attacker_id: string;
          defender_id: string;
          initiated_at: string;
          expires_at: string;
          status: 'pending' | 'defended' | 'captured';
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          game_id: string;
          territory_id: string;
          attacker_id: string;
          defender_id: string;
          initiated_at?: string;
          expires_at: string;
          status?: 'pending' | 'defended' | 'captured';
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          game_id?: string;
          territory_id?: string;
          attacker_id?: string;
          defender_id?: string;
          initiated_at?: string;
          expires_at?: string;
          status?: 'pending' | 'defended' | 'captured';
          resolved_at?: string | null;
        };
      };
      territory_cooldowns: {
        Row: {
          id: string;
          game_id: string;
          territory_id: string;
          user_id: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          territory_id: string;
          user_id: string;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          territory_id?: string;
          user_id?: string;
          expires_at?: string;
          created_at?: string;
        };
      };
    };
  };
}

// Helper types
export type User = Database['public']['Tables']['users']['Row'];
export type Game = Database['public']['Tables']['games']['Row'];
export type UserGame = Database['public']['Tables']['user_games']['Row'];
export type UserGameResources = Database['public']['Tables']['user_game_resources']['Row'];
export type Territory = Database['public']['Tables']['territories']['Row'];
export type Ownership = Database['public']['Tables']['ownership']['Row'];
export type Attack = Database['public']['Tables']['attacks']['Row'];
export type TerritoryCooldown = Database['public']['Tables']['territory_cooldowns']['Row'];

// Extended types for joined data
export type TerritoryWithOwnership = Territory & {
  ownership?: Array<{
    user_id: string;
    users?: User;
  }>;
};

export type AttackWithDetails = Attack & {
  territory?: Territory;
  attacker?: User;
  defender?: User;
  game?: Game;
};

export type GameWithCreator = Game & {
  creator?: User;
  player_count?: number;
};
