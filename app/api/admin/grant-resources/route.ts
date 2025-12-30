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
    const { gameId, userId, attacks, claims } = body;

    if (!gameId || !userId || (attacks === undefined && claims === undefined)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Verify requester is game creator
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('creator_id')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.creator_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Only game creator can grant resources' },
        { status: 403 }
      );
    }

    // Get current resources
    const { data: resources, error: resourcesError } = await supabase
      .from('user_game_resources')
      .select('available_attacks, available_claims')
      .eq('user_id', userId)
      .eq('game_id', gameId)
      .single();

    if (resourcesError || !resources) {
      return NextResponse.json(
        { error: 'User resources not found' },
        { status: 404 }
      );
    }

    // Update resources
    const updates: any = {};
    if (attacks !== undefined) {
      updates.available_attacks = Math.max(0, resources.available_attacks + attacks);
    }
    if (claims !== undefined) {
      updates.available_claims = Math.max(0, resources.available_claims + claims);
    }

    const { error: updateError } = await supabase
      .from('user_game_resources')
      .update(updates)
      .eq('user_id', userId)
      .eq('game_id', gameId);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update resources' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Grant resources error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
