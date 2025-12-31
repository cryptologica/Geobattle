import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { gameId } = body;

    if (!gameId) {
      return NextResponse.json(
        { error: 'Game ID required' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Check if user is already in 5 games
    const { data: userGames, error: countError } = await supabase
      .from('user_games')
      .select('id')
      .eq('user_id', session.user.id);

    if (countError) {
      console.error('Error checking user games:', countError);
      return NextResponse.json(
        { error: 'Failed to check game limit' },
        { status: 500 }
      );
    }

    if (userGames && userGames.length >= 5) {
      return NextResponse.json(
        { error: 'Cannot join more than 5 games' },
        { status: 400 }
      );
    }

    // Check if user is already in this game
    const { data: existing } = await supabase
      .from('user_games')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('game_id', gameId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Already in this game' },
        { status: 400 }
      );
    }

    // Get game details for resource initialization
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('attacks_per_day, claims_per_day')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Add user to game
    const { error: joinError } = await supabase
      .from('user_games')
      .insert({
        user_id: session.user.id,
        game_id: gameId,
      });

    if (joinError) {
      console.error('Join game error:', joinError);
      return NextResponse.json(
        { error: 'Failed to join game' },
        { status: 500 }
      );
    }

    // Initialize user's resources with full daily allowance
    const { error: resourceError } = await supabase
      .from('user_game_resources')
      .insert({
        user_id: session.user.id,
        game_id: gameId,
        available_attacks: game.attacks_per_day,
        available_claims: game.claims_per_day,
      });

    if (resourceError) {
      console.error('Resource initialization error:', resourceError);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Join game error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');
    const deleteGame = searchParams.get('deleteGame') === 'true';

    if (!gameId) {
      return NextResponse.json(
        { error: 'Game ID required' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

    // Check how many players are in the game
    const { data: playerCount, error: countError } = await supabase
      .from('user_games')
      .select('user_id', { count: 'exact' })
      .eq('game_id', gameId);

    if (countError) {
      console.error('Error checking player count:', countError);
      return NextResponse.json(
        { error: 'Failed to check player count' },
        { status: 500 }
      );
    }

    const playersInGame = playerCount?.length || 0;
    
    // Check if only test user will remain (in development)
    const onlyTestUserRemains = 
      process.env.NODE_ENV === 'development' &&
      playersInGame === 2 &&
      playerCount?.some(p => p.user_id === TEST_USER_ID);

    // If this is the last player (or only test user remains) and no delete confirmation, ask for confirmation
    if ((playersInGame === 1 || onlyTestUserRemains) && !deleteGame) {
      return NextResponse.json(
        { 
          requiresConfirmation: true,
          message: playersInGame === 1 
            ? 'You are the last player in this game. Leaving will delete the game permanently.'
            : 'Only the test user will remain in this game. Leaving will delete the game permanently.'
        },
        { status: 200 }
      );
    }

    // Remove user from game
    const { error } = await supabase
      .from('user_games')
      .delete()
      .eq('user_id', session.user.id)
      .eq('game_id', gameId);

    if (error) {
      console.error('Leave game error:', error);
      return NextResponse.json(
        { error: 'Failed to leave game' },
        { status: 500 }
      );
    }

    // If this was the last player or only test user remains, delete the game
    const shouldDeleteGame = playersInGame === 1 || onlyTestUserRemains;
    
    if (shouldDeleteGame) {
      const { error: deleteError } = await supabase
        .from('games')
        .delete()
        .eq('id', gameId);

      if (deleteError) {
        console.error('Error deleting game:', deleteError);
        // Don't return error since user was already removed
      }
    }

    return NextResponse.json({ success: true, gameDeleted: shouldDeleteGame }, { status: 200 });
  } catch (error) {
    console.error('Leave game error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
