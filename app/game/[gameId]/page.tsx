'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Game, UserGameResources, TerritoryWithOwnership, AttackWithDetails } from '@/lib/types';
import { GameHeader } from '@/components/GameHeader';
import { TerritoryMap } from '@/components/TerritoryMap';
import { AttackNotifications } from '@/components/AttackNotifications';

export default function GamePage({ params }: { params: { gameId: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [resources, setResources] = useState<UserGameResources | null>(null);
  const [territories, setTerritories] = useState<TerritoryWithOwnership[]>([]);
  const [attacks, setAttacks] = useState<AttackWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      loadGameData();
      subscribeToUpdates();
    }
  }, [session, params.gameId]);

  async function loadGameData() {
    try {
      // Load game details
      const { data: gameData } = await supabase
        .from('games')
        .select('*')
        .eq('id', params.gameId)
        .single();

      if (gameData) {
        setGame(gameData);
      }

      // Load user resources
      const { data: resourceData } = await supabase
        .from('user_game_resources')
        .select('*')
        .eq('user_id', session!.user.id)
        .eq('game_id', params.gameId)
        .single();

      if (resourceData) {
        setResources(resourceData);
      }

      // Load territories with ownership
      const { data: territoryData } = await supabase
        .from('territories')
        .select(`
          *,
          ownership (
            *,
            users (id, name, image)
          )
        `)
        .eq('game_id', params.gameId);

      if (territoryData) {
        setTerritories(territoryData as any);
      }

      // Load pending attacks on user's territories
      const { data: attackData } = await supabase
        .from('attacks')
        .select(`
          *,
          territory:territories(*),
          attacker:users!attacks_attacker_id_fkey(id, name, image),
          defender:users!attacks_defender_id_fkey(id, name, image),
          game:games(id, name)
        `)
        .eq('defender_id', session!.user.id)
        .eq('status', 'pending');

      if (attackData) {
        setAttacks(attackData as any);
      }
    } catch (error) {
      console.error('Error loading game data:', error);
    } finally {
      setLoading(false);
    }
  }

  function subscribeToUpdates() {
    // Subscribe to ownership changes
    const ownershipChannel = supabase
      .channel('ownership-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ownership',
          filter: `game_id=eq.${params.gameId}`,
        },
        () => {
          loadGameData();
        }
      )
      .subscribe();

    // Subscribe to attack changes
    const attackChannel = supabase
      .channel('attack-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attacks',
        },
        () => {
          loadGameData();
        }
      )
      .subscribe();

    // Subscribe to resource changes
    const resourceChannel = supabase
      .channel('resource-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_game_resources',
          filter: `user_id=eq.${session!.user.id}`,
        },
        () => {
          loadGameData();
        }
      )
      .subscribe();

    return () => {
      ownershipChannel.unsubscribe();
      attackChannel.unsubscribe();
      resourceChannel.unsubscribe();
    };
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading game...</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">Game not found</p>
          <button
            onClick={() => router.push('/lobby')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <GameHeader gameName={game.name} gameId={game.id} resources={resources} />
      
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto">
          <TerritoryMap
            game={game}
            territories={territories}
            userId={session!.user.id}
            onAction={loadGameData}
          />
        </div>
        
        <AttackNotifications
          attacks={attacks}
          onDefend={loadGameData}
        />
      </div>
    </div>
  );
}
