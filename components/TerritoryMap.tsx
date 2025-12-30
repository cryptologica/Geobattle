'use client';

import { useEffect, useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { Game, TerritoryWithOwnership } from '@/lib/types';
import * as topojson from 'topojson-client';

interface TerritoryMapProps {
  game: Game;
  territories: TerritoryWithOwnership[];
  userId: string;
  onAction: () => void;
}

export function TerritoryMap({ game, territories, userId, onAction }: TerritoryMapProps) {
  const [topoData, setTopoData] = useState<any>(null);
  const [selectedTerritory, setSelectedTerritory] = useState<TerritoryWithOwnership | null>(null);
  const [actionType, setActionType] = useState<'claim' | 'attack' | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMapData();
  }, [game]);

  async function loadMapData() {
    try {
      let mapData: any = { type: 'Topology', objects: {}, arcs: [] };
      
      // Load world countries if any non-US/AU countries are enabled
      const hasOtherCountries = game.enabled_countries.some(
        (c) => c !== 'USA' && c !== 'AUS'
      );

      if (hasOtherCountries || (!game.use_us_states && game.enabled_countries.includes('USA'))) {
        const worldResponse = await fetch('/maps/world-countries.json');
        const worldData = await worldResponse.json();
        mapData = worldData;
      }

      // Load US states if enabled
      if (game.use_us_states && game.enabled_countries.includes('USA')) {
        const usResponse = await fetch('/maps/us-states.json');
        const usData = await usResponse.json();
        
        // Merge with existing map data (simplified - in production, properly merge TopoJSON)
        if (!mapData.objects.countries && usData.objects.states) {
          mapData = usData;
        }
      }

      setTopoData(mapData);
    } catch (error) {
      console.error('Error loading map data:', error);
    }
  }

  function getTerritoryByGeoId(geoId: string): TerritoryWithOwnership | undefined {
    return territories.find((t) => t.geo_id === geoId);
  }

  function getFillColor(geoId: string): string {
    const territory = getTerritoryByGeoId(geoId);
    
    if (!territory) {
      return '#e5e7eb'; // Gray for territories not in game
    }

    if (territory.is_disabled) {
      return '#9ca3af'; // Darker gray for disabled
    }

    if (!territory.ownership || !territory.ownership.user_id) {
      return '#dbeafe'; // Light blue for unclaimed
    }

    if (territory.ownership.user_id === userId) {
      return '#86efac'; // Green for owned by user
    }

    return '#fca5a5'; // Red for enemy owned
  }

  function handleTerritoryClick(geoId: string) {
    const territory = getTerritoryByGeoId(geoId);
    
    if (!territory || territory.is_disabled) {
      return;
    }

    setSelectedTerritory(territory);

    // Determine action type
    if (!territory.ownership || !territory.ownership.user_id) {
      setActionType('claim');
    } else if (territory.ownership.user_id !== userId) {
      setActionType('attack');
    } else {
      setActionType(null); // Can't attack own territory
    }
  }

  async function executeAction() {
    if (!selectedTerritory || !actionType) return;

    setLoading(true);

    try {
      const response = await fetch('/api/game/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: game.id,
          territoryId: selectedTerritory.id,
          action: actionType,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSelectedTerritory(null);
        setActionType(null);
        onAction();
      } else {
        alert(data.error || `Failed to ${actionType}`);
      }
    } catch (error) {
      console.error('Action error:', error);
      alert(`Failed to ${actionType}`);
    } finally {
      setLoading(false);
    }
  }

  if (!topoData) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Loading map...</p>
      </div>
    );
  }

  // Get the first object from the topology
  const objectKey = Object.keys(topoData.objects)[0];
  const geoData = topoData.objects[objectKey];

  return (
    <div className="relative h-full bg-white dark:bg-gray-800">
      <div className="h-full flex items-center justify-center p-4">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: game.use_us_states ? 800 : 147,
            center: game.use_us_states ? [-96, 38] : [0, 20],
          }}
          className="w-full h-full"
        >
          <Geographies geography={topoData}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const geoId = geo.id || geo.properties.name;
                const territory = getTerritoryByGeoId(String(geoId));
                
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getFillColor(String(geoId))}
                    stroke="#ffffff"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: {
                        outline: 'none',
                        fill: territory && !territory.is_disabled ? '#fbbf24' : undefined,
                        cursor: territory && !territory.is_disabled ? 'pointer' : 'default',
                      },
                      pressed: { outline: 'none' },
                    }}
                    onClick={() => handleTerritoryClick(String(geoId))}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      {/* Action Modal */}
      {selectedTerritory && actionType && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">{selectedTerritory.name}</h3>
            
            {actionType === 'claim' && (
              <div>
                <p className="mb-4">This territory is unclaimed. Would you like to claim it?</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Cost: 1 claim resource
                </p>
              </div>
            )}

            {actionType === 'attack' && (
              <div>
                <p className="mb-4">
                  This territory is owned by{' '}
                  <span className="font-semibold">
                    {selectedTerritory.ownership?.users?.name || 'another player'}
                  </span>
                  . Would you like to attack it?
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Cost: 1 attack resource
                  <br />
                  The defender will have {game.defense_window_hours} hours to respond.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedTerritory(null);
                  setActionType(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={executeAction}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded font-medium"
              >
                {loading ? 'Processing...' : actionType === 'claim' ? 'Claim' : 'Attack'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
        <h4 className="font-semibold mb-2 text-sm">Legend</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#dbeafe] border border-gray-300"></div>
            <span>Unclaimed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#86efac] border border-gray-300"></div>
            <span>Your Territory</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#fca5a5] border border-gray-300"></div>
            <span>Enemy Territory</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#9ca3af] border border-gray-300"></div>
            <span>Disabled</span>
          </div>
        </div>
      </div>
    </div>
  );
}
