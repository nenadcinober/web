'use strict';
// Every move, Oolong's and the opponents'. Timings are in ms; opponents' windups are stretched
// (see startMove) so each attack has a readable tell. `strike` names the joints (or the weapon)
// that hit in the active phase. A `high` attack misses a crouching target and a `low` one a
// jumping target, which is also what the AI reads when it decides how to dodge. `air` moves stay
// active until the fighter lands; `jump` launches the fighter when the windup ends.
const MOVES = {
    punch: { pose: 'punch', wind: 60, act: 90, rec: 110, strike: ['fh'], dmg: 1, pts: 100, high: true },
    kick: { pose: 'kick', wind: 100, act: 100, rec: 160, strike: ['ff'], dmg: 1, pts: 200 },
    highkick: { pose: 'highkick', wind: 140, act: 110, rec: 200, strike: ['ff'], dmg: 2, pts: 300, high: true },
    lowpunch: { pose: 'lowpunch', crouch: true, wind: 60, act: 90, rec: 110, strike: ['fh'], dmg: 1, pts: 100, low: true },
    sweep: { pose: 'sweep', crouch: true, wind: 110, act: 110, rec: 200, strike: ['ff'], dmg: 1, pts: 200, low: true },
    flykick: { pose: 'flykick', air: true, wind: 60, strike: ['ff'], dmg: 2, pts: 400, landRec: 120 },
    flypunch: { pose: 'flypunch', air: true, wind: 50, strike: ['fh'], dmg: 1, pts: 300, high: true, landRec: 100 },

    slap: { pose: 'punch', windPose: 'throwback', wind: 140, act: 110, rec: 240, strike: ['fh'], dmg: 1, high: true },
    leap: { pose: 'belly', windPose: 'crouch', wind: 200, jump: 110, leap: true, air: true, strike: ['head', 'fh'], dmg: 2, landRec: 520, high: true },
    jumpkick: { pose: 'flykick', windPose: 'crouch', wind: 140, jump: 160, jumpVx: 85, air: true, strike: ['ff'], dmg: 1, landRec: 260 },
    jumpslash: { pose: 'thrust', windPose: 'crouch', wind: 160, jump: 160, jumpVx: 85, air: true, strike: 'weapon', dmg: 2, landRec: 300 },
    minijump: { pose: 'flykick', windPose: 'crouch', wind: 110, jump: 125, jumpVx: 95, air: true, strike: ['ff'], dmg: 1, landRec: 320 },
    throwHigh: { pose: 'punch', windPose: 'throwback', wind: 220, act: 60, rec: 260, projectile: 'high', cd: 900 },
    throwLow: { pose: 'lowpunch', windPose: 'crouch', wind: 200, act: 60, rec: 260, projectile: 'low', cd: 900 },
    wHigh: { pose: 'thrust', windPose: 'swing', wind: 200, act: 120, rec: 260, strike: 'weapon', dmg: 1, high: true },
    wLow: { pose: 'lowswing', windPose: 'crouch', wind: 200, act: 120, rec: 260, strike: 'weapon', dmg: 1, low: true },
    smash: { pose: 'smash', windPose: 'swing', wind: 320, act: 140, rec: 380, strike: 'weapon', dmg: 2 },
};

const OOLONG = { gi: C.white, pants: C.white, belt: C.red, hairStyle: 'top', band: C.red, shoes: C.black };

// ai.moves: [move, weight, min distance, max distance]. tempo stretches windups and recoveries.
const OPPONENTS = [
    {
        id: 'buchu', name: 'BUCHU', hp: 9, tempo: 1.25, arms: 'trbuh tvrd kao kamen',
        look: { gi: 0xc88a5c, pants: C.cyan, belt: C.red, hairStyle: 'bald', mustache: C.black, shoes: C.brown, size: 1.18, fat: true },
        taunt: 'Moj trbuh je tvrđi od zidina Shaolina!',
        tip: 'Kad Buchu poleti trbuhom naprijed, čučni (↓) — preletjet će te. Udari ga dok se diže.',
        ai: { speed: 38, think: 320, aggr: 0.55, dodge: 0.1, range: 44, moves: [['slap', 3, 0, 32], ['leap', 2, 46, 120]] },
    },
    {
        id: 'star', name: 'STAR', hp: 9, tempo: 1.05, arms: 'šuriken zvijezde',
        look: { gi: C.purple, pants: C.purple, sleeve: C.purple, belt: C.yellow, hairStyle: 'pony', shoes: C.black, weapon: 'star' },
        taunt: 'Moje zvijezde lete brže od tvojih nogu.',
        tip: 'Visoke zvijezde preskoči čučnjem, niske skokom (↑). Udarac nogom razbija zvijezdu u letu.',
        ai: { speed: 55, think: 260, aggr: 0.6, dodge: 0.25, range: 72, moves: [['throwHigh', 3, 50, 220], ['throwLow', 3, 50, 220], ['kick', 2, 0, 34], ['punch', 1, 0, 30]] },
    },
    {
        id: 'nuncha', name: 'NUNCHA', hp: 9, tempo: 1, arms: 'nunčake',
        look: { gi: C.yellow, pants: C.dgrey, belt: C.black, hairStyle: 'topknot', shoes: C.black, weapon: 'nunchaku' },
        taunt: 'Dva štapa, jedan lanac — a ti samo dvije ruke.',
        tip: 'Nunčake dosežu dalje od šake. Uđi mu pod udarac niskim udarcem (↓ + Z).',
        ai: { speed: 55, think: 240, aggr: 0.6, dodge: 0.3, range: 36, moves: [['wHigh', 3, 0, 46], ['wLow', 2, 0, 44], ['kick', 1, 0, 34]] },
    },
    {
        id: 'pole', name: 'POLE', hp: 10, tempo: 1.1, arms: 'dugi bambusov štap',
        look: { gi: C.orange, pants: C.orange, belt: C.brown, hairStyle: 'bald', beard: C.lgrey, shoes: C.brown, size: 1.05, weapon: 'pole' },
        taunt: 'Štap ti dohvati dušu prije nego mi dohvatiš bradu.',
        tip: 'Štap je dug: ne stoj na pola puta. Skoči mu iza leđa letećim udarcem (↑ pa X).',
        ai: { speed: 45, think: 260, aggr: 0.6, dodge: 0.3, range: 48, moves: [['wHigh', 3, 0, 58], ['wLow', 3, 0, 56], ['jumpkick', 1, 50, 100]] },
    },
    {
        id: 'feedle', name: 'FEEDLE', hp: 9, tempo: 1, arms: 'vojska malih Feedlea', minions: true,
        look: { gi: C.green, pants: C.green, belt: C.yellow, hairStyle: 'top', hair: C.brown, shoes: C.brown },
        taunt: 'Nas je puno, a ti si sam!',
        tip: 'Mali Feedleovi su niski — ruka iznad glave ih promaši. Udaraj nogom ili čučeći.',
        ai: null,
    },
    {
        id: 'chain', name: 'CHAIN', hp: 10, tempo: 1.25, arms: 'željezni lanac',
        look: { gi: C.dgrey, pants: C.red, sleeve: C.dgrey, belt: C.black, hairStyle: 'long', shoes: C.black, size: 1.12, weapon: 'chain' },
        taunt: 'Lanac ne zna za milost.',
        tip: 'Lanac je spor ali dug. Pričekaj da zamahne pa uskoči blizu prije nego ga povuče natrag.',
        ai: { speed: 38, think: 300, aggr: 0.6, dodge: 0.2, range: 56, moves: [['wHigh', 3, 20, 68], ['wLow', 3, 20, 66], ['kick', 1, 0, 34]] },
    },
    {
        id: 'club', name: 'CLUB', hp: 10, tempo: 1.4, arms: 'batina i štit',
        look: { gi: C.brown, pants: C.brown, belt: C.orange, hairStyle: 'bald', band: C.yellow, shoes: C.black, size: 1.2, weapon: 'club', shield: true },
        taunt: 'Moj štit je vidio stotinu šaka. Sve su se slomile.',
        tip: 'Štit hvata udarce u glavu i trbuh. Gađaj noge (↓ + X) ili ga udari dok zamahuje.',
        ai: { speed: 35, think: 320, aggr: 0.5, dodge: 0.1, range: 32, moves: [['smash', 3, 0, 46], ['kick', 1, 0, 36]] },
    },
    {
        id: 'fan', name: 'FAN', hp: 10, tempo: 0.95, arms: 'čelične lepeze',
        look: { gi: C.lred, pants: C.lred, sleeve: C.lred, belt: C.white, hairStyle: 'long', shoes: C.black, weapon: 'fan' },
        taunt: 'Moja lepeza reže vjetar — i tebe.',
        tip: 'Lepeze lete u valovima. Fan je brza, ali ne podnosi niske udarce.',
        ai: { speed: 65, think: 220, aggr: 0.65, dodge: 0.4, range: 66, moves: [['throwHigh', 2, 46, 220], ['throwLow', 2, 46, 220], ['jumpkick', 2, 40, 90], ['kick', 2, 0, 34]] },
    },
    {
        id: 'sword', name: 'SWORD', hp: 11, tempo: 0.95, arms: 'zakrivljeni mač',
        look: { gi: C.blue, pants: C.dgrey, sleeve: C.blue, belt: C.white, hairStyle: 'topknot', mustache: C.black, shoes: C.black, weapon: 'sword' },
        taunt: 'Moj mač je oštriji od tvog jezika.',
        tip: 'Sword skače s mačem iznad glave. Kad sleti, udari ga letećim udarcem.',
        ai: { speed: 55, think: 220, aggr: 0.65, dodge: 0.35, range: 42, moves: [['wHigh', 3, 0, 50], ['wLow', 2, 0, 48], ['jumpslash', 1, 44, 90]] },
    },
    {
        id: 'tonfa', name: 'TONFA', hp: 11, tempo: 0.85, arms: 'dvije tonfe',
        look: { gi: C.lgreen, pants: C.green, belt: C.black, hairStyle: 'top', shoes: C.black, weapon: 'tonfa' },
        taunt: 'Brz sam kao munja. Nećeš ni vidjeti odakle je došlo.',
        tip: 'Tonfa je najbrži do sada. Ne mlati naslijepo — čekaj da promaši pa kontriraj.',
        ai: { speed: 70, think: 180, aggr: 0.7, dodge: 0.45, range: 30, moves: [['wHigh', 3, 0, 38], ['wLow', 2, 0, 36], ['kick', 2, 0, 34], ['highkick', 1, 0, 32]] },
    },
    {
        id: 'blues', name: 'BLUES', hp: 12, tempo: 0.8, arms: 'isti kung-fu kao ti',
        look: { gi: C.lblue, pants: C.blue, belt: C.black, hairStyle: 'top', band: C.lblue, shoes: C.black },
        taunt: 'Ja sam ti sjena, Oolong. Znam svaki tvoj potez.',
        tip: 'Blues zna sve tvoje udarce i izmiče im. Miješaj visoke, niske i leteće.',
        ai: { speed: 75, think: 160, aggr: 0.7, dodge: 0.55, range: 32, moves: [['punch', 2, 0, 30], ['kick', 2, 0, 36], ['highkick', 2, 0, 32], ['sweep', 2, 0, 34], ['lowpunch', 1, 0, 30], ['jumpkick', 2, 40, 90]] },
    },
];
