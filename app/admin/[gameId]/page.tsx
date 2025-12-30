'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Game, Territory, UserGameResources } from '@/lib/types';
import Link from 'next/link';
import { Shield, Swords, Star } from 'lucide-react';

interface PlayerResources {
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
  resources: UserGameResources;
}

export default function AdminPage({ params }: { params: { gameId: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [players, setPlayers] = useState<PlayerResources[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      loadAdminData();
    }
  }, [session, params.gameId]);

  async function loadAdminData() {
    try {
      // Load game
      const { data: gameData } = await supabase
        .from('games')
        .select('*')
        .eq('id', params.gameId)
        .single();

      if (gameData) {
        setGame(gameData);
        setIsCreator(gameData.creator_id === session!.user.id);
      }

      // Load players and resources
      const { data: userGames } = await supabase
        .from('user_games')
        .select(`
          user_id,
          users (id, name, email)
        `)
        .eq('game_id', params.gameId);

      if (userGames) {
        const playerIds = userGames.map((ug: any) => ug.user_id);
        
        const { data: resourcesData } = await supabase
          .from('user_game_resources')
          .select('*')
          .eq('game_id', params.gameId)
          .in('user_id', playerIds);

        const playersWithResources = userGames.map((ug: any) => ({
          user: ug.users,
          resources: resourcesData?.find((r) => r.user_id === ug.user_id) || null,
        }));

        setPlayers(playersWithResources);
      }

      // Load territories
      const { data: territoriesData } = await supabase
        .from('territories')
        .select('*')
        .eq('game_id', params.gameId)
        .order('name');

      if (territoriesData) {
        setTerritories(territoriesData);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function grantResources(userId: string, attacks: number, claims: number) {
    try {
      const response = await fetch('/api/admin/grant-resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: params.gameId,
          userId,
          attacks,
          claims,
        }),
      });

      if (response.ok) {
        loadAdminData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to grant resources');
      }
    } catch (error) {
      console.error('Grant error:', error);
      alert('Failed to grant resources');
    }
  }

  async function toggleTerritory(territoryId: string, currentDisabled: boolean) {
    try {
      const response = await fetch('/api/admin/territories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: params.gameId,
          territoryId,
          isDisabled: !currentDisabled,
        }),
      });

      if (response.ok) {
        loadAdminData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update territory');
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update territory');
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">Game not found</p>
          <Link
            href="/lobby"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
          >
            Back to Lobby
          </Link>
        </div>
      </div>
    );
  }

  if (!isCreator) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-600" />
          <p className="text-xl mb-4">Access Denied</p>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Only the game creator can access this page
          </p>
          <Link
            href={`/game/${params.gameId}`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded inline-block"
          >
            Back to Game
          </Link>
        </div>
      </div>
    );
  }

  const filteredTerritories = territories.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-gray-600 dark:text-gray-400">{game.name}</p>
          </div>
          <Link
            href={`/game/${params.gameId}`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
          >
            Back to Game
          </Link>
        </div>

        {/* Players Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Players ({players.length})</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Player</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    <div className="flex items-center gap-2">
                      <Swords className="w-4 h-4 text-red-600" />
                      Attacks
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-blue-600" />
                      Claims
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {players.map((player) => (
                  <tr key={player.user.id}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{player.user.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {player.user.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {player.resources?.available_attacks ?? 0}
                    </td>
                    <td className="px-6 py-4">
                      {player.resources?.available_claims ?? 0}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => grantResources(player.user.id, 1, 0)}
                          className="text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                          title="Grant 1 attack"
                        >
                          +1 Attack
                        </button>
                        <button
                          onClick={() => grantResources(player.user.id, 0, 1)}
                          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                          title="Grant 1 claim"
                        >
                          +1 Claim
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Territories Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">
              Territories ({territories.length})
            </h2>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search territories..."
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Territory</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Type</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredTerritories.map((territory) => (
                    <tr key={territory.id}>
                      <td className="px-6 py-4 font-medium">{territory.name}</td>
                      <td className="px-6 py-4 text-sm capitalize">
                        {territory.type.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4">
                        {territory.is_disabled ? (
                          <span className="text-sm bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-2 py-1 rounded">
                            Disabled
                          </span>
                        ) : (
                          <span className="text-sm bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded">
                            Enabled
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleTerritory(territory.id, territory.is_disabled)}
                          className={`text-sm px-3 py-1 rounded ${
                            territory.is_disabled
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'bg-gray-600 hover:bg-gray-700 text-white'
                          }`}
                        >
                          {territory.is_disabled ? 'Enable' : 'Disable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
