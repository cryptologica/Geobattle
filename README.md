# GeoBattle - Territory Control Game

A real-time multiplayer territory control game built with Next.js, React-Simple-Maps, Supabase, and NextAuth.js.

## Features

- **Multi-Game Support**: Join up to 5 concurrent games
- **Customizable Maps**: Select countries and enable sub-regions (US States, Australian States)
- **Resource System**: Attack and claim resources with daily replenishment
- **Real-Time Updates**: Live territory ownership changes and attack notifications
- **OAuth Authentication**: Login with Twitch or Discord
- **Attack/Defense Mechanics**: Contested attacks with 3-day defense windows
- **Admin Controls**: Game creators can manage territories and grant resources

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   Copy `.env.example` to `.env.local` and fill in your credentials:
   - Supabase project URL and keys
   - NextAuth secret (generate with `openssl rand -base64 32`)
   - Twitch OAuth credentials
   - Discord OAuth credentials

3. **Set Up Supabase**
   - Create a new Supabase project
   - Run the SQL migration in `supabase/migrations/initial-schema.sql`
   - Enable Realtime for relevant tables

4. **Run Development Server**
   ```bash
   npm run dev
   ```

5. **Open** [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Maps**: React-Simple-Maps, TopoJSON
- **Database**: Supabase (PostgreSQL)
- **Authentication**: NextAuth.js with Twitch provider
- **Real-Time**: Supabase Realtime
- **Deployment**: Vercel

## Game Mechanics

- **Claim**: Use claim resources to take ownership of unclaimed territories
- **Attack**: Use attack resources to contest enemy territories
- **Defend**: Free action to cancel incoming attacks within defense window
- **Cooldowns**: Per-territory cooldowns prevent spam (default 12 hours)
- **Resources**: Daily reset at UTC midnight (default 1 attack, 1 claim per day)

## Project Structure

```
/app
  /api
    /auth - NextAuth.js routes
    /game - Game action endpoints
    /admin - Admin control endpoints
  /lobby - Game lobby and creation
  /game - Main game interface
  /admin - Admin panel
/components
  - TerritoryMap.tsx
  - GameHeader.tsx
  - AttackNotifications.tsx
/lib
  - supabase.ts
  - types.ts
/public/maps
  - TopoJSON map data files
```

## License

MIT
