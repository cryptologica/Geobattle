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

    if (!gameId) {
      return NextResponse.json(
        { error: 'Game ID required' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

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

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Leave game error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
