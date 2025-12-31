const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, '../public/maps/world-countries.json');
const data = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

const countries = data.objects.countries.geometries
  .map(c => ({ id: c.id, name: c.properties.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

console.log('export const WORLD_COUNTRIES = [');
countries.forEach(c => {
  console.log(`  { id: '${c.id}', name: '${c.name}' },`);
});
console.log('];');
