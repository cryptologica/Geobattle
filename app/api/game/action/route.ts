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
    const { gameId, territoryId, action } = body;

    if (!gameId || !territoryId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Get game settings
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('cooldown_hours, defense_window_hours')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Get territory details
    const { data: territory, error: territoryError } = await supabase
      .from('territories')
      .select('id, is_disabled, game_id')
      .eq('id', territoryId)
      .eq('game_id', gameId)
      .single();

    if (territoryError || !territory) {
      return NextResponse.json({ error: 'Territory not found' }, { status: 404 });
    }

    if (territory.is_disabled) {
      return NextResponse.json(
        { error: 'Territory is disabled' },
        { status: 400 }
      );
    }

    // Check for active cooldown
    const { data: cooldown } = await supabase
      .from('territory_cooldowns')
      .select('expires_at')
      .eq('user_id', session.user.id)
      .eq('territory_id', territoryId)
      .eq('game_id', gameId)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cooldown && action !== 'defend') {
      return NextResponse.json(
        { error: 'Territory is on cooldown' },
        { status: 400 }
      );
    }

    if (action === 'claim') {
      return await handleClaim(supabase, session.user.id, gameId, territoryId, game.cooldown_hours);
    } else if (action === 'attack') {
      return await handleAttack(supabase, session.user.id, gameId, territoryId, game.cooldown_hours, game.defense_window_hours);
    } else if (action === 'defend') {
      return await handleDefend(supabase, session.user.id, gameId, territoryId);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Game action error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleClaim(supabase: any, userId: string, gameId: string, territoryId: string, cooldownHours: number) {
  // Check if territory is already owned
  const { data: existingOwnership } = await supabase
    .from('ownership')
    .select('id')
    .eq('game_id', gameId)
    .eq('territory_id', territoryId)
    .single();

  if (existingOwnership) {
    return NextResponse.json(
      { error: 'Territory already owned' },
      { status: 400 }
    );
  }

  // Check claim resources
  const { data: resources, error: resourceError } = await supabase
    .from('user_game_resources')
    .select('available_claims')
    .eq('user_id', userId)
    .eq('game_id', gameId)
    .single();

  if (resourceError || !resources || resources.available_claims <= 0) {
    return NextResponse.json(
      { error: 'Insufficient claim resources' },
      { status: 400 }
    );
  }

  // Deduct claim resource
  const { error: deductError } = await supabase
    .from('user_game_resources')
    .update({ available_claims: resources.available_claims - 1 })
    .eq('user_id', userId)
    .eq('game_id', gameId);

  if (deductError) {
    return NextResponse.json(
      { error: 'Failed to deduct resources' },
      { status: 500 }
    );
  }

  // Create ownership
  const { error: ownershipError } = await supabase
    .from('ownership')
    .insert({
      game_id: gameId,
      territory_id: territoryId,
      user_id: userId,
    });

  if (ownershipError) {
    return NextResponse.json(
      { error: 'Failed to claim territory' },
      { status: 500 }
    );
  }

  // Add cooldown
  const cooldownExpiry = new Date();
  cooldownExpiry.setHours(cooldownExpiry.getHours() + cooldownHours);

  await supabase
    .from('territory_cooldowns')
    .insert({
      game_id: gameId,
      territory_id: territoryId,
      user_id: userId,
      expires_at: cooldownExpiry.toISOString(),
    });

  return NextResponse.json({ success: true, action: 'claim' }, { status: 200 });
}

async function handleAttack(supabase: any, userId: string, gameId: string, territoryId: string, cooldownHours: number, defenseWindowHours: number) {
  // Get current owner
  const { data: ownership, error: ownershipError } = await supabase
    .from('ownership')
    .select('user_id')
    .eq('game_id', gameId)
    .eq('territory_id', territoryId)
    .single();

  if (ownershipError || !ownership) {
    return NextResponse.json(
      { error: 'Territory is not owned' },
      { status: 400 }
    );
  }

  if (ownership.user_id === userId) {
    return NextResponse.json(
      { error: 'Cannot attack own territory' },
      { status: 400 }
    );
  }

  // Check for existing pending attack
  const { data: existingAttack } = await supabase
    .from('attacks')
    .select('id')
    .eq('game_id', gameId)
    .eq('territory_id', territoryId)
    .eq('status', 'pending')
    .single();

  if (existingAttack) {
    return NextResponse.json(
      { error: 'Territory already under attack' },
      { status: 400 }
    );
  }

  // Check attack resources
  const { data: resources, error: resourceError } = await supabase
    .from('user_game_resources')
    .select('available_attacks')
    .eq('user_id', userId)
    .eq('game_id', gameId)
    .single();

  if (resourceError || !resources || resources.available_attacks <= 0) {
    return NextResponse.json(
      { error: 'Insufficient attack resources' },
      { status: 400 }
    );
  }

  // Deduct attack resource
  const { error: deductError } = await supabase
    .from('user_game_resources')
    .update({ available_attacks: resources.available_attacks - 1 })
    .eq('user_id', userId)
    .eq('game_id', gameId);

  if (deductError) {
    return NextResponse.json(
      { error: 'Failed to deduct resources' },
      { status: 500 }
    );
  }

  // Create attack
  const attackExpiry = new Date();
  attackExpiry.setHours(attackExpiry.getHours() + defenseWindowHours);

  const { error: attackError } = await supabase
    .from('attacks')
    .insert({
      game_id: gameId,
      territory_id: territoryId,
      attacker_id: userId,
      defender_id: ownership.user_id,
      expires_at: attackExpiry.toISOString(),
    });

  if (attackError) {
    return NextResponse.json(
      { error: 'Failed to initiate attack' },
      { status: 500 }
    );
  }

  // Add cooldown
  const cooldownExpiry = new Date();
  cooldownExpiry.setHours(cooldownExpiry.getHours() + cooldownHours);

  await supabase
    .from('territory_cooldowns')
    .insert({
      game_id: gameId,
      territory_id: territoryId,
      user_id: userId,
      expires_at: cooldownExpiry.toISOString(),
    });

  return NextResponse.json({ success: true, action: 'attack' }, { status: 200 });
}

async function handleDefend(supabase: any, userId: string, gameId: string, territoryId: string) {
  // Get pending attack where user is defender
  const { data: attack, error: attackError } = await supabase
    .from('attacks')
    .select('id')
    .eq('game_id', gameId)
    .eq('territory_id', territoryId)
    .eq('defender_id', userId)
    .eq('status', 'pending')
    .single();

  if (attackError || !attack) {
    return NextResponse.json(
      { error: 'No pending attack found' },
      { status: 404 }
    );
  }

  // Update attack status to defended
  const { error: updateError } = await supabase
    .from('attacks')
    .update({
      status: 'defended',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', attack.id);

  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to defend territory' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, action: 'defend' }, { status: 200 });
}
