// Static game data: resources, terrain, factions, creatures, heroes, skills, spells, artifacts,
// town buildings and adventure-map objects. Everything here is read-only at runtime.

const RES = ['gold', 'wood', 'ore', 'mercury', 'sulfur', 'crystal', 'gems'];
const RES_NAME = { gold: 'Gold', wood: 'Wood', ore: 'Ore', mercury: 'Mercury', sulfur: 'Sulfur', crystal: 'Crystal', gems: 'Gems' };
const RES_VALUE = { gold: 1, wood: 125, ore: 125, mercury: 250, sulfur: 250, crystal: 250, gems: 250 };

const PLAYER_COLORS = [
    { name: 'Red', hex: 0xd02020, css: '#d02020' },
    { name: 'Blue', hex: 0x2050e0, css: '#2050e0' },
    { name: 'Tan', hex: 0xc09060, css: '#c09060' },
    { name: 'Green', hex: 0x20a030, css: '#20a030' },
    { name: 'Orange', hex: 0xf08010, css: '#f08010' },
    { name: 'Purple', hex: 0x9030c0, css: '#9030c0' },
    { name: 'Teal', hex: 0x10a0a0, css: '#10a0a0' },
    { name: 'Pink', hex: 0xe070b0, css: '#e070b0' },
];
const NEUTRAL_COLOR = { name: 'Neutral', hex: 0x909090, css: '#909090' };

// terrain index -> properties
const TERRAIN = [
    { id: 'water', name: 'Water', cost: 0, color: '#2a5a9a', mini: '#1d4e8c' },
    { id: 'grass', name: 'Grass', cost: 100, color: '#4f8a2e', mini: '#3d7d2a' },
    { id: 'dirt', name: 'Dirt', cost: 100, color: '#8a6a3a', mini: '#80602e' },
    { id: 'sand', name: 'Sand', cost: 150, color: '#d8c080', mini: '#d6be7a' },
    { id: 'snow', name: 'Snow', cost: 150, color: '#e8eef4', mini: '#dfe8f0' },
    { id: 'swamp', name: 'Swamp', cost: 175, color: '#4a6a4a', mini: '#3e5e48' },
    { id: 'rough', name: 'Rough', cost: 125, color: '#9a7a50', mini: '#8f7048' },
    { id: 'lava', name: 'Lava', cost: 100, color: '#4a3a3a', mini: '#463232' },
];
const T = { WATER: 0, GRASS: 1, DIRT: 2, SAND: 3, SNOW: 4, SWAMP: 5, ROUGH: 6, LAVA: 7 };

const FACTIONS = {
    castle: {
        name: 'Castle', terrain: T.GRASS, rare: 'crystal', mightClass: 'knight', magicClass: 'cleric',
        wall: '#c8c0b0', roof: '#3858b0', trim: '#e8d070', sky: ['#7ab0e8', '#cfe6f8'], ground: '#5a9a3a',
        towns: ['Avonmere', 'Brightwall', 'Kingsford', 'Stonehelm', 'Valerian', 'Highmarch'],
        dwell: ['Guardhouse', 'Archers\' Tower', 'Griffin Tower', 'Barracks', 'Monastery', 'Training Grounds', 'Portal of Glory'],
    },
    rampart: {
        name: 'Rampart', terrain: T.GRASS, rare: 'gems', mightClass: 'ranger', magicClass: 'druid',
        wall: '#d8d0a8', roof: '#3a8a3a', trim: '#f0e090', sky: ['#90c8e0', '#e0f4e8'], ground: '#4f9a3a',
        towns: ['Elmshade', 'Silverglade', 'Thornwood', 'Moonbrook', 'Greenhollow', 'Fernlight'],
        dwell: ['Centaur Stables', 'Dwarf Cottage', 'Homestead', 'Enchanted Spring', 'Dendroid Arches', 'Unicorn Glade', 'Dragon Cliffs'],
    },
    tower: {
        name: 'Tower', terrain: T.SNOW, rare: 'gems', mightClass: 'alchemist', magicClass: 'wizard',
        wall: '#e8e8f0', roof: '#7a6ad0', trim: '#f8e898', sky: ['#a8c8f0', '#f0f4ff'], ground: '#dfe8f0',
        towns: ['Frostspire', 'Glacierhold', 'Whitepeak', 'Arcanum', 'Crystalrise', 'Starfall'],
        dwell: ['Workshop', 'Parapet', 'Golem Factory', 'Mage Tower', 'Altar of Wishes', 'Golden Pavilion', 'Cloud Temple'],
    },
    inferno: {
        name: 'Inferno', terrain: T.LAVA, rare: 'mercury', mightClass: 'demoniac', magicClass: 'heretic',
        wall: '#6a4a40', roof: '#b02818', trim: '#f09030', sky: ['#5a1a10', '#d06030'], ground: '#4a3030',
        towns: ['Ashgate', 'Brimstone', 'Cindervault', 'Hellmaw', 'Pyrehold', 'Scorchmoor'],
        dwell: ['Imp Crucible', 'Hall of Sins', 'Kennels', 'Demon Gate', 'Hell Hole', 'Fire Lake', 'Forsaken Palace'],
    },
    necropolis: {
        name: 'Necropolis', terrain: T.DIRT, rare: 'sulfur', mightClass: 'deathknight', magicClass: 'necromancer',
        wall: '#6a6a70', roof: '#30303a', trim: '#90e0a0', sky: ['#303848', '#7a8090'], ground: '#5a5040',
        towns: ['Gravemoor', 'Bonereach', 'Dreadhollow', 'Mournvale', 'Shadowfen', 'Cryptwood'],
        dwell: ['Cursed Temple', 'Graveyard', 'Tomb of Souls', 'Estate', 'Mausoleum', 'Hall of Darkness', 'Dragon Vault'],
    },
    stronghold: {
        name: 'Stronghold', terrain: T.ROUGH, rare: 'crystal', mightClass: 'barbarian', magicClass: 'battlemage',
        wall: '#a07850', roof: '#8a5020', trim: '#e0b060', sky: ['#d8a060', '#f8e0b0'], ground: '#9a7a50',
        towns: ['Skullcrag', 'Warhollow', 'Ironmaw', 'Dustfang', 'Bloodrock', 'Gorehill'],
        dwell: ['Goblin Barracks', 'Wolf Pen', 'Orc Tower', 'Ogre Fort', 'Cliff Nest', 'Cyclops Cave', 'Behemoth Lair'],
    },
};
const FACTION_IDS = Object.keys(FACTIONS);

// Creatures. Ability keys: shoot (shots), fly, large, dbl (strikes twice), dshot (shoots twice), noRetal (enemy
// can't retaliate), unlRetal, retals (n retaliations), undead, breath, nmp (no melee penalty), resist (spell
// resistance %), regen, drain, aoe (area shot), joust, allAdj (attacks all adjacent), ignDef (fraction), deathBlow.
const CREATURES = {};
function C(id, name, fac, tier, up, att, def, min, max, hp, spd, grow, cost, extra, abil, art) {
    CREATURES[id] = Object.assign({ id, name, faction: fac, tier, up: !!up, att, def, min, max, hp, spd, grow, cost, extra: extra || null, art }, abil || {});
}
const SK = '#e8b890', SK2 = '#d0a070';
// Castle
C('pikeman', 'Pikeman', 'castle', 1, 0, 4, 5, 1, 3, 10, 4, 14, 60, null, {}, { a: 'man', skin: SK, c1: '#3a5fb0', armor: '#b8c0c8', helm: 'helm', wpn: 'spear', shield: '#3a5fb0' });
C('halberdier', 'Halberdier', 'castle', 1, 1, 6, 5, 2, 3, 10, 5, 14, 75, null, {}, { a: 'man', skin: SK, c1: '#2a4fa0', armor: '#d0d8e0', helm: 'plume', wpn: 'halberd', shield: '#e8c040' });
C('archer', 'Archer', 'castle', 2, 0, 6, 3, 2, 3, 10, 4, 9, 100, null, { shoot: 12 }, { a: 'man', skin: SK, c1: '#3a7a3a', helm: 'cap', wpn: 'bow' });
C('marksman', 'Marksman', 'castle', 2, 1, 6, 3, 2, 3, 10, 6, 9, 150, null, { shoot: 24, dshot: 1 }, { a: 'man', skin: SK, c1: '#2a5a9a', armor: '#c0c8d0', helm: 'helm', wpn: 'crossbow' });
C('griffin', 'Griffin', 'castle', 3, 0, 8, 8, 3, 6, 25, 6, 7, 200, null, { fly: 1, large: 1, retals: 2 }, { a: 'beast', head: 'eagle', c1: '#c09040', c2: '#f0f0e8', wings: '#a07830' });
C('royalgriffin', 'Royal Griffin', 'castle', 3, 1, 9, 9, 3, 6, 25, 9, 7, 240, null, { fly: 1, large: 1, unlRetal: 1 }, { a: 'beast', head: 'eagle', c1: '#d8a838', c2: '#fffaf0', wings: '#e0c060', crown: 1 });
C('swordsman', 'Swordsman', 'castle', 4, 0, 10, 12, 6, 9, 35, 5, 4, 300, null, {}, { a: 'man', skin: SK, c1: '#b03030', armor: '#b8c0c8', helm: 'helm', wpn: 'sword', shield: '#b03030' });
C('crusader', 'Crusader', 'castle', 4, 1, 12, 12, 7, 10, 35, 6, 4, 400, null, { dbl: 1 }, { a: 'man', skin: SK, c1: '#f0f0f0', armor: '#d8dde4', helm: 'helm', wpn: 'sword', shield: '#f0f0f0', cross: 1 });
C('monk', 'Monk', 'castle', 5, 0, 12, 7, 10, 12, 30, 5, 3, 400, null, { shoot: 12 }, { a: 'man', skin: SK, c1: '#8a6a40', robe: 1, helm: 'hood', wpn: 'staff' });
C('zealot', 'Zealot', 'castle', 5, 1, 12, 10, 10, 12, 30, 7, 3, 450, null, { shoot: 24, nmp: 1 }, { a: 'man', skin: SK, c1: '#e8e0c8', robe: 1, helm: 'hood', wpn: 'staff', glow: '#fff0a0' });
C('cavalier', 'Cavalier', 'castle', 6, 0, 15, 15, 15, 25, 100, 7, 2, 1000, null, { large: 1, joust: 1 }, { a: 'rider', mount: 'horse', mc: '#8a5a30', skin: SK, c1: '#3a5fb0', armor: '#c0c8d0', helm: 'helm', wpn: 'lance' });
C('champion', 'Champion', 'castle', 6, 1, 16, 16, 20, 25, 100, 9, 2, 1200, null, { large: 1, joust: 1 }, { a: 'rider', mount: 'horse', mc: '#f0ece0', skin: SK, c1: '#e8c040', armor: '#e0e4ea', helm: 'plume', wpn: 'lance' });
C('angel', 'Angel', 'castle', 7, 0, 20, 20, 50, 50, 200, 12, 1, 3000, { crystal: 1 }, { fly: 1 }, { a: 'man', skin: '#f4d0b0', c1: '#f0f0f8', robe: 1, wings: '#ffffff', wpn: 'sword', hair: '#f0d060', glow: '#fff8c0', sc: 1.1 });
C('archangel', 'Archangel', 'castle', 7, 1, 30, 30, 50, 50, 250, 18, 1, 5000, { crystal: 3 }, { fly: 1 }, { a: 'man', skin: '#f4d0b0', c1: '#d03030', armor: '#f0d060', wings: '#fff4d0', wpn: 'flamesword', hair: '#f0d060', glow: '#ffe080', sc: 1.15 });
// Rampart
C('centaur', 'Centaur', 'rampart', 1, 0, 5, 3, 2, 3, 8, 6, 14, 70, null, { large: 1 }, { a: 'centaur', mc: '#9a6a3a', skin: SK2, c1: '#5a8a3a', wpn: 'spear', hair: '#5a3a20' });
C('centaurcaptain', 'Centaur Captain', 'rampart', 1, 1, 6, 3, 2, 3, 10, 8, 14, 90, null, { large: 1 }, { a: 'centaur', mc: '#7a4a2a', skin: SK2, c1: '#3a6a2a', armor: '#c0c8d0', wpn: 'spear', helm: 'helm' });
C('dwarf', 'Dwarf', 'rampart', 2, 0, 6, 7, 2, 4, 20, 3, 8, 120, null, { resist: 20 }, { a: 'man', skin: SK, c1: '#9a5a30', armor: '#a0a0a8', helm: 'helm', wpn: 'axe', beard: '#c06020', sc: 0.75, fat: 1 });
C('battledwarf', 'Battle Dwarf', 'rampart', 2, 1, 7, 7, 2, 4, 20, 5, 8, 150, null, { resist: 40 }, { a: 'man', skin: SK, c1: '#3a6a3a', armor: '#c8c8d0', helm: 'horns', wpn: 'axe', beard: '#d8b040', sc: 0.75, fat: 1 });
C('woodelf', 'Wood Elf', 'rampart', 3, 0, 9, 5, 3, 5, 15, 6, 7, 200, null, { shoot: 24 }, { a: 'man', skin: '#f0d0a8', c1: '#4a8a3a', helm: 'none', wpn: 'bow', hair: '#e8c060', ears: 1 });
C('grandelf', 'Grand Elf', 'rampart', 3, 1, 9, 5, 3, 5, 15, 7, 7, 225, null, { shoot: 24, dshot: 1 }, { a: 'man', skin: '#f0d0a8', c1: '#2a6a5a', helm: 'none', wpn: 'bow', hair: '#f0e0a0', ears: 1, cape: '#3a8a3a' });
C('pegasus', 'Pegasus', 'rampart', 4, 0, 9, 8, 5, 9, 30, 8, 5, 250, null, { fly: 1, large: 1 }, { a: 'beast', head: 'horse', c1: '#f0f0f0', c2: '#d0d8e8', wings: '#ffffff', mane: '#c8d8f0' });
C('silverpegasus', 'Silver Pegasus', 'rampart', 4, 1, 9, 10, 5, 9, 30, 12, 5, 275, null, { fly: 1, large: 1 }, { a: 'beast', head: 'horse', c1: '#d8e0f0', c2: '#b0c0e0', wings: '#e8f0ff', mane: '#8090c0' });
C('dendroidguard', 'Dendroid Guard', 'rampart', 5, 0, 9, 12, 10, 14, 55, 3, 3, 350, null, {}, { a: 'tree', c1: '#6a4a2a', c2: '#4a8a2a' });
C('dendroidsoldier', 'Dendroid Soldier', 'rampart', 5, 1, 9, 12, 10, 14, 65, 4, 3, 425, null, {}, { a: 'tree', c1: '#5a3a1a', c2: '#2a7a2a', bloom: '#f080a0' });
C('unicorn', 'Unicorn', 'rampart', 6, 0, 15, 14, 18, 22, 90, 7, 2, 850, null, { large: 1, resist: 20 }, { a: 'beast', head: 'horse', c1: '#f8f8f8', c2: '#e0e0e8', horn: '#f0d060', mane: '#f0d0e8' });
C('warunicorn', 'War Unicorn', 'rampart', 6, 1, 15, 14, 18, 22, 110, 9, 2, 950, null, { large: 1, resist: 30 }, { a: 'beast', head: 'horse', c1: '#f8f8f8', c2: '#d0d0e0', horn: '#f0d060', mane: '#d080c0', barding: '#3a7a3a' });
C('greendragon', 'Green Dragon', 'rampart', 7, 0, 18, 18, 40, 50, 180, 10, 1, 2400, { gems: 1 }, { fly: 1, large: 1, breath: 1, resist: 20 }, { a: 'dragon', c1: '#3a9a3a', c2: '#c0e080' });
C('golddragon', 'Gold Dragon', 'rampart', 7, 1, 27, 27, 40, 50, 250, 16, 1, 4000, { gems: 2 }, { fly: 1, large: 1, breath: 1, resist: 50 }, { a: 'dragon', c1: '#e0b030', c2: '#fff0a0' });
// Tower
C('gremlin', 'Gremlin', 'tower', 1, 0, 4, 3, 1, 2, 4, 4, 16, 30, null, {}, { a: 'man', skin: '#8ab060', c1: '#7a5a3a', helm: 'none', wpn: 'club', ears: 1, sc: 0.6, fat: 1 });
C('mastergremlin', 'Master Gremlin', 'tower', 1, 1, 4, 4, 1, 2, 4, 5, 16, 40, null, { shoot: 8 }, { a: 'man', skin: '#7aa050', c1: '#4a4a8a', helm: 'none', wpn: 'ball', ears: 1, sc: 0.6, fat: 1 });
C('stonegargoyle', 'Stone Gargoyle', 'tower', 2, 0, 6, 6, 2, 3, 16, 6, 9, 130, null, { fly: 1 }, { a: 'man', skin: '#8a8a8a', c1: '#7a7a7a', wings: '#6a6a6a', helm: 'horns', wpn: 'claws', sc: 0.85 });
C('obsidiangargoyle', 'Obsidian Gargoyle', 'tower', 2, 1, 7, 7, 2, 3, 16, 9, 9, 160, null, { fly: 1 }, { a: 'man', skin: '#3a3a44', c1: '#2a2a34', wings: '#22222a', helm: 'horns', wpn: 'claws', sc: 0.85 });
C('stonegolem', 'Stone Golem', 'tower', 3, 0, 7, 10, 4, 5, 30, 3, 6, 150, null, { resist: 50 }, { a: 'golem', c1: '#9a9080' });
C('irongolem', 'Iron Golem', 'tower', 3, 1, 9, 10, 4, 5, 35, 5, 6, 200, null, { resist: 75 }, { a: 'golem', c1: '#7a8090', rivets: 1 });
C('mage', 'Mage', 'tower', 4, 0, 11, 8, 7, 9, 25, 5, 4, 350, null, { shoot: 24, nmp: 1 }, { a: 'man', skin: SK, c1: '#6a3aa0', robe: 1, helm: 'wizard', wpn: 'staff', beard: '#e0e0e0', glow: '#c0a0ff' });
C('archmage', 'Arch Mage', 'tower', 4, 1, 12, 9, 7, 9, 30, 7, 4, 450, null, { shoot: 24, nmp: 1 }, { a: 'man', skin: SK, c1: '#a02a6a', robe: 1, helm: 'wizard', wpn: 'staff', beard: '#ffffff', glow: '#ffa0e0' });
C('genie', 'Genie', 'tower', 5, 0, 12, 12, 13, 16, 40, 7, 3, 550, null, { fly: 1 }, { a: 'genie', c1: '#4a80e0', c2: '#e8c040' });
C('mastergenie', 'Master Genie', 'tower', 5, 1, 12, 12, 13, 16, 40, 11, 3, 600, null, { fly: 1 }, { a: 'genie', c1: '#3a60d0', c2: '#f0d060', turban: '#c02040' });
C('naga', 'Naga', 'tower', 6, 0, 16, 13, 20, 20, 110, 5, 2, 1100, null, { large: 1, noRetal: 1 }, { a: 'naga', skin: '#e0b088', c1: '#3a8a6a', c2: '#e8c040' });
C('nagaqueen', 'Naga Queen', 'tower', 6, 1, 16, 13, 30, 30, 110, 7, 2, 1600, null, { large: 1, noRetal: 1 }, { a: 'naga', skin: '#e0b088', c1: '#2a6aa0', c2: '#f0d060', crown: 1 });
C('giant', 'Giant', 'tower', 7, 0, 19, 16, 40, 60, 150, 7, 1, 2000, { gems: 1 }, {}, { a: 'man', skin: SK, c1: '#6a7ab0', armor: '#c8a040', helm: 'none', wpn: 'fist', beard: '#8a5a2a', sc: 1.35, fat: 1 });
C('titan', 'Titan', 'tower', 7, 1, 24, 24, 40, 60, 300, 11, 1, 5000, { gems: 2 }, { shoot: 24, nmp: 1, resist: 20 }, { a: 'man', skin: '#a8c0e0', c1: '#f0f0f0', armor: '#e8c040', helm: 'crown', wpn: 'bolt', beard: '#f0f0ff', sc: 1.4, glow: '#c0e0ff' });
// Inferno
C('imp', 'Imp', 'inferno', 1, 0, 2, 3, 1, 2, 4, 5, 15, 50, null, {}, { a: 'man', skin: '#c03020', c1: '#a02010', helm: 'horns', wpn: 'trident', tail: 1, sc: 0.55 });
C('familiar', 'Familiar', 'inferno', 1, 1, 4, 4, 1, 2, 4, 7, 15, 60, null, {}, { a: 'man', skin: '#e04020', c1: '#c02818', helm: 'horns', wpn: 'claws', tail: 1, wings: '#802010', sc: 0.55 });
C('gog', 'Gog', 'inferno', 2, 0, 6, 4, 2, 4, 13, 4, 8, 125, null, { shoot: 12 }, { a: 'man', skin: '#b06040', c1: '#5a3020', helm: 'horns', wpn: 'fireball', fat: 1, sc: 0.9 });
C('magog', 'Magog', 'inferno', 2, 1, 7, 4, 2, 4, 13, 6, 8, 175, null, { shoot: 24, aoe: 1 }, { a: 'man', skin: '#a04030', c1: '#3a1a10', helm: 'horns', wpn: 'fireball', fat: 1, sc: 0.95 });
C('hellhound', 'Hell Hound', 'inferno', 3, 0, 10, 6, 2, 7, 25, 7, 5, 200, null, { large: 1 }, { a: 'beast', head: 'wolf', c1: '#8a2a1a', c2: '#3a1a10', fire: 1 });
C('cerberus', 'Cerberus', 'inferno', 3, 1, 10, 8, 2, 7, 25, 8, 5, 250, null, { large: 1, noRetal: 1, allAdj: 1 }, { a: 'beast', head: 'wolf', c1: '#5a1a10', c2: '#2a0a08', fire: 1, heads: 3 });
C('demon', 'Demon', 'inferno', 4, 0, 10, 10, 7, 9, 35, 5, 4, 250, null, {}, { a: 'man', skin: '#c04030', c1: '#5a2010', helm: 'horns', wpn: 'claws', tail: 1, fat: 1 });
C('horneddemon', 'Horned Demon', 'inferno', 4, 1, 10, 10, 7, 9, 40, 6, 4, 270, null, {}, { a: 'man', skin: '#a02a28', c1: '#3a1008', helm: 'bighorns', wpn: 'claws', tail: 1, fat: 1 });
C('pitfiend', 'Pit Fiend', 'inferno', 5, 0, 13, 13, 13, 17, 45, 6, 3, 500, null, {}, { a: 'man', skin: '#7a1a30', c1: '#2a0a10', helm: 'horns', wpn: 'whip', wings: '#4a0a18', tail: 1 });
C('pitlord', 'Pit Lord', 'inferno', 5, 1, 13, 13, 13, 17, 45, 7, 3, 700, null, {}, { a: 'man', skin: '#902040', c1: '#2a0a10', helm: 'bighorns', wpn: 'scythe', wings: '#5a0a20', tail: 1 });
C('efreeti', 'Efreeti', 'inferno', 6, 0, 16, 12, 16, 24, 90, 9, 2, 900, null, { fly: 1 }, { a: 'genie', c1: '#e04010', c2: '#f0a020', fire: 1 });
C('efreetsultan', 'Efreet Sultan', 'inferno', 6, 1, 16, 14, 16, 24, 90, 13, 2, 1100, null, { fly: 1 }, { a: 'genie', c1: '#f05010', c2: '#ffd040', fire: 1, turban: '#f0d060' });
C('devil', 'Devil', 'inferno', 7, 0, 19, 21, 30, 40, 160, 11, 1, 2700, { mercury: 1 }, { fly: 1, noRetal: 1 }, { a: 'man', skin: '#901818', c1: '#200808', helm: 'bighorns', wpn: 'trident', wings: '#300808', tail: 1, sc: 1.15 });
C('archdevil', 'Arch Devil', 'inferno', 7, 1, 26, 28, 30, 40, 200, 17, 1, 4500, { mercury: 2 }, { fly: 1, noRetal: 1 }, { a: 'man', skin: '#b02010', c1: '#100404', helm: 'bighorns', wpn: 'trident', wings: '#200404', tail: 1, sc: 1.2, glow: '#ff6020' });
// Necropolis
C('skeleton', 'Skeleton', 'necropolis', 1, 0, 5, 4, 1, 3, 6, 4, 12, 60, null, { undead: 1 }, { a: 'man', bones: 1, c1: '#e8e0c8', wpn: 'sword', shield: '#7a6a50' });
C('skeletonwarrior', 'Skeleton Warrior', 'necropolis', 1, 1, 6, 6, 1, 3, 6, 5, 12, 70, null, { undead: 1 }, { a: 'man', bones: 1, c1: '#f0ead8', armor: '#8a8a90', helm: 'helm', wpn: 'spear', shield: '#5a5a70' });
C('walkingdead', 'Walking Dead', 'necropolis', 2, 0, 5, 5, 2, 3, 15, 3, 8, 100, null, { undead: 1 }, { a: 'man', skin: '#8aa070', c1: '#5a5040', helm: 'none', wpn: 'claws', zombie: 1 });
C('zombie', 'Zombie', 'necropolis', 2, 1, 5, 5, 2, 3, 20, 4, 8, 125, null, { undead: 1 }, { a: 'man', skin: '#7a9a80', c1: '#3a3a5a', helm: 'none', wpn: 'claws', zombie: 1, fat: 1 });
C('wight', 'Wight', 'necropolis', 3, 0, 7, 7, 3, 5, 18, 5, 7, 200, null, { undead: 1, fly: 1, regen: 1 }, { a: 'ghost', c1: '#c8d0e0', c2: '#6a7a90' });
C('wraith', 'Wraith', 'necropolis', 3, 1, 7, 7, 3, 5, 18, 7, 7, 230, null, { undead: 1, fly: 1, regen: 1 }, { a: 'ghost', c1: '#8090a8', c2: '#303848', scythe: 1 });
C('vampire', 'Vampire', 'necropolis', 4, 0, 10, 9, 5, 8, 30, 6, 4, 360, null, { undead: 1, fly: 1, noRetal: 1 }, { a: 'man', skin: '#e8e0e8', c1: '#1a1a24', cape: '#901020', helm: 'none', wpn: 'claws', hair: '#101010' });
C('vampirelord', 'Vampire Lord', 'necropolis', 4, 1, 10, 10, 5, 8, 40, 9, 4, 500, null, { undead: 1, fly: 1, noRetal: 1, drain: 1 }, { a: 'man', skin: '#f0e8f0', c1: '#2a0a20', cape: '#c01830', helm: 'none', wpn: 'sword', hair: '#202020', collar: 1 });
C('lich', 'Lich', 'necropolis', 5, 0, 13, 10, 11, 13, 30, 6, 3, 550, null, { undead: 1, shoot: 12, aoe: 1 }, { a: 'man', bones: 1, c1: '#3a2a5a', robe: 1, helm: 'hood', wpn: 'staff', glow: '#80ff80' });
C('powerlich', 'Power Lich', 'necropolis', 5, 1, 13, 10, 11, 15, 40, 7, 3, 600, null, { undead: 1, shoot: 24, aoe: 1 }, { a: 'man', bones: 1, c1: '#5a1a4a', robe: 1, helm: 'crown', wpn: 'staff', glow: '#a0ffa0' });
C('blackknight', 'Black Knight', 'necropolis', 6, 0, 16, 16, 15, 30, 120, 7, 2, 1200, null, { undead: 1, large: 1 }, { a: 'rider', mount: 'horse', mc: '#202024', skin: '#c0c0c0', bones: 1, c1: '#202028', armor: '#3a3a44', helm: 'helm', wpn: 'sword', eyes: '#ff3020' });
C('dreadknight', 'Dread Knight', 'necropolis', 6, 1, 18, 18, 15, 30, 120, 9, 2, 1500, null, { undead: 1, large: 1, deathBlow: 1 }, { a: 'rider', mount: 'horse', mc: '#101014', skin: '#c0c0c0', bones: 1, c1: '#300a3a', armor: '#2a2030', helm: 'bighorns', wpn: 'sword', eyes: '#60ff60' });
C('bonedragon', 'Bone Dragon', 'necropolis', 7, 0, 17, 15, 25, 50, 150, 9, 1, 1800, null, { undead: 1, fly: 1, large: 1 }, { a: 'dragon', c1: '#e8e0c8', c2: '#a09880', bones: 1 });
C('ghostdragon', 'Ghost Dragon', 'necropolis', 7, 1, 19, 17, 25, 50, 200, 14, 1, 3000, { sulfur: 1 }, { undead: 1, fly: 1, large: 1 }, { a: 'dragon', c1: '#a0b8a8', c2: '#50685a', bones: 1, ghost: 1 });
// Stronghold
C('goblin', 'Goblin', 'stronghold', 1, 0, 4, 2, 1, 2, 5, 5, 15, 40, null, {}, { a: 'man', skin: '#8aa040', c1: '#8a6a3a', helm: 'none', wpn: 'spear', ears: 1, sc: 0.65 });
C('hobgoblin', 'Hobgoblin', 'stronghold', 1, 1, 5, 3, 1, 2, 5, 7, 15, 50, null, {}, { a: 'man', skin: '#a0a040', c1: '#a04a2a', armor: '#8a8a8a', helm: 'cap', wpn: 'spear', ears: 1, sc: 0.7 });
C('wolfrider', 'Wolf Rider', 'stronghold', 2, 0, 7, 5, 2, 4, 10, 6, 9, 100, null, { large: 1 }, { a: 'rider', mount: 'wolf', mc: '#7a7068', skin: '#8aa040', c1: '#8a5a2a', helm: 'none', wpn: 'axe', ears: 1, sc: 0.8 });
C('wolfraider', 'Wolf Raider', 'stronghold', 2, 1, 8, 5, 3, 5, 10, 8, 9, 140, null, { large: 1, dbl: 1 }, { a: 'rider', mount: 'wolf', mc: '#5a5048', skin: '#a0a040', c1: '#6a2a1a', helm: 'horns', wpn: 'axe', ears: 1, sc: 0.8 });
C('orc', 'Orc', 'stronghold', 3, 0, 8, 4, 2, 5, 15, 4, 7, 150, null, { shoot: 12 }, { a: 'man', skin: '#6a9040', c1: '#7a4a2a', helm: 'none', wpn: 'axethrow', tusks: 1 });
C('orcchieftain', 'Orc Chieftain', 'stronghold', 3, 1, 8, 4, 2, 5, 20, 5, 7, 165, null, { shoot: 24 }, { a: 'man', skin: '#5a8030', c1: '#8a2a1a', armor: '#9a9aa0', helm: 'horns', wpn: 'axethrow', tusks: 1 });
C('ogre', 'Ogre', 'stronghold', 4, 0, 13, 7, 6, 12, 60, 4, 4, 300, null, {}, { a: 'man', skin: '#a08a5a', c1: '#6a4a2a', helm: 'none', wpn: 'club', fat: 1, sc: 1.15 });
C('ogremage', 'Ogre Mage', 'stronghold', 4, 1, 13, 7, 6, 12, 60, 5, 4, 400, null, {}, { a: 'man', skin: '#8a9a6a', c1: '#3a2a6a', robe: 1, helm: 'hood', wpn: 'club', fat: 1, sc: 1.15, glow: '#a080ff' });
C('roc', 'Roc', 'stronghold', 5, 0, 13, 11, 11, 15, 60, 7, 3, 600, null, { fly: 1, large: 1 }, { a: 'bird', c1: '#8a5a30', c2: '#e0c080' });
C('thunderbird', 'Thunderbird', 'stronghold', 5, 1, 13, 11, 11, 15, 60, 11, 3, 700, null, { fly: 1, large: 1 }, { a: 'bird', c1: '#3a4a8a', c2: '#f0d040', bolt: 1 });
C('cyclops', 'Cyclops', 'stronghold', 6, 0, 15, 12, 16, 20, 100, 6, 2, 750, null, { shoot: 16 }, { a: 'man', skin: '#c09060', c1: '#6a5a3a', helm: 'none', wpn: 'rock', cyclops: 1, fat: 1, sc: 1.2 });
C('cyclopsking', 'Cyclops King', 'stronghold', 6, 1, 17, 13, 16, 20, 150, 8, 2, 1100, null, { shoot: 24 }, { a: 'man', skin: '#b08050', c1: '#8a2a2a', helm: 'crown', wpn: 'rock', cyclops: 1, fat: 1, sc: 1.25 });
C('behemoth', 'Behemoth', 'stronghold', 7, 0, 17, 17, 30, 50, 160, 6, 1, 1500, { crystal: 1 }, { large: 1, ignDef: 0.4 }, { a: 'beast', head: 'bull', c1: '#a07a50', c2: '#6a4a30', horn: '#f0e8d0', big: 1 });
C('ancientbehemoth', 'Ancient Behemoth', 'stronghold', 7, 1, 19, 19, 30, 50, 300, 9, 1, 3000, { crystal: 2 }, { large: 1, ignDef: 0.8 }, { a: 'beast', head: 'bull', c1: '#7a6a5a', c2: '#4a3a2a', horn: '#fff8e0', big: 1, spikes: 1 });
// Neutrals (found only on the adventure map)
C('peasant', 'Peasant', 'neutral', 1, 0, 1, 1, 1, 1, 1, 3, 25, 10, null, {}, { a: 'man', skin: SK, c1: '#9a8a5a', helm: 'cap', wpn: 'pitchfork' });
C('halfling', 'Halfling', 'neutral', 1, 0, 4, 2, 1, 3, 4, 5, 15, 40, null, { shoot: 24 }, { a: 'man', skin: SK, c1: '#5a8a4a', helm: 'none', wpn: 'sling', hair: '#8a5a2a', sc: 0.6 });
C('rogue', 'Rogue', 'neutral', 2, 0, 8, 3, 2, 4, 10, 6, 8, 100, null, {}, { a: 'man', skin: SK, c1: '#3a3a3a', cape: '#5a1a1a', helm: 'hood', wpn: 'dagger' });
C('boar', 'Boar', 'neutral', 2, 0, 6, 5, 2, 3, 15, 6, 8, 150, null, { large: 1 }, { a: 'beast', head: 'boar', c1: '#6a4a30', c2: '#4a3020', horn: '#f0e8d0' });
C('nomad', 'Nomad', 'neutral', 3, 0, 9, 8, 2, 6, 30, 7, 7, 200, null, { large: 1 }, { a: 'rider', mount: 'camel', mc: '#c8a070', skin: SK2, c1: '#f0e8d8', helm: 'turban', wpn: 'scimitar' });
C('troll', 'Troll', 'neutral', 5, 0, 14, 7, 10, 15, 40, 7, 4, 500, null, { regen: 1 }, { a: 'man', skin: '#7a9a7a', c1: '#5a4a3a', helm: 'none', wpn: 'club', fat: 1, sc: 1.1, tusks: 1 });
C('goldgolem', 'Gold Golem', 'neutral', 5, 0, 11, 12, 8, 10, 50, 5, 3, 500, null, { resist: 85 }, { a: 'golem', c1: '#e0b030', rivets: 1 });
C('enchanter', 'Enchanter', 'neutral', 6, 0, 17, 12, 14, 14, 30, 9, 2, 750, null, { shoot: 32, nmp: 1 }, { a: 'man', skin: SK, c1: '#2a8a9a', robe: 1, helm: 'wizard', wpn: 'staff', beard: '#c0c0c0', glow: '#80ffff' });
C('diamondgolem', 'Diamond Golem', 'neutral', 6, 0, 13, 12, 10, 14, 60, 5, 2, 750, null, { resist: 95 }, { a: 'golem', c1: '#a0e0f0', rivets: 1, shiny: 1 });

const CREATURE_IDS = Object.keys(CREATURES);
// faction -> [[base, upgraded] x 7]
const FACTION_UNITS = {};
for (const f of FACTION_IDS) {
    FACTION_UNITS[f] = [];
    for (let t = 1; t <= 7; t++) {
        const base = CREATURE_IDS.find(id => CREATURES[id].faction === f && CREATURES[id].tier === t && !CREATURES[id].up);
        const up = CREATURE_IDS.find(id => CREATURES[id].faction === f && CREATURES[id].tier === t && CREATURES[id].up);
        FACTION_UNITS[f].push([base, up]);
        CREATURES[base].upTo = up; CREATURES[up].upFrom = base;
    }
}
// Fight value: how much an AI should fear one creature of this kind.
for (const id of CREATURE_IDS) {
    const c = CREATURES[id];
    let v = Math.pow(c.hp * (c.min + c.max) / 2, 0.75) * (1 + (c.att + c.def) * 0.025) * (1 + c.spd * 0.03);
    if (c.shoot) v *= c.dshot ? 1.7 : 1.4;
    if (c.fly) v *= 1.15;
    if (c.dbl) v *= 1.5;
    if (c.noRetal) v *= 1.2;
    c.value = Math.round(v * 8);
}

// Hero classes: starting primaries, primary growth weights and secondary-skill weights.
const CLASSES = {
    knight: { name: 'Knight', faction: 'castle', might: 1, start: [2, 2, 1, 1], grow: [35, 45, 10, 10], skills: { leadership: 9, offense: 7, armorer: 7, archery: 6, logistics: 6, luck: 4, wisdom: 3, estates: 5, resistance: 5, pathfinding: 5, learning: 4 } },
    cleric: { name: 'Cleric', faction: 'castle', might: 0, start: [1, 0, 2, 2], grow: [20, 15, 30, 35], skills: { wisdom: 9, sorcery: 6, mysticism: 6, intelligence: 7, leadership: 5, luck: 4, estates: 4, learning: 5, scouting: 3, offense: 3 } },
    ranger: { name: 'Ranger', faction: 'rampart', might: 1, start: [1, 3, 1, 1], grow: [35, 45, 10, 10], skills: { archery: 9, armorer: 6, pathfinding: 7, logistics: 7, luck: 6, offense: 5, scouting: 5, resistance: 5, leadership: 4, wisdom: 3 } },
    druid: { name: 'Druid', faction: 'rampart', might: 0, start: [0, 2, 1, 2], grow: [10, 20, 35, 35], skills: { wisdom: 9, luck: 7, mysticism: 6, sorcery: 5, intelligence: 6, scouting: 5, learning: 5, pathfinding: 4, logistics: 4 } },
    alchemist: { name: 'Alchemist', faction: 'tower', might: 1, start: [1, 1, 2, 2], grow: [30, 30, 20, 20], skills: { armorer: 7, offense: 5, archery: 5, wisdom: 7, mysticism: 5, logistics: 5, learning: 6, intelligence: 4, estates: 4 } },
    wizard: { name: 'Wizard', faction: 'tower', might: 0, start: [0, 0, 2, 3], grow: [10, 10, 40, 40], skills: { wisdom: 10, intelligence: 8, sorcery: 7, mysticism: 7, scouting: 4, learning: 5, logistics: 3, luck: 3 } },
    demoniac: { name: 'Demoniac', faction: 'inferno', might: 1, start: [2, 2, 1, 1], grow: [35, 35, 15, 15], skills: { offense: 8, armorer: 6, logistics: 6, scouting: 5, archery: 5, resistance: 6, wisdom: 4, pathfinding: 5, estates: 4 } },
    heretic: { name: 'Heretic', faction: 'inferno', might: 0, start: [1, 1, 2, 1], grow: [15, 15, 35, 35], skills: { wisdom: 8, sorcery: 8, intelligence: 6, mysticism: 5, scouting: 4, learning: 5, logistics: 4, offense: 3 } },
    deathknight: { name: 'Death Knight', faction: 'necropolis', might: 1, start: [1, 2, 2, 1], grow: [30, 25, 20, 25], skills: { necromancy: 10, offense: 6, armorer: 6, wisdom: 6, sorcery: 4, logistics: 5, resistance: 5, archery: 4, intelligence: 4 } },
    necromancer: { name: 'Necromancer', faction: 'necropolis', might: 0, start: [1, 0, 2, 2], grow: [15, 15, 35, 35], skills: { necromancy: 10, wisdom: 8, sorcery: 7, intelligence: 6, mysticism: 5, learning: 4, scouting: 3, logistics: 3 } },
    barbarian: { name: 'Barbarian', faction: 'stronghold', might: 1, start: [4, 0, 1, 1], grow: [55, 35, 5, 5], skills: { offense: 10, archery: 6, armorer: 5, logistics: 6, pathfinding: 6, scouting: 5, leadership: 4, luck: 4, resistance: 5 } },
    battlemage: { name: 'Battle Mage', faction: 'stronghold', might: 0, start: [2, 1, 1, 1], grow: [30, 20, 25, 25], skills: { wisdom: 7, offense: 6, sorcery: 6, intelligence: 6, logistics: 5, mysticism: 4, archery: 4, learning: 4 } },
};

const HERO_NAMES = {
    knight: ['Sir Aldric', 'Lady Brenna', 'Sir Cedric', 'Lady Isolde', 'Sir Roland', 'Lady Maren'],
    cleric: ['Father Anselm', 'Sister Elowen', 'Brother Tobin', 'Mother Rhea', 'Brother Caspian', 'Sister Mira'],
    ranger: ['Thalion', 'Sylwen', 'Faelar', 'Aeris', 'Rowan', 'Kaela'],
    druid: ['Oakheart', 'Briar', 'Mossa', 'Elandor', 'Willowen', 'Fennick'],
    alchemist: ['Quillon', 'Vesna', 'Halvard', 'Orsolya', 'Bramwell', 'Tessaly'],
    wizard: ['Magnus', 'Selene', 'Zephram', 'Ilsabet', 'Orrin', 'Calista'],
    demoniac: ['Gorvath', 'Xyrra', 'Malgor', 'Seraxa', 'Brakkus', 'Vexis'],
    heretic: ['Zethra', 'Morlok', 'Ashvane', 'Ilvara', 'Draegor', 'Nyxa'],
    deathknight: ['Lord Morcant', 'Lady Vespera', 'Lord Grimald', 'Lady Ysolde', 'Lord Thane', 'Lady Corva'],
    necromancer: ['Necrus', 'Morwenna', 'Valdris', 'Sepulka', 'Ossian', 'Lethea'],
    barbarian: ['Grukk', 'Thora', 'Krag', 'Ulfra', 'Borgh', 'Shara'],
    battlemage: ['Zogar', 'Rasha', 'Murdok', 'Yelga', 'Thrakk', 'Ognia'],
};

// Secondary skills: per-level effect values [basic, advanced, expert].
const SKILLS = {
    logistics: { name: 'Logistics', v: [10, 20, 30], d: 'Increases land movement by {v}%.' },
    pathfinding: { name: 'Pathfinding', v: [25, 50, 75], d: 'Reduces rough terrain penalties by {v}%.' },
    scouting: { name: 'Scouting', v: [1, 2, 3], d: 'Increases sight radius by {v}.' },
    archery: { name: 'Archery', v: [10, 25, 50], d: 'Increases ranged damage by {v}%.' },
    offense: { name: 'Offense', v: [10, 20, 30], d: 'Increases melee damage by {v}%.' },
    armorer: { name: 'Armorer', v: [5, 10, 15], d: 'Reduces damage taken by {v}%.' },
    leadership: { name: 'Leadership', v: [1, 2, 3], d: 'Increases army morale by {v}.' },
    luck: { name: 'Luck', v: [1, 2, 3], d: 'Increases army luck by {v}.' },
    wisdom: { name: 'Wisdom', v: [3, 4, 5], d: 'Allows learning spells up to level {v}.' },
    mysticism: { name: 'Mysticism', v: [2, 3, 4], d: 'Restores {v} extra spell points per day.' },
    intelligence: { name: 'Intelligence', v: [25, 50, 100], d: 'Increases maximum spell points by {v}%.' },
    sorcery: { name: 'Sorcery', v: [5, 10, 15], d: 'Increases spell damage by {v}%.' },
    estates: { name: 'Estates', v: [125, 250, 500], d: 'Contributes {v} gold per day.' },
    necromancy: { name: 'Necromancy', v: [10, 20, 30], d: 'Raises {v}% of slain enemies as skeletons.' },
    resistance: { name: 'Resistance', v: [5, 10, 20], d: '{v}% chance to resist hostile spells.' },
    learning: { name: 'Learning', v: [5, 10, 15], d: 'Increases experience earned by {v}%.' },
};
const SKILL_IDS = Object.keys(SKILLS);
const SKILL_LVL = ['', 'Basic', 'Advanced', 'Expert'];

// Spells. kind: dmg (single target), area (radius), all (everything), chain, buff/debuff (single or mass), heal, raise, dispel, adv (adventure).
const SPELLS = {
    magicarrow: { name: 'Magic Arrow', lvl: 1, cost: 5, kind: 'dmg', base: 10, per: 10, target: 'enemy', d: 'Deals {dmg} damage to an enemy stack.' },
    haste: { name: 'Haste', lvl: 1, cost: 6, kind: 'buff', eff: 'haste', target: 'ally', d: 'Increases speed of a friendly stack by 3.' },
    slow: { name: 'Slow', lvl: 1, cost: 6, kind: 'debuff', eff: 'slow', target: 'enemy', d: 'Halves the speed of an enemy stack.' },
    bless: { name: 'Bless', lvl: 1, cost: 5, kind: 'buff', eff: 'bless', target: 'ally', d: 'A friendly stack always deals maximum damage.' },
    curse: { name: 'Curse', lvl: 1, cost: 6, kind: 'debuff', eff: 'curse', target: 'enemy', d: 'An enemy stack always deals minimum damage.' },
    bloodlust: { name: 'Bloodlust', lvl: 1, cost: 5, kind: 'buff', eff: 'bloodlust', target: 'ally', d: '+3 attack in melee for a friendly stack.' },
    stoneskin: { name: 'Stone Skin', lvl: 1, cost: 5, kind: 'buff', eff: 'stoneskin', target: 'ally', d: '+3 defense for a friendly stack.' },
    shield: { name: 'Shield', lvl: 1, cost: 5, kind: 'buff', eff: 'shield', target: 'ally', d: 'Reduces melee damage to a friendly stack by 15%.' },
    cure: { name: 'Cure', lvl: 1, cost: 6, kind: 'heal', base: 10, per: 5, target: 'ally', d: 'Removes negative spells and heals {dmg} HP.' },
    dispel: { name: 'Dispel', lvl: 1, cost: 5, kind: 'dispel', target: 'any', d: 'Removes all spell effects from a stack.' },
    lightning: { name: 'Lightning Bolt', lvl: 2, cost: 10, kind: 'dmg', base: 10, per: 25, target: 'enemy', d: 'Deals {dmg} damage to an enemy stack.' },
    icebolt: { name: 'Ice Bolt', lvl: 2, cost: 8, kind: 'dmg', base: 10, per: 20, target: 'enemy', d: 'Deals {dmg} damage to an enemy stack.' },
    weakness: { name: 'Weakness', lvl: 2, cost: 8, kind: 'debuff', eff: 'weakness', target: 'enemy', d: '-3 attack for an enemy stack.' },
    blind: { name: 'Blind', lvl: 2, cost: 10, kind: 'debuff', eff: 'blind', target: 'enemy', d: 'Enemy stack cannot act until attacked.' },
    fortune: { name: 'Fortune', lvl: 2, cost: 7, kind: 'buff', eff: 'fortune', target: 'ally', d: '+2 luck for a friendly stack.' },
    fireball: { name: 'Fireball', lvl: 3, cost: 15, kind: 'area', base: 15, per: 10, radius: 1, target: 'hex', d: 'Deals {dmg} damage to all stacks in a small area.' },
    frostring: { name: 'Frost Ring', lvl: 3, cost: 12, kind: 'ring', base: 15, per: 10, target: 'hex', d: 'Deals {dmg} damage to stacks around the target hex.' },
    masshaste: { name: 'Mass Haste', lvl: 3, cost: 16, kind: 'buff', eff: 'haste', mass: 1, target: 'none', d: 'Hastes all friendly stacks.' },
    massslow: { name: 'Mass Slow', lvl: 3, cost: 16, kind: 'debuff', eff: 'slow', mass: 1, target: 'none', d: 'Slows all enemy stacks.' },
    townportal: { name: 'Town Portal', lvl: 3, cost: 16, kind: 'adv', target: 'none', d: 'Teleports the hero to the nearest friendly town.' },
    chain: { name: 'Chain Lightning', lvl: 4, cost: 24, kind: 'chain', base: 25, per: 40, target: 'enemy', d: 'Deals {dmg} damage, jumping to 3 more stacks at half power each time.' },
    meteor: { name: 'Meteor Shower', lvl: 4, cost: 16, kind: 'area', base: 25, per: 25, radius: 1, target: 'hex', d: 'Deals {dmg} damage to all stacks in a small area.' },
    prayer: { name: 'Prayer', lvl: 4, cost: 16, kind: 'buff', eff: 'prayer', mass: 1, target: 'none', d: '+2 attack, defense and speed to all friendly stacks.' },
    resurrection: { name: 'Resurrection', lvl: 4, cost: 20, kind: 'raise', base: 30, per: 40, target: 'ally', d: 'Restores {dmg} HP of slain creatures in a friendly stack.' },
    armageddon: { name: 'Armageddon', lvl: 4, cost: 24, kind: 'all', base: 30, per: 50, target: 'none', d: 'Deals {dmg} damage to every stack on the battlefield.' },
    implosion: { name: 'Implosion', lvl: 5, cost: 30, kind: 'dmg', base: 100, per: 75, target: 'enemy', d: 'Deals {dmg} damage to an enemy stack.' },
    dimensiondoor: { name: 'Dimension Door', lvl: 5, cost: 25, kind: 'adv', target: 'tile', d: 'Teleports the hero up to 9 tiles to a visible empty spot.' },
};
const SPELL_IDS = Object.keys(SPELLS);
const EFFECTS = {
    haste: { name: 'Haste', good: 1 }, slow: { name: 'Slow' }, bless: { name: 'Bless', good: 1 }, curse: { name: 'Curse' },
    bloodlust: { name: 'Bloodlust', good: 1 }, stoneskin: { name: 'Stone Skin', good: 1 }, shield: { name: 'Shield', good: 1 },
    weakness: { name: 'Weakness' }, blind: { name: 'Blind' }, fortune: { name: 'Fortune', good: 1 }, prayer: { name: 'Prayer', good: 1 },
};

// Artifacts. slot: head neck cloak torso weapon shield ring feet misc. b: bonuses.
const ARTIFACTS = {
    centauraxe: { name: "Centaur's Axe", slot: 'weapon', cls: 1, b: { att: 2 } },
    blackshard: { name: 'Blackshard of the Dead Knight', slot: 'weapon', cls: 1, b: { att: 3 } },
    gnollflail: { name: "Greater Gnoll's Flail", slot: 'weapon', cls: 2, b: { att: 4 } },
    ogreclub: { name: "Ogre's Club of Havoc", slot: 'weapon', cls: 2, b: { att: 5 } },
    hellfire: { name: 'Sword of Hellfire', slot: 'weapon', cls: 3, b: { att: 6 } },
    titangladius: { name: "Titan's Gladius", slot: 'weapon', cls: 4, b: { att: 12, def: -3 } },
    dwarvenshield: { name: 'Shield of the Dwarven Lords', slot: 'shield', cls: 1, b: { def: 2 } },
    yawningshield: { name: 'Shield of the Yawning Dead', slot: 'shield', cls: 1, b: { def: 3 } },
    gnollbuckler: { name: 'Buckler of the Gnoll King', slot: 'shield', cls: 2, b: { def: 4 } },
    ogretarg: { name: 'Targ of the Rampaging Ogre', slot: 'shield', cls: 2, b: { def: 5 } },
    sentinelshield: { name: "Sentinel's Shield", slot: 'shield', cls: 4, b: { def: 12, att: -3 } },
    unicornhelm: { name: 'Helm of the Alabaster Unicorn', slot: 'head', cls: 1, b: { know: 1 } },
    skullhelm: { name: 'Skull Helmet', slot: 'head', cls: 1, b: { know: 2 } },
    helmchaos: { name: 'Helm of Chaos', slot: 'head', cls: 2, b: { know: 3 } },
    dragontooth: { name: 'Crown of Dragontooth', slot: 'head', cls: 3, b: { pow: 4, know: 4 } },
    petrifiedplate: { name: 'Breastplate of Petrified Wood', slot: 'torso', cls: 1, b: { pow: 1 } },
    ribcage: { name: 'Rib Cage', slot: 'torso', cls: 1, b: { pow: 2 } },
    basiliskscales: { name: 'Scales of the Greater Basilisk', slot: 'torso', cls: 2, b: { pow: 3 } },
    cyclopstunic: { name: 'Tunic of the Cyclops King', slot: 'torso', cls: 2, b: { pow: 4 } },
    swiftness: { name: 'Necklace of Swiftness', slot: 'neck', cls: 1, b: { spd: 1 } },
    pendantcourage: { name: 'Pendant of Courage', slot: 'neck', cls: 3, b: { luck: 3, morale: 3 } },
    celestialnecklace: { name: 'Celestial Necklace of Bliss', slot: 'neck', cls: 3, b: { att: 3, def: 3, pow: 3, know: 3 } },
    dragonwing: { name: 'Dragon Wing Tabard', slot: 'cloak', cls: 2, b: { pow: 2, know: 2 } },
    angelcape: { name: 'Cape of Velocity', slot: 'cloak', cls: 2, b: { spd: 2 } },
    ringvitality: { name: 'Ring of Vitality', slot: 'ring', cls: 2, b: { hp: 1 } },
    ringwayfarer: { name: 'Ring of the Wayfarer', slot: 'ring', cls: 2, b: { spd: 1 } },
    ringlife: { name: 'Ring of Life', slot: 'ring', cls: 2, b: { hp: 1 } },
    quietring: { name: 'Equestrian Ring', slot: 'ring', cls: 2, b: { move: 300 } },
    bootsspeed: { name: 'Boots of Speed', slot: 'feet', cls: 3, b: { move: 600 } },
    sandals: { name: 'Sandals of the Saint', slot: 'feet', cls: 3, b: { att: 2, def: 2, pow: 2, know: 2 } },
    clover: { name: 'Clover of Fortune', slot: 'misc', cls: 1, b: { luck: 1 } },
    badgecourage: { name: 'Badge of Courage', slot: 'misc', cls: 1, b: { morale: 1 } },
    goldbag: { name: 'Endless Purse of Gold', slot: 'misc', cls: 2, b: { gold: 750 } },
    goldsack: { name: 'Endless Sack of Gold', slot: 'misc', cls: 3, b: { gold: 1000 } },
    charmmana: { name: 'Charm of Mana', slot: 'misc', cls: 1, b: { mana: 1 } },
    orbmana: { name: 'Mystic Orb of Mana', slot: 'misc', cls: 2, b: { mana: 3 } },
    spyglass: { name: 'Spyglass', slot: 'misc', cls: 1, b: { sight: 1 } },
    orbfirmament: { name: 'Orb of the Firmament', slot: 'misc', cls: 3, b: { spell: 50 } },
    tomeknowledge: { name: 'Tome of Lost Lore', slot: 'misc', cls: 3, b: { know: 5 } },
};
const ART_IDS = Object.keys(ARTIFACTS);
const ART_SLOTS = ['head', 'neck', 'cloak', 'torso', 'weapon', 'shield', 'ring1', 'ring2', 'feet', 'misc1', 'misc2', 'misc3', 'misc4'];
const ART_CLASS = ['', 'Treasure', 'Minor', 'Major', 'Relic'];

// Town buildings. req: list of building ids; cost: resources; rare amounts filled per faction.
const BUILDINGS = {
    hall1: { name: 'Village Hall', cost: {}, req: [], d: 'Produces 500 gold per day.' },
    hall2: { name: 'Town Hall', cost: { gold: 2500 }, req: ['hall1', 'tavern'], d: 'Produces 1000 gold per day.' },
    hall3: { name: 'City Hall', cost: { gold: 5000 }, req: ['hall2', 'market', 'blacksmith', 'mage1'], d: 'Produces 2000 gold per day.' },
    hall4: { name: 'Capitol', cost: { gold: 10000 }, req: ['hall3', 'castle'], d: 'Produces 4000 gold per day. Only one per kingdom.' },
    fort: { name: 'Fort', cost: { gold: 5000, wood: 20, ore: 20 }, req: [], d: 'Raises walls around the town and allows creature dwellings.' },
    citadel: { name: 'Citadel', cost: { gold: 2500, ore: 5 }, req: ['fort'], d: 'Adds an arrow tower and increases creature growth by 50%.' },
    castle: { name: 'Castle', cost: { gold: 5000, wood: 10, ore: 10 }, req: ['citadel'], d: 'Adds two more arrow towers and doubles creature growth.' },
    tavern: { name: 'Tavern', cost: { gold: 500, wood: 5 }, req: [], d: 'Allows hiring heroes. +1 morale to defenders.' },
    market: { name: 'Marketplace', cost: { gold: 500, wood: 5 }, req: [], d: 'Allows trading resources.' },
    silo: { name: 'Resource Silo', cost: { gold: 5000, ore: 5 }, req: ['market'], d: 'Produces extra resources every day.' },
    blacksmith: { name: 'Blacksmith', cost: { gold: 1000, wood: 5 }, req: [], d: 'Sells the Ballista and First Aid Tent.' },
    mage1: { name: 'Mage Guild Lv. 1', cost: { gold: 2000, wood: 5, ore: 5 }, req: [], d: 'Teaches level 1 spells.' },
    mage2: { name: 'Mage Guild Lv. 2', cost: { gold: 1000, wood: 5, ore: 5, rare: 4 }, req: ['mage1'], d: 'Teaches level 2 spells.' },
    mage3: { name: 'Mage Guild Lv. 3', cost: { gold: 1000, wood: 5, ore: 5, rare: 6 }, req: ['mage2'], d: 'Teaches level 3 spells.' },
    mage4: { name: 'Mage Guild Lv. 4', cost: { gold: 1000, wood: 5, ore: 5, rare: 8 }, req: ['mage3'], d: 'Teaches level 4 spells.' },
    mage5: { name: 'Mage Guild Lv. 5', cost: { gold: 1000, wood: 5, ore: 5, rare: 10 }, req: ['mage4'], d: 'Teaches level 5 spells.' },
};
const DWELL_COST = [
    { gold: 400, ore: 5 }, { gold: 1000, wood: 5, ore: 5 }, { gold: 1000, ore: 5, wood: 5 }, { gold: 2000, ore: 10, rare: 5 },
    { gold: 3000, wood: 10, ore: 5, rare: 5 }, { gold: 4000, wood: 10, ore: 10, rare: 10 }, { gold: 15000, wood: 10, ore: 10, rare: 20 },
];
const UPG_COST = [
    { gold: 200, ore: 5 }, { gold: 1000, wood: 5, ore: 5 }, { gold: 1000, wood: 5, ore: 5, rare: 5 }, { gold: 2000, ore: 5, rare: 5 },
    { gold: 3000, wood: 5, ore: 5, rare: 5 }, { gold: 5000, wood: 10, ore: 10, rare: 10 }, { gold: 20000, wood: 15, ore: 15, rare: 25 },
];
const DWELL_REQ = [['fort'], ['d1'], ['d1'], ['d2', 'mage1'], ['d3', 'mage1'], ['d4', 'blacksmith'], ['d5', 'citadel']];
for (let t = 1; t <= 7; t++) {
    BUILDINGS['d' + t] = { name: null, tier: t, cost: DWELL_COST[t - 1], req: DWELL_REQ[t - 1], d: 'Creature dwelling.' };
    BUILDINGS['u' + t] = { name: null, tier: t, up: 1, cost: UPG_COST[t - 1], req: ['d' + t].concat(t >= 6 ? ['hall2'] : t >= 4 ? ['blacksmith'] : []), d: 'Upgraded dwelling.' };
}
const BUILDING_IDS = Object.keys(BUILDINGS);
const MAGE_LEVELS = { castle: 4, rampart: 5, tower: 5, inferno: 5, necropolis: 5, stronghold: 3 };
const GUILD_SLOTS = [3, 3, 2, 2, 2];
const WAR_MACHINES = {
    ballista: { name: 'Ballista', cost: 2500, d: 'Fires twice each round at the enemy.' },
    tent: { name: 'First Aid Tent', cost: 750, d: 'Heals a friendly stack each round.' },
};

// Adventure-map visitable buildings.
const SITES = {
    windmill: { name: 'Windmill', d: 'Gives a rare resource once per week.' },
    waterwheel: { name: 'Water Wheel', d: 'Gives 1000 gold once per week.' },
    well: { name: 'Magic Well', d: 'Restores spell points once per day.' },
    shrine1: { name: 'Shrine of Magic Incantation', d: 'Teaches a level 1 spell.' },
    shrine2: { name: 'Shrine of Magic Gesture', d: 'Teaches a level 2 spell.' },
    shrine3: { name: 'Shrine of Magic Thought', d: 'Teaches a level 3 spell.' },
    witch: { name: "Witch Hut", d: 'Teaches a secondary skill.' },
    arena: { name: 'Arena', d: '+2 Attack or +2 Defense, once per hero.' },
    merc: { name: 'Mercenary Camp', d: '+1 Attack, once per hero.' },
    marletto: { name: 'Marletto Tower', d: '+1 Defense, once per hero.' },
    staraxis: { name: 'Star Axis', d: '+1 Spell Power, once per hero.' },
    garden: { name: 'Garden of Revelation', d: '+1 Knowledge, once per hero.' },
    learnstone: { name: 'Learning Stone', d: '+1000 experience, once per hero.' },
    tree: { name: 'Tree of Knowledge', d: 'Grants one experience level, once per hero.' },
    temple: { name: 'Temple', d: '+1 morale until the next battle.' },
    fountain: { name: 'Fountain of Fortune', d: 'Luck until the next battle.' },
    stables: { name: 'Stables', d: 'Extra movement for the rest of the week.' },
    scholar: { name: 'Scholar', d: 'Teaches a primary skill, a spell or a secondary skill.' },
    monolith: { name: 'Two-Way Monolith', d: 'Teleports to its twin.' },
    prison: { name: 'Prison', d: 'A hero is held captive here.' },
    pandora: { name: "Pandora's Box", d: 'Might hold a fortune, or a fight.' },
    oasis: { name: 'Oasis', d: '+800 movement and +1 morale, once per hero per week.' },
    sanctuary: { name: 'Library of Enlightenment', d: '+2 to all primary skills for heroes level 10 or above.' },
};
const MINE_INFO = {
    gold: { name: 'Gold Mine', amt: 1000 }, wood: { name: 'Sawmill', amt: 2 }, ore: { name: 'Ore Pit', amt: 2 },
    mercury: { name: 'Alchemist\'s Lab', amt: 1 }, sulfur: { name: 'Sulfur Dune', amt: 1 }, crystal: { name: 'Crystal Cavern', amt: 1 }, gems: { name: 'Gem Pond', amt: 1 },
};

const DIFFICULTY = [
    { name: 'Easy', res: { gold: 30000, wood: 30, ore: 30, mercury: 15, sulfur: 15, crystal: 15, gems: 15 }, ai: 0.8, mon: 0.7, aiRes: 0.8 },
    { name: 'Normal', res: { gold: 20000, wood: 20, ore: 20, mercury: 10, sulfur: 10, crystal: 10, gems: 10 }, ai: 1.0, mon: 1.0, aiRes: 1.0 },
    { name: 'Hard', res: { gold: 15000, wood: 15, ore: 15, mercury: 7, sulfur: 7, crystal: 7, gems: 7 }, ai: 1.15, mon: 1.25, aiRes: 1.3 },
    { name: 'Expert', res: { gold: 10000, wood: 10, ore: 10, mercury: 4, sulfur: 4, crystal: 4, gems: 4 }, ai: 1.3, mon: 1.5, aiRes: 1.6 },
];
const MAP_SIZES = [
    { name: 'Small', n: 36, maxP: 4 }, { name: 'Medium', n: 54, maxP: 6 }, { name: 'Large', n: 72, maxP: 8 }, { name: 'Extra Large', n: 96, maxP: 8 },
];

// experience needed for each level (index = level)
const LEVEL_EXP = [0, 0, 1000, 2000, 3200, 4600, 6200, 8000, 10000, 12200, 14700, 17500, 20600, 24320];
while (LEVEL_EXP.length < 80) {
    const n = LEVEL_EXP.length;
    LEVEL_EXP.push(Math.round(LEVEL_EXP[n - 1] + (LEVEL_EXP[n - 1] - LEVEL_EXP[n - 2]) * 1.2));
}

function plural(name) {
    if (/(Dead|Cyclops|Efreeti)$/.test(name)) return name;
    if (/man$/.test(name)) return name.replace(/man$/, 'men');
    if (/[Ee]lf$/.test(name)) return name.replace(/lf$/, 'lves');
    if (/arf$/.test(name)) return name.replace(/arf$/, 'arves');
    if (/(ch|sh|s|x)$/.test(name)) return name + 'es';
    if (/[^aeiou]y$/.test(name)) return name.slice(0, -1) + 'ies';
    return name + 's';
}
function creatureCost(cid, n = 1) {
    const c = CREATURES[cid], out = { gold: c.cost * n };
    if (c.extra) for (const k in c.extra) out[k] = c.extra[k] * n;
    return out;
}
function buildingName(fac, bid) {
    const b = BUILDINGS[bid];
    if (b.tier) {
        const base = FACTIONS[fac].dwell[b.tier - 1];
        return b.up ? 'Upg. ' + base : base;
    }
    return b.name;
}
function buildingCost(fac, bid) {
    const c = Object.assign({}, BUILDINGS[bid].cost);
    if (c.rare) { c[FACTIONS[fac].rare] = c.rare; delete c.rare; }
    return c;
}
