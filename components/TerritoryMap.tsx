'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { Game, TerritoryWithOwnership } from '@/lib/types';
import * as topojson from 'topojson-client';
import Modal from './Modal';

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
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'error' | 'success';
    message: string;
  }>({
    isOpen: false,
    type: 'error',
    message: '',
  });

  function handleMoveEnd(position: any) {
    setPosition(position);
  }

  useEffect(() => {
    loadMapData();
  }, [game?.use_us_states, game?.use_au_states, game?.enabled_countries?.join(',')]);

  async function loadMapData() {
    try {
      const allGeographies: any[] = [];
      
      // Always load world countries map (we'll use is_disabled flag to control visibility)
      const worldResponse = await fetch('/maps/world-countries.json');
      const worldData = await worldResponse.json();
      const worldFeatures = topojson.feature(worldData, worldData.objects.countries) as any;
      allGeographies.push(...worldFeatures.features);

      // Load US states if game has use_us_states enabled
      if (game.use_us_states) {
        const usResponse = await fetch('/maps/us-states.json');
        const usData = await usResponse.json();
        const usFeatures = topojson.feature(usData, usData.objects.states) as any;
        allGeographies.push(...usFeatures.features);
      }

      // Load Australian states if game has use_au_states enabled
      if (game.use_au_states) {
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
        setModal({
          isOpen: true,
          type: 'error',
          message: data.error || `Failed to ${actionType}`,
        });
      }
    } catch (error) {
      console.error(`${actionType} error:`, error);
      setModal({
        isOpen: true,
        type: 'error',
        message: `Failed to ${actionType}`,
      });
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

  const hasOtherCountries = game.enabled_countries.some(
    (c) => c !== '840' && c !== '036' // USA and Australia numeric IDs
  );

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

      {/* Territory Info Panel */}
      {selectedTerritory && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {selectedTerritory.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                    {selectedTerritory.type.replace('_', ' ')}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedTerritory(null);
                    setActionType(null);
                  }}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  disabled={loading}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Owner Info */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Territory Owner
              </h4>
              {(() => {
                const ownership = Array.isArray(selectedTerritory.ownership) && selectedTerritory.ownership.length > 0
                  ? selectedTerritory.ownership[0]
                  : null;
                const owner = ownership?.users;

                if (owner) {
                  return (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <img
                        src={owner.image || ''}
                        alt={owner.name || ''}
                        className="w-12 h-12 rounded-lg object-cover border-2 border-gray-300 dark:border-gray-600"
                      />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {owner.name}
                          {owner.id === userId && (
                            <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(You)</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Current Owner</p>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                      <p className="text-gray-600 dark:text-gray-400">Unclaimed</p>
                    </div>
                  );
                }
              })()}
            </div>

            {/* Actions */}
            <div className="p-6">
              {actionType === 'claim' && (
                <div className="mb-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    This territory is available to claim.
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Cost: 1 claim resource
                  </p>
                </div>
              )}

              {actionType === 'attack' && (
                <div className="mb-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    Attack this territory to claim it for yourself.
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Cost: 1 attack resource
                    <br />
                    The defender will have {game.defense_window_hours} hours to respond.
                  </p>
                </div>
              )}

              {!actionType && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    You own this territory
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedTerritory(null);
                    setActionType(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 font-medium"
                  disabled={loading}
                >
                  Close
                </button>
                {actionType && (
                  <button
                    onClick={executeAction}
                    disabled={loading}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium text-white ${
                      actionType === 'claim'
                        ? 'bg-green-600 hover:bg-green-700 disabled:bg-gray-400'
                        : 'bg-red-600 hover:bg-red-700 disabled:bg-gray-400'
                    }`}
                  >
                    {loading ? 'Processing...' : actionType === 'claim' ? 'Claim Territory' : 'Launch Attack'}
                  </button>
                )}
              </div>
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

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        message={modal.message}
        type={modal.type}
      />
    </div>
  );
}
