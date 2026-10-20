// Static game data: terrain, resources, units, buildings, technologies, edicts, civilizations.
// Everything here is plain data so the rules engine can also run headless (see tools/sim.js).

var TILE = 32;
var MAX_TURNS = 300;

var TERRAIN = {
  ocean:     { name: 'Ocean',     food: 1, prod: 0, gold: 1, move: 99, def: 0,    water: true, color: 0x1b4a85 },
  coast:     { name: 'Coast',     food: 2, prod: 0, gold: 1, move: 99, def: 0,    water: true, color: 0x2e78b8 },
  grass:     { name: 'Grassland', food: 2, prod: 0, gold: 0, move: 1,  def: 0,    color: 0x5c9e3c },
  plains:    { name: 'Plains',    food: 1, prod: 1, gold: 0, move: 1,  def: 0,    color: 0xa9a24c },
  desert:    { name: 'Desert',    food: 0, prod: 1, gold: 0, move: 1,  def: 0,    color: 0xdcc47e },
  tundra:    { name: 'Tundra',    food: 1, prod: 0, gold: 0, move: 1,  def: 0,    color: 0x93a093 },
  snow:      { name: 'Snow',      food: 0, prod: 0, gold: 0, move: 1,  def: 0,    color: 0xe8eef2 },
  forest:    { name: 'Forest',    food: 1, prod: 2, gold: 0, move: 2,  def: 0.25, color: 0x2f6a2c },
  hills:     { name: 'Hills',     food: 1, prod: 1, gold: 0, move: 2,  def: 0.5,  color: 0x8f804f },
  mountains: { name: 'Mountains', food: 0, prod: 1, gold: 0, move: 3,  def: 1.0,  noCity: true, color: 0x7a736c },
};

// kind: food (counts for food variety), luxury (+1 happiness everywhere when connected),
// strategic (yields a stockpiled good). A resource is "connected" when its improvement is built
// and the tile lies inside your borders.
var RESOURCES = {
  wheat:  { name: 'Wheat',  icon: '🌾', on: ['grass', 'plains'],              food: 2, imp: 'farm',    kind: 'food' },
  cattle: { name: 'Cattle', icon: '🐄', on: ['grass', 'plains'],              food: 1, prod: 1, imp: 'pasture', kind: 'food' },
  fish:   { name: 'Fish',   icon: '🐟', on: ['coast'],                        food: 2, imp: null,      kind: 'food' },
  horses: { name: 'Horses', icon: '🐎', on: ['plains', 'grass', 'tundra'],    prod: 1, imp: 'pasture', kind: 'strategic', good: 'horses', amount: 1 },
  iron:   { name: 'Iron',   icon: '🔩', on: ['hills', 'mountains', 'desert'], prod: 1, imp: 'mine',    kind: 'strategic', good: 'iron', amount: 3 },
  stone:  { name: 'Stone',  icon: '🪨', on: ['hills', 'plains', 'desert'],    prod: 1, imp: 'quarry',  kind: 'strategic', good: 'stone', amount: 2 },
  gold:   { name: 'Gold',   icon: '💰', on: ['hills', 'desert', 'mountains'], gold: 3, imp: 'mine',    kind: 'luxury' },
  gems:   { name: 'Gems',   icon: '💎', on: ['hills', 'forest', 'mountains'], gold: 2, imp: 'mine',    kind: 'luxury' },
  wine:   { name: 'Wine',   icon: '🍇', on: ['grass', 'plains', 'hills'],     gold: 2, imp: 'farm',    kind: 'luxury' },
  spices: { name: 'Spices', icon: '🌶️', on: ['grass', 'forest'],             gold: 2, food: 1, imp: 'farm', kind: 'luxury' },
  furs:   { name: 'Furs',   icon: '🦊', on: ['forest', 'tundra'],             gold: 2, imp: 'lumber',  kind: 'luxury' },
};

var GOODS = {
  wood:   { name: 'Wood',   icon: '🪵', price: 2 },
  stone:  { name: 'Stone',  icon: '🪨', price: 3 },
  iron:   { name: 'Iron',   icon: '🔩', price: 4 },
  horses: { name: 'Horses', icon: '🐎', price: 4 },
};

var IMPROVEMENTS = {
  farm:    { name: 'Farm',        turns: 4, on: ['grass', 'plains', 'desert', 'tundra'], tech: null },
  mine:    { name: 'Mine',        turns: 5, on: ['hills'], tech: null },
  lumber:  { name: 'Lumber Camp', turns: 4, on: ['forest'], tech: null },
  quarry:  { name: 'Quarry',      turns: 5, on: ['hills'], tech: 'masonry' },
  pasture: { name: 'Pasture',     turns: 4, on: [], tech: 'horseback' },
  road:    { name: 'Road',        turns: 2, on: null, tech: null },
};

// atk/def/moves. Goods are consumed when the unit is finished.
var UNITS = {
  settler:   { name: 'Settler',   icon: '🏕️', cost: 30,  atk: 0,  def: 1,  moves: 1, civilian: true, settler: true },
  worker:    { name: 'Worker',    icon: '⛏️', cost: 20,  atk: 0,  def: 0,  moves: 1, civilian: true, worker: true },
  scout:     { name: 'Scout',     icon: '🔭', cost: 12,  atk: 0,  def: 1,  moves: 2, civilian: true, sight: 2 },
  warrior:   { name: 'Warrior',   icon: '🪓', cost: 10,  atk: 1,  def: 1,  moves: 1, obs: 'swordsman' },
  archer:    { name: 'Archer',    icon: '🏹', cost: 25,  atk: 3,  def: 2,  moves: 1, tech: 'archery', obs: 'musketman', goods: { wood: 3 } },
  spearman:  { name: 'Spearman',  icon: '🔱', cost: 20,  atk: 1,  def: 2,  moves: 1, tech: 'bronze', antiMounted: true, obs: 'pikeman' },
  horseman:  { name: 'Horseman',  icon: '🐎', cost: 20,  atk: 2,  def: 1,  moves: 2, tech: 'horseback', mounted: true, obs: 'knight', goods: { horses: 2 } },
  swordsman: { name: 'Swordsman', icon: '⚔️', cost: 30,  atk: 4,  def: 2,  moves: 1, tech: 'ironworking', obs: 'musketman', goods: { iron: 4 } },
  catapult:  { name: 'Catapult',  icon: '☄️', cost: 40,  atk: 6,  def: 1,  moves: 1, tech: 'mathematics', siege: true, obs: 'cannon', goods: { wood: 8 } },
  pikeman:   { name: 'Pikeman',   icon: '🛡️', cost: 30,  atk: 1,  def: 4,  moves: 1, tech: 'feudalism', antiMounted: true, obs: 'musketman', goods: { iron: 2 } },
  knight:    { name: 'Knight',    icon: '🏇', cost: 45,  atk: 5,  def: 3,  moves: 2, tech: 'chivalry', mounted: true, obs: 'cavalry', goods: { horses: 2, iron: 3 } },
  musketman: { name: 'Musketman', icon: '💂', cost: 45,  atk: 3,  def: 6,  moves: 1, tech: 'gunpowder', obs: 'rifleman', goods: { iron: 4 } },
  cannon:    { name: 'Cannon',    icon: '💣', cost: 55,  atk: 8,  def: 1,  moves: 1, tech: 'metallurgy', siege: true, obs: 'artillery', goods: { iron: 8 } },
  cavalry:   { name: 'Cavalry',   icon: '🐴', cost: 60,  atk: 8,  def: 3,  moves: 2, tech: 'militarytradition', mounted: true, obs: 'tank', goods: { horses: 3 } },
  rifleman:  { name: 'Rifleman',  icon: '🎖️', cost: 60,  atk: 5,  def: 9,  moves: 1, tech: 'conscription', goods: { iron: 4 } },
  artillery: { name: 'Artillery', icon: '🎯', cost: 80,  atk: 12, def: 2,  moves: 1, tech: 'machinetools', siege: true, goods: { iron: 10 } },
  tank:      { name: 'Tank',      icon: '🚙', cost: 120, atk: 16, def: 8,  moves: 3, tech: 'automobile', goods: { iron: 15 } },
};

// fx keys: foodPct, prodPct, goldPct, sciPct, happy, housing, walls, granary, veteran, waterFood, waterGold, wood
var BUILDINGS = {
  palace:      { name: 'Palace',         cost: 0,   upkeep: 0, fx: { happy: 1 }, noBuild: true, desc: 'Capital. +1 happy, +3 commerce.' },
  granary:     { name: 'Granary',        cost: 40,  upkeep: 1, tech: 'pottery',     goods: { wood: 6 },  fx: { granary: true }, desc: 'Keeps half the food when the city grows.' },
  barracks:    { name: 'Barracks',       cost: 30,  upkeep: 1, tech: null,          goods: { wood: 5 },  fx: { veteran: true }, desc: 'New military units are veterans (+50%).' },
  sawmill:     { name: 'Sawmill',        cost: 35,  upkeep: 1, tech: 'bronze',      goods: { stone: 4 }, fx: { wood: 2, prodPct: 10 }, desc: '+2 wood per turn, +10% production.' },
  walls:       { name: 'City Walls',     cost: 50,  upkeep: 1, tech: 'masonry',     goods: { stone: 15 }, fx: { walls: true }, desc: '+100% defence for units in the city.' },
  temple:      { name: 'Temple',         cost: 35,  upkeep: 1, tech: 'ceremonial',  goods: { stone: 6 }, fx: { happy: 2 }, desc: '+2 happy.' },
  library:     { name: 'Library',        cost: 60,  upkeep: 1, tech: 'writing',     goods: { wood: 10 }, fx: { sciPct: 50 }, desc: '+50% science.' },
  marketplace: { name: 'Marketplace',    cost: 60,  upkeep: 1, tech: 'currency',    goods: { wood: 10 }, fx: { goldPct: 50, happy: 1 }, desc: '+50% gold, +1 happy.' },
  harbor:      { name: 'Harbor',         cost: 50,  upkeep: 1, tech: 'pottery',     goods: { wood: 12 }, fx: { waterFood: 1 }, coastal: true, desc: '+1 food on water tiles.' },
  colosseum:   { name: 'Colosseum',      cost: 70,  upkeep: 2, tech: 'construction', goods: { stone: 20 }, fx: { happy: 3 }, desc: '+3 happy.' },
  aqueduct:    { name: 'Aqueduct',       cost: 70,  upkeep: 1, tech: 'engineering', goods: { stone: 20 }, fx: { housing: 8 }, desc: 'Housing limit +8 (8 → 16).' },
  forge:       { name: 'Forge',          cost: 80,  upkeep: 1, tech: 'ironworking', goods: { stone: 10, wood: 10 }, fx: { prodPct: 25, iron: 1 }, desc: '+25% production, +1 iron per turn.' },
  cathedral:   { name: 'Cathedral',      cost: 100, upkeep: 2, tech: 'monotheism',  goods: { stone: 25 }, fx: { happy: 3 }, desc: '+3 happy.' },
  university:  { name: 'University',     cost: 120, upkeep: 2, tech: 'university',  goods: { wood: 15, stone: 10 }, fx: { sciPct: 50 }, req: 'library', desc: '+50% science (needs Library).' },
  bank:        { name: 'Bank',           cost: 100, upkeep: 2, tech: 'banking',     goods: { stone: 10 }, fx: { goldPct: 30 }, req: 'marketplace', desc: '+30% gold (needs Marketplace).' },
  sewer:       { name: 'Sewer System',   cost: 120, upkeep: 2, tech: 'sanitation',  goods: { stone: 20, iron: 5 }, fx: { housing: 10 }, req: 'aqueduct', desc: 'Housing limit +10 (needs Aqueduct).' },
  factory:     { name: 'Factory',        cost: 180, upkeep: 3, tech: 'industrialization', goods: { iron: 20 }, fx: { prodPct: 50, iron: 2 }, desc: '+50% production, +2 iron per turn.' },
  stockexchange: { name: 'Stock Exchange', cost: 150, upkeep: 3, tech: 'economics', goods: { stone: 15 }, fx: { goldPct: 40 }, req: 'bank', desc: '+40% gold (needs Bank).' },
  powerplant:  { name: 'Power Plant',    cost: 160, upkeep: 3, tech: 'electricity', goods: { iron: 15 }, fx: { prodPct: 30 }, req: 'factory', desc: '+30% production (needs Factory).' },
  researchlab: { name: 'Research Lab',   cost: 180, upkeep: 3, tech: 'computers',   goods: { iron: 10 }, fx: { sciPct: 75 }, req: 'university', desc: '+75% science (needs University).' },
};

// World wonders: one per world. gfx = empire-wide effects.
var WONDERS = {
  pyramids:    { name: 'Pyramids',          cost: 160, tech: 'masonry',    goods: { stone: 40 }, fx: { prodPct: 25 }, desc: '+25% production in this city.' },
  colossus:    { name: 'Colossus',          cost: 140, tech: 'bronze',     goods: { iron: 15 }, fx: { waterGold: 1 }, coastal: true, desc: '+1 gold on water tiles here.' },
  gardens:     { name: 'Hanging Gardens',   cost: 180, tech: 'pottery',    goods: { stone: 30 }, gfx: { happy: 1 }, desc: '+1 happy in all your cities.' },
  greatlibrary:{ name: 'Great Library',     cost: 220, tech: 'philosophy', goods: { wood: 30 }, fx: { sciPct: 100 }, desc: '+100% science in this city.' },
  greatwall:   { name: 'Great Wall',        cost: 200, tech: 'construction', goods: { stone: 50 }, gfx: { walls: true }, desc: 'Acts as City Walls in all your cities.' },
  chapel:      { name: "Michelangelo's Chapel", cost: 300, tech: 'monotheism', goods: { stone: 40 }, gfx: { happy: 2 }, desc: '+2 happy in all your cities.' },
  copernicus:  { name: 'Copernicus Observatory', cost: 300, tech: 'university', goods: { wood: 30, stone: 20 }, gfx: { sciPct: 15 }, desc: '+15% science in all your cities.' },
  smith:       { name: "Adam Smith's Trading Co.", cost: 400, tech: 'economics', goods: { stone: 30 }, gfx: { goldPct: 20 }, desc: '+20% gold in all your cities.' },
  liberty:     { name: 'Statue of Liberty', cost: 450, tech: 'democracy',  goods: { iron: 30 }, gfx: { approval: 10 }, desc: 'All factions +10 approval (or +1 happy for AI).' },
  hoover:      { name: 'Hoover Dam',        cost: 600, tech: 'electricity', goods: { iron: 50, stone: 50 }, gfx: { prodPct: 25 }, desc: '+25% production in all your cities.' },
};

var PROJECTS = {
  colony: { name: 'Space Colony Ship', cost: 1200, tech: 'spaceflight', goods: { iron: 80 }, desc: 'Launch a colony to Alpha Centauri. Completing it wins the game.' },
};

var TECHS = {
  bronze:      { name: 'Bronze Working',    req: [] },
  pottery:     { name: 'Pottery',           req: [] },
  alphabet:    { name: 'Alphabet',          req: [] },
  archery:     { name: 'Archery',           req: [] },
  masonry:     { name: 'Masonry',           req: [] },
  horseback:   { name: 'Horseback Riding',  req: [] },
  ceremonial:  { name: 'Ceremonial Burial', req: [] },
  writing:     { name: 'Writing',           req: ['alphabet'] },
  ironworking: { name: 'Iron Working',      req: ['bronze'] },
  currency:    { name: 'Currency',          req: ['bronze'] },
  mathematics: { name: 'Mathematics',       req: ['alphabet', 'masonry'] },
  monarchy:    { name: 'Monarchy',          req: ['ceremonial', 'alphabet'] },
  construction:{ name: 'Construction',      req: ['masonry', 'currency'] },
  philosophy:  { name: 'Philosophy',        req: ['writing', 'monarchy'] },
  feudalism:   { name: 'Feudalism',         req: ['monarchy', 'ironworking'] },
  engineering: { name: 'Engineering',       req: ['construction', 'mathematics'] },
  monotheism:  { name: 'Monotheism',        req: ['philosophy'] },
  chivalry:    { name: 'Chivalry',          req: ['feudalism', 'horseback'] },
  banking:     { name: 'Banking',           req: ['currency', 'philosophy'] },
  university:  { name: 'University',        req: ['philosophy', 'mathematics'] },
  invention:   { name: 'Invention',         req: ['engineering', 'university'] },
  gunpowder:   { name: 'Gunpowder',         req: ['invention', 'ironworking'] },
  democracy:   { name: 'Democracy',         req: ['banking', 'invention'] },
  economics:   { name: 'Economics',         req: ['banking', 'university'] },
  metallurgy:  { name: 'Metallurgy',        req: ['gunpowder', 'university'] },
  militarytradition: { name: 'Military Tradition', req: ['chivalry', 'gunpowder'] },
  steam:       { name: 'Steam Engine',      req: ['invention'] },
  conscription:{ name: 'Conscription',      req: ['democracy', 'metallurgy'] },
  industrialization: { name: 'Industrialization', req: ['steam', 'economics'] },
  sanitation:  { name: 'Sanitation',        req: ['engineering', 'industrialization'] },
  electricity: { name: 'Electricity',       req: ['metallurgy', 'industrialization'] },
  machinetools:{ name: 'Machine Tools',     req: ['industrialization', 'conscription'] },
  combustion:  { name: 'Combustion',        req: ['electricity', 'steam'] },
  automobile:  { name: 'Automobile',        req: ['combustion', 'machinetools'] },
  computers:   { name: 'Computers',         req: ['electricity', 'sanitation'] },
  rocketry:    { name: 'Rocketry',          req: ['automobile', 'computers'] },
  spaceflight: { name: 'Space Flight',      req: ['rocketry'] },
};

// Tropico-style factions and edicts. fx = approval change while the edict is active.
var FACTIONS = {
  military:  { name: 'Military',  icon: '⚔️' },
  clergy:    { name: 'Clergy',    icon: '⛪' },
  merchants: { name: 'Merchants', icon: '💰' },
  peasants:  { name: 'Peasants',  icon: '🌾' },
};

var TAX_RATES = {
  low:    { name: 'Low',    gold: 0.3, fx: { merchants: 6, peasants: 10 } },
  normal: { name: 'Normal', gold: 0.5, fx: {} },
  high:   { name: 'High',   gold: 0.7, fx: { merchants: -8, peasants: -15 } },
};

var EDICTS = {
  martial:       { name: 'Martial Law',       tech: null,         cost: 0, fx: { military: 12, peasants: -10 }, desc: '+1 happy per garrisoned unit (max 3) in each city.' },
  festivals:     { name: 'Festivals',         tech: null,         costPerCity: 1, fx: { peasants: 12, clergy: -6 }, desc: '+1 happy in every city. Costs 1 gold per city.' },
  workethic:     { name: 'Work Ethic',        tech: null,         cost: 0, fx: { merchants: 8, peasants: -12 }, desc: '+15% production, -1 happy in every city.' },
  agrarian:      { name: 'Agrarian Reform',   tech: 'pottery',    cost: 2, fx: { peasants: 12, merchants: -8 }, desc: '+1 food in every city. Costs 2 gold.' },
  statereligion: { name: 'State Religion',    tech: 'ceremonial', cost: 0, fx: { clergy: 15, merchants: -6 }, desc: '+1 happy in cities with a Temple.' },
  conscription:  { name: 'Conscription',      tech: 'bronze',     cost: 0, fx: { military: 10, peasants: -12 }, desc: 'Military units cost 25% less production.' },
  freemarket:    { name: 'Free Market',       tech: 'currency',   cost: 0, fx: { merchants: 15, peasants: -6, clergy: -4 }, desc: '+20% gold.' },
  literacy:      { name: 'Literacy Campaign', tech: 'writing',    cost: 3, fx: { clergy: -8, peasants: 5 }, desc: '+20% science. Costs 3 gold.' },
  propaganda:    { name: 'Propaganda',        tech: 'monarchy',   cost: 4, fx: { military: 5, clergy: 5, merchants: 5, peasants: 5 }, desc: 'All factions +5. Costs 4 gold.' },
};

var CIVS = [
  { name: 'Croats',      adj: 'Croatian',   leader: 'King Tomislav',  color: 0xf4f4f4, cities: ['Biograd', 'Split', 'Zagreb', 'Zadar', 'Osijek', 'Rijeka', 'Dubrovnik', 'Pula', 'Šibenik', 'Varaždin', 'Koprivnica', 'Karlovac', 'Sisak', 'Knin', 'Nin', 'Trogir', 'Đurđevac', 'Vukovar', 'Makarska', 'Senj', 'Bjelovar', 'Čakovec', 'Požega', 'Gospić'] },
  { name: 'Romans',      adj: 'Roman',      leader: 'Julius Caesar',  color: 0xd83a34, cities: ['Roma', 'Antium', 'Cumae', 'Neapolis', 'Ravenna', 'Arretium', 'Mediolanum', 'Arpinum', 'Circei', 'Setia', 'Satricum', 'Ostia', 'Velitrae', 'Tarentum', 'Brundisium', 'Florentia', 'Capua', 'Verona', 'Aquileia', 'Pisae'] },
  { name: 'Greeks',      adj: 'Greek',      leader: 'Pericles',       color: 0x3a74e0, cities: ['Athens', 'Sparta', 'Corinth', 'Argos', 'Knossos', 'Mycenae', 'Pharsalos', 'Ephesus', 'Halicarnassus', 'Rhodes', 'Eretria', 'Pergamon', 'Miletos', 'Megara', 'Delphi', 'Thebes', 'Olympia', 'Larissa'] },
  { name: 'Egyptians',   adj: 'Egyptian',   leader: 'Cleopatra',      color: 0xf0c828, cities: ['Thebes', 'Memphis', 'Heliopolis', 'Elephantine', 'Alexandria', 'Pi-Ramesses', 'Giza', 'Byblos', 'Akhetaten', 'Hieraconpolis', 'Abydos', 'Asyut', 'Avaris', 'Lisht', 'Buto', 'Edfu', 'Pithom', 'Busiris'] },
  { name: 'Babylonians', adj: 'Babylonian', leader: 'Hammurabi',      color: 0x2cc0c0, cities: ['Babylon', 'Ur', 'Uruk', 'Nineveh', 'Assur', 'Lagash', 'Nippur', 'Kish', 'Eridu', 'Akkad', 'Larsa', 'Isin', 'Sippar', 'Mari', 'Ebla', 'Umma', 'Shuruppak'] },
  { name: 'Chinese',     adj: 'Chinese',    leader: 'Qin Shi Huang',  color: 0xf07a20, cities: ['Beijing', 'Shanghai', 'Guangzhou', 'Nanjing', 'Xian', 'Chengdu', 'Hangzhou', 'Wuhan', 'Kaifeng', 'Luoyang', 'Suzhou', 'Changsha', 'Tianjin', 'Harbin', 'Kunming', 'Jinan', 'Qingdao', 'Fuzhou'] },
  { name: 'Aztecs',      adj: 'Aztec',      leader: 'Montezuma',      color: 0xd040c0, cities: ['Tenochtitlan', 'Texcoco', 'Tlatelolco', 'Teotihuacan', 'Tlaxcala', 'Xochimilco', 'Malinalco', 'Tula', 'Cholula', 'Coyoacan', 'Azcapotzalco', 'Tlacopan', 'Chalco', 'Culhuacan', 'Iztapalapa', 'Tamuin'] },
  { name: 'Vikings',     adj: 'Viking',     leader: 'Harald Hardrada', color: 0x8a5ae8, cities: ['Trondheim', 'Kaupang', 'Hedeby', 'Birka', 'Uppsala', 'Roskilde', 'Ribe', 'Bergen', 'Nidaros', 'Jorvik', 'Dublin', 'Kiev', 'Novgorod', 'Hamar', 'Tunsberg', 'Sigtuna', 'Lund'] },
  { name: 'Mongols',     adj: 'Mongol',     leader: 'Genghis Khan',   color: 0x9a5a2a, cities: ['Karakorum', 'Beshbalik', 'Turfan', 'Hami', 'Almaliq', 'Kashgar', 'Khotan', 'Sarai', 'Otrar', 'Bukhara', 'Samarkand', 'Urgench', 'Merv', 'Tabriz', 'Khanbaliq', 'Shangdu'] },
  { name: 'Zulus',       adj: 'Zulu',       leader: 'Shaka',          color: 0xff7aa8, cities: ['Ulundi', 'Umgungundlovu', 'Nobamba', 'Bulawayo', 'KwaDukuza', 'Nongoma', 'Isandlwana', 'Ondini', 'Eshowe', 'Mahlabatini', 'Melmoth', 'Babanango', 'Dundee', 'Nkandla', 'Vryheid', 'Paulpietersburg'] },
];

var BARBARIAN_COLOR = 0x2a2a2a;

var MAP_SIZES = {
  small:  { name: 'Small',  w: 44,  h: 32, ai: 3 },
  medium: { name: 'Medium', w: 64,  h: 44, ai: 4 },
  large:  { name: 'Large',  w: 84,  h: 56, ai: 6 },
  huge:   { name: 'Huge',   w: 104, h: 68, ai: 8 },
};

// AI bonuses by difficulty (multipliers on AI yields) and the human's base content citizens.
var DIFFICULTIES = {
  easy:     { name: 'Chieftain', ai: 0.75, content: 5, aggression: 0.7 },
  normal:   { name: 'Prince',    ai: 1.0,  content: 4, aggression: 1.0 },
  hard:     { name: 'King',      ai: 1.25, content: 4, aggression: 1.2 },
  deity:    { name: 'Emperor',   ai: 1.5,  content: 3, aggression: 1.4 },
};

// Precompute tech tiers (1 + deepest prerequisite) and research cost.
(function () {
  function tier(k) {
    var t = TECHS[k];
    if (t.tier) return t.tier;
    var m = 0;
    t.req.forEach(function (r) { m = Math.max(m, tier(r)); });
    t.tier = m + 1;
    return t.tier;
  }
  Object.keys(TECHS).forEach(function (k) {
    tier(k);
    TECHS[k].cost = Math.round(26 * Math.pow(TECHS[k].tier, 1.75) + 10);
  });
})();

function techUnlocks(techKey) {
  var out = [];
  Object.keys(UNITS).forEach(function (k) { if (UNITS[k].tech === techKey) out.push(UNITS[k].name); });
  Object.keys(BUILDINGS).forEach(function (k) { if (BUILDINGS[k].tech === techKey) out.push(BUILDINGS[k].name); });
  Object.keys(WONDERS).forEach(function (k) { if (WONDERS[k].tech === techKey) out.push(WONDERS[k].name + ' (wonder)'); });
  Object.keys(PROJECTS).forEach(function (k) { if (PROJECTS[k].tech === techKey) out.push(PROJECTS[k].name); });
  Object.keys(IMPROVEMENTS).forEach(function (k) { if (IMPROVEMENTS[k].tech === techKey) out.push(IMPROVEMENTS[k].name + ' (improvement)'); });
  Object.keys(EDICTS).forEach(function (k) { if (EDICTS[k].tech === techKey) out.push(EDICTS[k].name + ' (edict)'); });
  return out;
}
