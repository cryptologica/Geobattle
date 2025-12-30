import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServiceSupabase } from '@/lib/supabase';

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { gameId, territoryId, isDisabled } = body;

    if (!gameId || !territoryId || isDisabled === undefined) {
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
        { error: 'Only game creator can modify territories' },
        { status: 403 }
      );
    }

    // Update territory
    const { error: updateError } = await supabase
      .from('territories')
      .update({ is_disabled: isDisabled })
      .eq('id', territoryId)
      .eq('game_id', gameId);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update territory' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Update territory error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
