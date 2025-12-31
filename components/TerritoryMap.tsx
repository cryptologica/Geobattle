'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { Game, TerritoryWithOwnership } from '@/lib/types';
import * as topojson from 'topojson-client';

interface TerritoryMapProps {
  game: Game;
  territories: TerritoryWithOwnership[];
  userId: string;
  players: Array<{ id: string; name: string; image: string }>;
  onAction: () => void;
}

export function TerritoryMap({ game, territories, userId, players, onAction }: TerritoryMapProps) {
  const [topoData, setTopoData] = useState<any>(null);
  const [selectedTerritory, setSelectedTerritory] = useState<TerritoryWithOwnership | null>(null);
  const [actionType, setActionType] = useState<'claim' | 'attack' | null>(null);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ coordinates: [0, 0], zoom: 1 });

  function handleMoveEnd(position: any) {
    setPosition(position);
  }

  useEffect(() => {
    loadMapData();
  }, [game?.use_us_states, game?.use_au_states, game?.enabled_countries?.join(',')]);

  async function loadMapData() {
    try {
      const allGeographies: any[] = [];
      
      // Load world countries if any non-US/AU countries are enabled
      const hasOtherCountries = game.enabled_countries.some(
        (c) => c !== 'USA' && c !== 'AUS'
      );

      if (hasOtherCountries || (!game.use_us_states && game.enabled_countries.includes('USA')) || (!game.use_au_states && game.enabled_countries.includes('AUS'))) {
        const worldResponse = await fetch('/maps/world-countries.json');
        const worldData = await worldResponse.json();
        const worldFeatures = topojson.feature(worldData, worldData.objects.countries) as any;
        allGeographies.push(...worldFeatures.features);
      }

      // Load US states if enabled
      if (game.use_us_states && game.enabled_countries.includes('USA')) {
        const usResponse = await fetch('/maps/us-states.json');
        const usData = await usResponse.json();
        const usFeatures = topojson.feature(usData, usData.objects.states) as any;
        allGeographies.push(...usFeatures.features);
      }

      // Load Australian states if enabled
      if (game.use_au_states && game.enabled_countries.includes('AUS')) {
        const auResponse = await fetch('/maps/au-states.json');
        const auData = await auResponse.json();
        const auFeatures = topojson.feature(auData, auData.objects.states) as any;
        allGeographies.push(...auFeatures.features);
      }

      // Create a FeatureCollection with all geographies
      const combinedData = {
        type: 'FeatureCollection',
        features: allGeographies
      };

      setTopoData(combinedData);
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

    // Ownership comes as an array from Supabase relationship
    const ownership = Array.isArray(territory.ownership) && territory.ownership.length > 0 
      ? territory.ownership[0] 
      : null;

    if (!ownership || !ownership.user_id) {
      return '#dbeafe'; // Light blue for unclaimed
    }

    // Use pattern fill for owned territories
    return `url(#pattern-${ownership.user_id})`;
  }

  function handleTerritoryClick(geoId: string) {
    const territory = getTerritoryByGeoId(geoId);
    
    if (!territory || territory.is_disabled) {
      return;
    }

    setSelectedTerritory(territory);

    // Ownership comes as an array from Supabase relationship
    const ownership = Array.isArray(territory.ownership) && territory.ownership.length > 0 
      ? territory.ownership[0] 
      : null;

    // Determine action type
    if (!ownership || !ownership.user_id) {
      setActionType('claim');
    } else if (ownership.user_id !== userId) {
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

  // Calculate projection config based on enabled territories
  const getProjectionConfig = () => {
    if (game.use_us_states && !game.use_au_states && !hasOtherCountries) {
      return { scale: 800, center: [-96, 38] as [number, number] };
    }
    if (game.use_au_states && !game.use_us_states && !hasOtherCountries) {
      return { scale: 800, center: [133, -27] as [number, number] };
    }
    return { scale: 147, center: [0, 20] as [number, number] };
  };

  const hasOtherCountries = game.enabled_countries.some(
    (c) => c !== 'USA' && c !== 'AUS'
  );

  function handleZoomIn() {
    if (position.zoom >= 4) return;
    setPosition(pos => ({ ...pos, zoom: pos.zoom * 1.5 }));
  }

  function handleZoomOut() {
    if (position.zoom <= 1) return;
    setPosition(pos => ({ ...pos, zoom: pos.zoom / 1.5 }));
  }

  return (
    <div className="relative h-full bg-white dark:bg-gray-800">
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded shadow-lg"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded shadow-lg"
          title="Zoom Out"
        >
          −
        </button>
      </div>

      <div className="h-full flex items-center justify-center p-4">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={getProjectionConfig()}
          className="w-full h-full"
        >
          <defs>
            {players.map((player) => (
              <pattern
                key={player.id}
                id={`pattern-${player.id}`}
                patternUnits="userSpaceOnUse"
                width="5"
                height="5"
              >
                <image
                  href={player.image}
                  x="0"
                  y="0"
                  width="5"
                  height="5"
                  preserveAspectRatio="xMidYMid slice"
                />
              </pattern>
            ))}
          </defs>
          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates as [number, number]}
            onMoveEnd={handleMoveEnd}
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
          </ZoomableGroup>
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
      <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-h-[60vh] overflow-y-auto">
        <h4 className="font-semibold mb-2 text-sm">Legend</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#dbeafe] border border-gray-300"></div>
            <span>Unclaimed</span>
          </div>
          {players.map((player) => (
            <div key={player.id} className="flex items-center gap-2">
              <img
                src={player.image}
                alt={player.name}
                className="w-4 h-4 rounded-sm border border-gray-300 object-cover"
              />
              <span className={player.id === userId ? 'font-bold' : ''}>
                {player.name} {player.id === userId ? '(You)' : ''}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#9ca3af] border border-gray-300"></div>
            <span>Disabled</span>
          </div>
        </div>
      </div>
    </div>
  );
}
