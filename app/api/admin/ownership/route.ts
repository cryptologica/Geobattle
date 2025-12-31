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
    const { gameId, territoryId, newOwnerId } = body;

    if (!gameId || !territoryId) {
      return NextResponse.json(
        { error: 'Game ID and Territory ID required' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Verify user is game creator
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('creator_id')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    if (game.creator_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Only game creator can change ownership' },
        { status: 403 }
      );
    }

    // If newOwnerId is provided, verify the user is in the game
    if (newOwnerId) {
      const { data: userInGame } = await supabase
        .from('user_games')
        .select('id')
        .eq('game_id', gameId)
        .eq('user_id', newOwnerId)
        .single();

      if (!userInGame) {
        return NextResponse.json(
          { error: 'User is not in this game' },
          { status: 400 }
        );
      }
    }

    // Update or delete ownership
    if (newOwnerId) {
      // Check if ownership exists
      const { data: existingOwnership } = await supabase
        .from('ownership')
        .select('id')
        .eq('game_id', gameId)
        .eq('territory_id', territoryId)
        .single();

      if (existingOwnership) {
        // Update existing ownership
        const { error: updateError } = await supabase
          .from('ownership')
          .update({ user_id: newOwnerId })
          .eq('game_id', gameId)
          .eq('territory_id', territoryId);

        if (updateError) {
          console.error('Update ownership error:', updateError);
          return NextResponse.json(
            { error: 'Failed to update ownership' },
            { status: 500 }
          );
        }
      } else {
        // Create new ownership
        const { error: insertError } = await supabase
          .from('ownership')
          .insert({
            game_id: gameId,
            territory_id: territoryId,
            user_id: newOwnerId,
          });

        if (insertError) {
          console.error('Insert ownership error:', insertError);
          return NextResponse.json(
            { error: 'Failed to create ownership' },
            { status: 500 }
          );
        }
      }
    } else {
      // Remove ownership (set to unclaimed)
      const { error: deleteError } = await supabase
        .from('ownership')
        .delete()
        .eq('game_id', gameId)
        .eq('territory_id', territoryId);

      if (deleteError) {
        console.error('Delete ownership error:', deleteError);
        return NextResponse.json(
          { error: 'Failed to remove ownership' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Update ownership error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
