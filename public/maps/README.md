# TopoJSON Map Data

This directory contains TopoJSON files for rendering maps with React-Simple-Maps.

## Required Files

You'll need to add the following TopoJSON files:

### 1. World Countries
- **File**: `world-countries.json`
- **Source**: https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json
- **Description**: World countries at 110m resolution

### 2. US States
- **File**: `us-states.json`
- **Source**: https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json
- **Description**: US states at 10m resolution

### 3. Australian States
- **File**: `au-states.json`
- **Source**: You can use Natural Earth data or create custom TopoJSON
- **Description**: Australian states and territories

## Quick Setup

Run these commands to download the map files:

```bash
# Download world countries
curl -o public/maps/world-countries.json https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json

# Download US states
curl -o public/maps/us-states.json https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json
```

For Australian states, you can:
1. Use Natural Earth data: https://www.naturalearthdata.com/
2. Convert to TopoJSON using: https://mapshaper.org/
3. Or use a pre-made Australian TopoJSON from npm or GitHub

## Custom Map Creation

If you need to create custom TopoJSON:
1. Get GeoJSON data from Natural Earth or other sources
2. Use [mapshaper.org](https://mapshaper.org) to convert and simplify
3. Export as TopoJSON

## Note

The map files are not included in the repository due to size. You must download them before running the application.
