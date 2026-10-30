'use strict';
// Dudek and the four fighters of the Podravina league, with their moves and everything they say.
//
// A move's windup ends in the strike; `tell` is the flashing, blinking last part of the windup that
// warns the player. `strike` is how long the punch takes to land. `block`/`dodge` say whether
// holding guard or stepping aside avoids it, and a dodged move leaves the fighter `open` for that
// many ms. `star: true` means the first counter-punch into that opening earns a star, and
// `interrupt: true` means a punch to the head during the tell stops the move and earns one too.

const DUDEK = {
    name: 'Dudek', skin: 0xf2c49a, width: 140, headR: 42, hair: 'short', hairColor: 0x5a3418, brows: 0x4a2a10,
    top: 'singlet', topColor: 0x1d2a44, trunks: 0xd42a2a, pattern: 'checker', belt: 0xffffff, gloves: 0x2fa84a, shoes: 0x202020,
};

const DIDA = 'Dida Imbro';

const OPPONENTS = [
    {
        id: 'jozek', name: 'Jožek Kistić', nick: 'Staklena Brada', from: 'Hlebine', record: '1 – 38', job: 'naivni slikar',
        look: {
            skin: 0xf5d0b0, width: 132, headR: 44, hair: 'short', hairColor: 0xc89a50, brows: 0x9a7030, hat: 'beret', hatColor: 0x8a1a2a,
            top: 'smock', topColor: 0xb8d8f0, trunks: 0x3a6ad0, belt: 0xffffff, gloves: 0xd8302a, shoes: 0x6a4020, glassJaw: true, blush: true,
        },
        hp: 100, hearts: 22, faceMult: 1.5, bodyMult: 1.3, guard: 'alt', guardSwitch: [1600, 2600], comboLimit: 4, counter: 0, adapt: 0.15,
        idle: [1500, 2500], getUp: [6, 10], getUpHp: [0.6, 0.4],
        moves: [
            { kind: 'hook', side: 'rand', windup: 1100, tell: 380, strike: 150, dmg: 11, open: 1300, star: true, w: 3, interrupt: true },
            { kind: 'jab', side: 'rand', windup: 800, tell: 320, strike: 120, dmg: 6, open: 800, w: 2 },
            { kind: 'taunt', dur: 1900, w: 1.2, say: 'Joj, kak sam lep!' },
        ],
        intro: 'Bum te naslikal na staklu! ... Samo me nemoj v bradu, molim te lepo.',
        quips: ['Moja brada! Kak je čaša pukla!', 'Mama mi je rekla da budem slikar, a ne boksač...', 'Generalić bi me sad naslikal kak padam.'],
        tips: [
            'Dečec, Jožek ima bradu od stakla! Kad zamahne i trepne, makni se v stran (← →) pa ga lupi po glavi (↑ + Z/X).',
            'Kad se Jožek hvali i maše rukama, lupi ga — dobiš zvijezdu! Zvijezdu potrošiš s ENTER ili SPACE.',
        ],
        win: 'Jožek je pukel kak staklenka od kiselih krastavaca!',
        lose: 'Naslikal te je... na podu ringa.',
    },
    {
        id: 'ferenc', name: 'Bači Ferenc', nick: 'Paprika', from: 'Legrad', record: '14 – 9', job: 'ribič s Drave i Mure',
        look: {
            skin: 0xe8b890, width: 150, headR: 44, hair: 'bald', hairColor: 0x3a2414, brows: 0x2a1a10, hat: 'felt', hatColor: 0x2a4a2a,
            top: 'none', chestHair: true, trunks: 0xc8102e, stripe: 0x2a8a3a, belt: 0x2a8a3a, gloves: 0x7a1414, shoes: 0x2a2a2a,
            stache: 'handlebar', stacheColor: 0x2a1a10, nose: 1.5,
        },
        hp: 150, hearts: 18, faceMult: 1.0, bodyMult: 1.2, guard: 'high', guardSwitch: [2200, 3600], comboLimit: 3, counter: 0.25, adapt: 0.5,
        idle: [1100, 2000], getUp: [4, 8, 10], getUpHp: [0.7, 0.45, 0.3],
        moves: [
            { kind: 'jab', side: 'rand', windup: 620, tell: 300, strike: 110, dmg: 7, open: 650, chain: 1, w: 3 },
            { kind: 'hook', side: 'rand', windup: 880, tell: 380, strike: 140, dmg: 12, open: 1000, star: true, w: 2.5 },
            { kind: 'upper', side: 'rand', windup: 1400, tell: 420, strike: 150, dmg: 22, block: false, open: 1500, star: true, w: 1.3, flash: 0xff2a10, say: 'Paprikaš!' },
            { kind: 'taunt', dur: 1500, w: 0.8, say: 'Ej, ej, ej... gyere!' },
        ],
        intro: 'Bači Ferenc iz Legrada! Tri sela sam izmlatil prek Drave, a ti si mi samo četrto.',
        quips: ['Kaj?! Nitko ne lupa Ferenca po brkima!', 'Moj šaran je jači od tebe!', 'Paprika ide v oči, dečec!'],
        tips: [
            'Ferenc drži gard visoko — šibni ga v trbuh (Z/X bez ↑). Kad pocrveni kak paprika, ide aperkat: samo se makni, blokirati ne moreš!',
            'Kratke ti daje dvaput zaredom. Drži gard (↓) pa onda ti njega. Kad mu se dupli zamah izjalovi, ima rupu kak Drava.',
        ],
        win: 'Ferenc je pal kak šaran na pesek. Brki su mu ostali cijeli.',
        lose: 'Paprikaš je bil preljut.',
    },
    {
        id: 'stef', name: 'Štef Picokar', nick: 'Pijetao iz Topa', from: 'Đurđevac', record: '22 – 4', job: 'gazda s pet krav',
        look: {
            skin: 0xf0b898, width: 196, headR: 46, belly: 1, hair: 'short', hairColor: 0x2a2a2a, brows: 0x1a1a1a, hat: 'comb',
            top: 'none', trunks: 0xf2c020, stripe: 0xc02020, belt: 0xc02020, gloves: 0x7a4a20, shoes: 0x2a2a2a, stache: 'brush',
        },
        hp: 170, hearts: 16, faceMult: 1.0, bodyMult: 0.15, dizzyBodyMult: 3.0, guard: 'high', guardSwitch: null, comboLimit: 3, counter: 0.3, adapt: 0,
        idle: [1200, 2100], getUp: [5, 9, 10], getUpHp: [0.6, 0.4, 0.3],
        moves: [
            { kind: 'bump', windup: 1000, tell: 380, strike: 160, dmg: 18, block: false, open: 900, w: 2, say: 'Trbuuuh!' },
            { kind: 'slam', windup: 1200, tell: 520, strike: 150, dmg: 20, dodge: false, open: 1000, openOnBlock: true, star: true, w: 2 },
            { kind: 'hook', side: 'rand', windup: 820, tell: 360, strike: 140, dmg: 12, open: 800, w: 2 },
            { kind: 'crow', dur: 1500, w: 1.6, say: 'KUKURIKUUU!' },
        ],
        intro: 'Kukuriku! Mi Picokari smo Turke otjerali s pijetlom iz topa. Kaj buš ti meni?',
        quips: ['Moj trbuh je jači od đurđevečkih zidina!', 'Kukuri... joj.', 'Još jemput i budem te pojel s mlincima!'],
        tips: [
            'Na trbuh ga ne buš zabil, to ti je bačva od špeka! Kad zakukuriče i otvori kljun — lupi ga v glavu (↑ + Z/X)!',
            'Kad se zavrti od udarca, mlati ga po trbuhu kolko stigneš. Kad digne obje ruke nad glavu, drži gard (↓) — tog se ne moreš makniti.',
        ],
        win: 'Štef je pal kak vreća krumpira. Picok je zašutil.',
        lose: 'Pregazil te je kak traktor na oranicu.',
    },
    {
        id: 'lojz', name: 'Lojz Vegeta', nick: 'Kralj Podravine', from: 'Koprivnica', record: '41 – 0', job: 'prvak lige i začinski majstor',
        look: {
            skin: 0xd8a070, width: 160, headR: 43, hair: 'slick', hairColor: 0x141414, brows: 0x141414, hat: 'headband', hatColor: 0xf0c020,
            top: 'none', abs: true, trunks: 0x1a50b0, stripe: 0xf0c020, belt: 0xf0c020, beltWide: true, gloves: 0x181818, shoes: 0xf4f4f4, stubble: true,
        },
        hp: 190, hearts: 14, faceMult: 0.9, bodyMult: 0.9, guard: 'alt', guardSwitch: [700, 1300], comboLimit: 2, counter: 0.45, adapt: 0.6,
        idle: [700, 1350], getUp: [3, 6, 10], getUpHp: [0.7, 0.5, 0.3],
        moves: [
            { kind: 'jab', side: 'rand', windup: 420, tell: 220, strike: 90, dmg: 7, open: 450, chain: 2, w: 3 },
            { kind: 'hook', side: 'rand', windup: 640, tell: 300, strike: 120, dmg: 14, open: 800, star: true, interrupt: true, w: 2.5 },
            { kind: 'upper', side: 'rand', windup: 780, tell: 330, strike: 120, dmg: 24, block: false, open: 1100, star: true, flash: 0xffd020, w: 1.5 },
            { kind: 'cloud', side: 'R', windup: 700, tell: 350, strike: 140, dur: 2600, w: 0.8, say: 'Malo začina!' },
            { kind: 'feint', side: 'rand', windup: 520, tell: 260, w: 1 },
            { kind: 'taunt', dur: 1200, w: 0.5, say: 'Kaj, bojiš se?' },
        ],
        intro: 'Ja sam Lojz Vegeta, kralj Podravine. Bez mene je ovaj ring — bljutav.',
        quips: ['Ti si ko juha bez začina.', 'Ni jedan Gruntovčan me još ni dotaknul!', 'Malo soli, malo papra... i gotov si!'],
        tips: [
            'Lojz je brz kak lasica. Kad trepne, imaš pol sekunde. Kad zamahne kukom, lupi ga v glavu prije nego udari — to je zvijezda!',
            'Kad baci oblak začina, ništ ne vidiš — drži gard (↓) dok se ne razide. I pazi, zna i lažno zamahnuti!',
        ],
        win: 'Kralj je pal! Pojas prvaka ide v Gruntovec!',
        lose: 'Lojz te je posolil i popapril.',
    },
];
