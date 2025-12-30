import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServiceSupabase } from '@/lib/supabase';
import { WORLD_COUNTRIES, US_STATES, AU_STATES } from '@/lib/mapData';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      cooldownHours = 12,
      defenseWindowHours = 72,
      attacksPerDay = 1,
      claimsPerDay = 1,
      enabledCountries = [],
      useUSStates = false,
      useAUStates = false,
    } = body;

    if (!name || enabledCountries.length === 0) {
      return NextResponse.json(
        { error: 'Game name and at least one country required' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Create the game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        name,
        creator_id: session.user.id,
        cooldown_hours: cooldownHours,
        defense_window_hours: defenseWindowHours,
        attacks_per_day: attacksPerDay,
        claims_per_day: claimsPerDay,
        enabled_countries: enabledCountries,
        use_us_states: useUSStates,
        use_au_states: useAUStates,
      })
      .select()
      .single();

    if (gameError || !game) {
      console.error('Game creation error:', gameError);
      return NextResponse.json(
        { error: 'Failed to create game' },
        { status: 500 }
      );
    }

    // Add creator to user_games
    const { error: userGameError } = await supabase
      .from('user_games')
      .insert({
        user_id: session.user.id,
        game_id: game.id,
      });

    if (userGameError) {
      console.error('User game join error:', userGameError);
    }

    // Initialize creator's resources
    const { error: resourceError } = await supabase
      .from('user_game_resources')
      .insert({
        user_id: session.user.id,
        game_id: game.id,
        available_attacks: attacksPerDay,
        available_claims: claimsPerDay,
      });

    if (resourceError) {
      console.error('Resource initialization error:', resourceError);
    }

    // Seed territories
    const territories = [];

    // Add enabled countries (excluding USA and AUS if using states)
    for (const countryId of enabledCountries) {
      if (countryId === 'USA' && useUSStates) continue;
      if (countryId === 'AUS' && useAUStates) continue;

      const country = WORLD_COUNTRIES.find((c) => c.id === countryId);
      if (country) {
        territories.push({
          game_id: game.id,
          geo_id: country.id,
          name: country.name,
          type: 'country',
          parent_country: null,
        });
      }
    }

    // Add US states if enabled
    if (useUSStates && enabledCountries.includes('USA')) {
      for (const state of US_STATES) {
        territories.push({
          game_id: game.id,
          geo_id: `US-${state.id}`,
          name: state.name,
          type: 'us_state',
          parent_country: 'USA',
        });
      }
    }

    // Add AU states if enabled
    if (useAUStates && enabledCountries.includes('AUS')) {
      for (const state of AU_STATES) {
        territories.push({
          game_id: game.id,
          geo_id: `AU-${state.id}`,
          name: state.name,
          type: 'au_state',
          parent_country: 'AUS',
        });
      }
    }

    if (territories.length > 0) {
      const { error: territoriesError } = await supabase
        .from('territories')
        .insert(territories);

      if (territoriesError) {
        console.error('Territories seeding error:', territoriesError);
      }
    }

    return NextResponse.json({ game }, { status: 201 });
  } catch (error) {
    console.error('Create game error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
