'use strict';
// Rooms: background painting, hotspots, characters and every puzzle script.
//
// The quest: the Three Important Bodybuilders want three proofs before Gajbruš may enter the
// contest — the Golden Disk (lift the Cursed Barbell), the Legendary Shake (cook it in Bruno's
// blender) and Vesna's T-shirt (beat her in a posing duel). The steroid ghost LeBulk is then
// undone by the one thing he cannot stand: something 100% natural.

const ROOMS = {};
const CHICKEN = { x: 605, y: 340, color: 0xffe080 };
const REX = { x: 500, y: 372, color: 0xd8a870 };

// A dialogue loop: `build` returns [text, handler, endsConversation] rows each time round.
async function dialog(E, build) {
    for (;;) {
        const opts = build();
        const i = await E.choose(opts.map(o => o[0]));
        await E.say('hero', opts[i][0]);
        await opts[i][1]();
        if (opts[i][2]) return;
    }
}

// ---------------------------------------------------------------------------------------------
// Stari Šime
// ---------------------------------------------------------------------------------------------

async function simeTeach(E) {
    const s = l => E.say('sime', l);
    if (!E.f.taught) await s('Pozirati? Mali, poziranje nije samo stav. Poziranje je RAT.');
    await s('Na plaži se bilderi stalno izazivaju na dvoboj poziranja.');
    await s('Jedan napne mišić i dobaci uvredu. Drugi mora uzvratiti PRAVIM odgovorom.');
    await s('Tko pogodi odgovor, osvaja bod. Prvi do tri boda pobjeđuje.');
    await s('Uvrede učiš kad ih netko upotrijebi protiv tebe. Odgovore učiš kad netko odgovori na tvoje uvrede.');
    if (!E.f.taught) {
        E.f.taught = true;
        await s('Evo ti dvije uvrede za početak. Zapamti ih!');
        E.pose('sime', 'flex');
        await s(POSE[0].ins);
        await s(POSE[3].ins);
        E.pose('sime', null);
        learnInsult(E, 0); learnInsult(E, 3);
        E.toast('Naučio si dvije uvrede!');
        await s('A sad idi na plažu i neka te malo izmlate. Samo se tako uči.');
    }
}

async function simeHint(E) {
    const f = E.f, s = l => E.say('sime', l);
    if (!f.metBilderi) return s('Idi u grad, u bar "Kod Znojnog Majmuna". Tri Važna Bildera će ti reći što dalje.');
    if (!f.lifted) {
        if (!f.dogGone) return s('Do Stare teretane vodi uličica, ali tamo stražari Rex. Taj pas bi prodao vlastiti rep za komad ribe.');
        if (!f.beltOn) {
            if (E.has('pojas')) return s('Imaš pojas? Pa stavi ga, genije!');
            if (!f.wallet) return s('Prokletu šipku nitko ne diže bez pojasa. Stanko ih prodaje. Treba ti novac... a more ponekad izbaci svašta. Samo treba povući.');
            return s('Prokletu šipku nitko ne diže bez pojasa. Stanko ih prodaje.');
        }
        if (!f.chalked) return s(E.has('magnezij') ? 'Natrljaj ruke tim magnezijem!' : 'Bez magnezija šipka će ti kliziti iz ruku. Stanko ga prodaje.');
        if (!f.energy) return s('Na prazan želudac ne diže se ništa. Banane rastu u gradu, samo malo protresi palmu.');
        return s('Spreman si. Idi i podigni tu šipku!');
    }
    if (!f.shake) {
        if (!f.b_jaje && !E.has('jaje')) return s('Jaja? Pitaj kokoš. Ali ništa ne daje besplatno. Luda je za zobi.');
        if (!f.b_mlijeko && !E.has('mlijeko')) return s('Mlijeko? Bruno ga uvijek ima ispod šanka. Samo ga pitaj.');
        if (!f.b_kreatin && !E.has('kreatin')) return s('Star kreatin? U Staroj teretani nitko nije pospremio ormariće od osamdeset sedme.');
        if (!f.b_zob && !E.has('zob')) return s('Zob prodaje Stanko.');
        return s('Sve sastojke ubaci u Brunov blender u baru i uključi ga.');
    }
    if (!f.vesna) {
        if (E.st.beachWins < 2) return s('Idi na plažu i izazivaj bildere. Kad izgubiš, upamti njihove uvrede. Kad oni odgovore na tvoje, upamti odgovore.');
        return s('Spreman si za Vesnu. Hram poziranja je iza plaže. Ona ima svoje uvrede, ali odgovori su isti!');
    }
    return s('Što čekaš? Odnesi dokaze Trojici Važnih Bildera!');
}

async function simeTalk(E) {
    const s = l => E.say('sime', l);
    await dialog(E, () => {
        const o = [];
        o.push(['Tko si ti?', async () => {
            await s('Ja sam Šime. Mister Otok Mišića, tisuću devetsto osamdeset sedme.');
            await s('Danas čuvam luku. Bolje rečeno, luka čuva mene.');
        }]);
        o.push(['Što je ovo mjesto?', async () => {
            await s('Otok Mišića! Ovdje se vježba, jede i pozira. Tim redom.');
            await s('Nekad je postojao i četvrti korak, spavanje, ali smo ga ukinuli. Gubitak vremena.');
        }]);
        o.push([E.f.taught ? 'Objasni mi opet dvoboj poziranja.' : 'Nauči me pozirati.', () => simeTeach(E)]);
        o.push(['Tko je LeBulk?', async () => {
            await s('Šššš! Ne izgovaraj to ime tako glasno!');
            await s('LeBulk je bio najveći bilder ovog otoka. Ali htio je više. Uvijek više.');
            await s('Steroidi. Pa steroidi za steroide. Toliko se napuhao da je postao DUH.');
            await s('Sad je napuhani duh od steroida i već tristo godina osvaja titulu Gospodara Otoka Mišića.');
            await s('Kažu da takvog duha može uništiti samo nešto stopostotno PRIRODNO. Ali tko to danas još jede?');
            E.f.heardNatural = true;
        }]);
        if (E.f.metBilderi) o.push(['Znaš li recept za Legendarni šejk?', async () => {
            await s('Znam li? Ja sam ga izmislio!');
            await s('Sirovo jaje, zobene pahuljice, mlijeko... i tajni sastojak.');
            await s('Kreatin star barem trideset godina. Što stariji, to jači. Kao ja.');
            await s('Sve to ubaciš u Brunov blender u baru i... VRRRRR!');
            await E.say('hero', 'A gdje ću naći trideset godina star kreatin?');
            await s('U Staroj teretani nitko nije pospremio ormariće od osamdeset sedme.');
            E.f.recipe = true;
        }]);
        o.push(['Imaš li kakav savjet?', () => simeHint(E)]);
        o.push(['Moram ići.', () => s('Idi, idi. I ne preskači dan za noge!'), true]);
        return o;
    });
}

// ---------------------------------------------------------------------------------------------
// LUKA — the harbour where it all begins
// ---------------------------------------------------------------------------------------------

ROOMS.luka = {
    walk: { x1: 40, x2: 1000, y1: 432, y2: 522 },
    scale: [432, 0.84, 522, 1],
    spawn: { default: { x: 640, y: 478, f: -1 }, ulica: { x: 985, y: 470, f: -1 } },
    draw(E, g) {
        Draw.vgrad(g, 0, 0, W, 330, 0x070b26, 0x2b3d78);
        Draw.stars(g, 0, 0, W, 260, 170, 11);
        Draw.moon(g, 170, 92, 40);
        g.fillStyle(0x18224a);
        g.fillPoints([{ x: 300, y: 302 }, { x: 350, y: 278 }, { x: 395, y: 266 }, { x: 420, y: 242 }, { x: 445, y: 260 }, { x: 500, y: 282 }, { x: 560, y: 302 }], true);
        Draw.vgrad(g, 0, 300, W, 140, 0x1f3570, 0x0d1a44);
        for (let i = 0; i < 12; i++) { g.fillStyle(0xfff3c0, 0.45 - i * 0.03); g.fillRect(150 - i * 3 + Math.sin(i * 2) * 8, 306 + i * 8, 44 + i * 6, 2); }
        g.fillStyle(0x15241d);
        g.fillPoints([{ x: 560, y: 410 }, { x: 640, y: 330 }, { x: 720, y: 285 }, { x: 820, y: 248 }, { x: 920, y: 232 }, { x: 1024, y: 222 }, { x: 1024, y: 410 }], true);
        g.fillStyle(0x1d3226);
        g.fillPoints([{ x: 680, y: 410 }, { x: 760, y: 350 }, { x: 860, y: 318 }, { x: 1024, y: 300 }, { x: 1024, y: 410 }], true);
        Draw.house(g, 700, 300, 46, 34, 0x3a3048, 0x5a2a2a, true);
        Draw.house(g, 770, 268, 52, 40, 0x40344a, 0x6a2a2a, true);
        Draw.house(g, 850, 248, 44, 36, 0x352c42, 0x5a2a2a, false);
        Draw.house(g, 920, 240, 60, 44, 0x3a3048, 0x6a3020, true);
        Draw.house(g, 985, 232, 40, 32, 0x352c42, 0x5a2a2a, true);
        Draw.planks(g, 0, 400, W, 144, 0x5e4128, 6);
        g.fillStyle(0x3a2616); g.fillRect(0, 398, 1024, 8);
        for (const x of [130, 260, 390, 520]) {
            g.fillStyle(0x4a3220); g.fillRect(x, 366, 14, 36);
            g.fillStyle(0x6a4a30); g.fillEllipse(x + 7, 366, 14, 6);
        }
        g.fillStyle(0x7a6448, 0.6); g.fillPoints([{ x: 880, y: 406 }, { x: 1024, y: 380 }, { x: 1024, y: 406 }], true);
        Draw.lamp(g, 330, 440, 170);
        g.fillStyle(0x4a3220); g.fillRect(838, 350, 10, 66);
        Draw.board(E, 786, 316, 116, 40, 'OTOK MIŠIĆA', 16, 0x6a4422, '#ffe8b0', 2);
        Draw.waves(E, 0, 600, 312, 392, 18, 21);
        const bar = E.gfx(440);
        Draw.barrel(bar, 572, 386, 36, 54); Draw.barrel(bar, 606, 384, 36, 56, 0x6a4020);
    },
    actors: [{
        id: 'sime', forms: 'Stari Šime|Starog Šime|Starom Šimi|Starog Šimu|Starim Šimom', x: 250, y: 452, face: 1,
        look: {
            skin: 0xd8a070, shirt: 0x6a7a9a, shirtType: 'tee', pants: 0x4a3a2a, shorts: false, hair: 0xe8e8e8, hairStyle: 'ring',
            beard: 0xe8e8e8, sh: 30, waist: 24, arm: 8, leg: 9, h: 0.92, color: 0x9ad8ff,
        },
        verbs: {
            look: 'Stari Šime. Kažu da je nekad bio prvak otoka. Danas je prvak stajanja ispod lampe.',
            talk: simeTalk,
            pick: 'Šime je star, ali još ima opaki lijevi kroše. Bolje ne.',
            push: 'Ne guram umirovljenike. Osim u redu za proteine.',
            'give:*': async E => E.say('sime', 'Ne treba meni to, mali. Meni treba samo mir i malo glukozamina.'),
        },
    }],
    objects: [
        {
            id: 'more', forms: 'more|mora|moru|more|morem', rect: [0, 300, 560, 96], walk: [280, 440],
            verbs: {
                look: 'More. Mokro, slano i puno ljudi koji su preskočili dan za noge.',
                use: 'Ne idem plivati. Nisam ponio kupaće, a ove kratke hlače su za pozornicu.',
                pick: 'Pokušao sam. Iscurilo mi je kroz prste.',
            },
        },
        {
            id: 'uze', forms: 'uže|užeta|užetu|uže|užetom', rect: [20, 372, 100, 76], walk: [118, 452], face: -1,
            make(E) {
                const g = E.gfx(444);
                g.lineStyle(4, 0xc8a868);
                g.beginPath(); g.moveTo(70, 414); g.lineTo(52, 410); g.lineTo(32, 404); g.lineTo(14, 398); g.strokePath();
                g.fillStyle(0x2a2a2e); g.fillRoundedRect(60, 410, 24, 34, 5);
                g.fillStyle(0x3a3a40); g.fillEllipse(72, 410, 32, 10);
                g.lineStyle(3, 0xc8a868); g.strokeEllipse(72, 418, 26, 8);
                return g;
            },
            verbs: {
                look: E => E.f.wallet ? 'Uže zavezano za stup. Na kraju više nema ničega osim algi.' : 'Uže zavezano za stup. Drugi kraj nestaje u moru. Nešto teško visi na njemu.',
                pick: 'Čvor je vezao netko tko se jako bojao da će mu uže pobjeći. Ali mogao bih ga povući.',
                pull: async E => {
                    if (E.f.wallet) return E.say('hero', 'Već sam izvukao sve što je vrijedilo. Ostale su samo alge i jedna jako uvrijeđena rakovica.');
                    E.pose('hero', 'reach');
                    E.sfx('splash');
                    await E.wait(600);
                    E.pose('hero', null);
                    await E.say('hero', 'Hup! ... Mokri novčanik! Netko ga je ovdje privezao. Ili utopio.');
                    E.f.wallet = true;
                    E.st.money = 50;
                    E.give('novcanik');
                    E.sfx('coin');
                    await E.say('hero', 'Unutra je 50 eura i poruka: "Tko ovo nađe, neka kupi pojas. Leđa su važna."');
                },
                push: 'Gurnuo sam uže. Uže se nije dalo impresionirati.',
            },
        },
        {
            id: 'sanduk', forms: 'sanduk sa skušama|sanduka sa skušama|sanduku sa skušama|sanduk sa skušama|sandukom sa skušama',
            rect: [425, 424, 92, 58], walk: [470, 502],
            make(E) {
                const g = E.gfx(482);
                Draw.crate(g, 428, 442, 84, 40, 0x8a6a40);
                for (let i = 0; i < 6; i++) {
                    g.fillStyle(0x6a8fb0); g.fillEllipse(440 + i * 12, 440, 12, 22);
                    g.fillStyle(0xd0e0f0); g.fillEllipse(440 + i * 12, 436, 6, 8);
                    g.fillStyle(0x111111); g.fillCircle(440 + i * 12, 432, 1.5);
                }
                return g;
            },
            verbs: {
                look: 'Sanduk pun skuša. Bogate omega-3 masnim kiselinama. I smradom.',
                pick: async E => {
                    if (E.has('skusa') || E.f.dogGone) return E.say('hero', 'Jedna skuša dnevno je sasvim dovoljno.');
                    E.give('skusa');
                    await E.say('hero', 'Uzet ću jednu. Omega-3 je dobra za zglobove.');
                },
                open: 'Već je otvoren. Zato i smrdi.',
                push: 'Ne želim da skuše završe u moru. Bile bi presretne.',
                pull: 'Ne želim da skuše završe u moru. Bile bi presretne.',
            },
        },
        {
            id: 'kokos', forms: 'kokoš|kokoši|kokoši|kokoš|kokoši', rect: [574, 340, 64, 48], walk: [596, 466], face: 1,
            make: E => Draw.chicken(E, 605, 388),
            verbs: {
                look: 'Kokoš. Šeće po luci kao da je ona vlasnica. Možda i jest.',
                pick: 'Ne bih. Ona ima više proteina od mene i to zna.',
                talk: async E => {
                    await E.say('hero', 'Ko-ko-ko?');
                    E.sfx('cluck');
                    await E.say(CHICKEN, 'Kokodak.');
                    await E.say('hero', 'Mislim da smo se razumjeli.');
                },
                'give:zob': chickenEgg,
                'use:zob': chickenEgg,
                'give:*': 'Kokoš to ne želi. Gleda me kao da sam nešto zrnato zaboravio.',
                push: 'Zadnji put kad sam gurnuo kokoš, njezina me rodbina progonila tri dana.',
            },
        },
        {
            id: 'natpis', forms: 'natpis|natpisa|natpisu|natpis|natpisom', rect: [784, 314, 120, 104], walk: [842, 450],
            verbs: {
                look: '"OTOK MIŠIĆA. Stanovnika: 214. Mišića: 136.954." Netko ih je očito brojao.',
                pick: 'Natpis je zabijen preduboko. Čak i za mene.',
            },
        },
        {
            id: 'izlaz', forms: 'grad|grada|gradu|grad|gradom', rect: [985, 300, 39, 244], walk: [1000, 470], exit: 'ulica', spawn: 'luka',
            verbs: { look: 'Put vodi u grad. Odande se čuje zveckanje utega.' },
        },
    ],
    async enter(E) {
        if (E.f.intro) return;
        E.f.intro = true;
        E.hero.c.setPosition(1080, 478);
        E.hero.setFacing(-1);
        await E.say('narr', 'Duboko na Jadranu, na otoku gdje nitko ne preskače dan za noge...');
        await E.walk(560, 474, true);
        await E.say('sime', 'Hej! Ti tamo! Novi si ovdje?');
        await E.walk(380, 462);
        E.face('sime');
        E.pose('hero', 'flex');
        await E.say('hero', 'Zovem se Gajbruš Bicepvud i želim postati bodybuilder!');
        E.pose('hero', null);
        await E.say('sime', 'Bodybuilder? Ti? S tim ručicama?');
        await E.say('hero', 'Ovo su bicepsi od 52 centimetra!');
        await E.say('sime', 'U moje vrijeme to smo zvali "zagrijavanje".');
        await E.say('sime', 'Ako želiš postati pravi bilder, idi u grad, u bar "Kod Znojnog Majmuna".');
        await E.say('sime', 'Tamo sjede Tri Važna Bildera. Oni odlučuju tko je bilder, a tko je samo debeo.');
        await E.say('hero', 'Hvala, stari!');
        await E.say('sime', 'I nikad nemoj preskočiti dan za noge!');
    },
};

async function chickenEgg(E) {
    if (E.f.egg) return E.say('hero', 'Kokoš je za danas gotova. Izgleda iscrpljeno. Kao ja nakon dana za noge.');
    await E.say('hero', 'Evo, koko. Malo zobi.');
    E.sfx('cluck');
    await E.say(CHICKEN, 'Kokodak! KOKODAAAK!');
    E.f.egg = true;
    E.give('jaje');
    await E.say('hero', 'Pojela je šaku zobi i odmah snijela jaje! To je najbrži metabolizam koji sam ikad vidio.');
}

// ---------------------------------------------------------------------------------------------
// ULICA — main street with the bar, Stanko's shop, the alley and Rex
// ---------------------------------------------------------------------------------------------

ROOMS.ulica = {
    walk: { x1: 30, x2: 1000, y1: 442, y2: 522 },
    scale: [442, 0.86, 522, 1],
    spawn: {
        default: { x: 500, y: 480 }, luka: { x: 50, y: 476, f: 1 }, plaza: { x: 985, y: 476, f: -1 },
        bar: { x: 265, y: 452, f: 1 }, trgovina: { x: 661, y: 452, f: 1 }, teretana: { x: 470, y: 452, f: 1 },
    },
    draw(E, g) {
        Draw.vgrad(g, 0, 0, W, 320, 0x0a0e2a, 0x253468);
        Draw.stars(g, 0, 0, W, 200, 120, 31);
        Draw.moon(g, 600, 54, 22);
        g.fillStyle(0x141a33);
        g.fillRect(0, 150, 60, 280); g.fillRect(400, 110, 70, 320); g.fillRect(780, 160, 120, 270);
        // The bar
        g.fillStyle(0x5a3226); g.fillRect(50, 120, 375, 310);
        g.fillStyle(0x3a1c18); g.fillPoints([{ x: 38, y: 122 }, { x: 437, y: 122 }, { x: 405, y: 84 }, { x: 70, y: 84 }], true);
        g.fillStyle(0x3a2018);
        for (const x of [50, 170, 300, 420]) g.fillRect(x, 120, 6, 310);
        g.fillRect(50, 230, 375, 6);
        Draw.window(g, 80, 150, 56, 60, true); Draw.window(g, 200, 150, 56, 60, false); Draw.window(g, 330, 150, 56, 60, true);
        Draw.window(g, 340, 280, 56, 70, true);
        Draw.glow(g, 265, 380, 90, 0xffb050, 0.04, 5);
        Draw.door(g, 230, 330, 70, 100, 0x4a2814);
        g.fillStyle(0x1a0c06); g.fillRect(230, 330, 70, 10);
        Draw.board(E, 180, 268, 172, 46, 'KOD ZNOJNOG\nMAJMUNA', 14, 0x2a1a10, '#f0c860', 2);
        // The poster on the bar wall
        g.fillStyle(0xe8dcb0); g.fillRect(104, 246, 74, 92);
        g.fillStyle(0xc03030); g.fillRect(104, 246, 74, 16);
        E.txt(141, 254, 'NATJEČAJ!', { fontSize: '11px', color: '#ffffff' }, 2).setOrigin(0.5);
        E.txt(141, 298, 'GOSPODAR\nOTOKA\nMIŠIĆA\n\nbranitelj:\nLeBulk', { fontSize: '9px', color: '#2a1a10', align: 'center' }, 2).setOrigin(0.5);
        // The alley
        g.fillStyle(0x07070f); g.fillRect(425, 140, 90, 290);
        Draw.glow(g, 470, 300, 50, 0x8090c0, 0.03, 4);
        g.fillStyle(0x10101c); g.fillRect(440, 380, 60, 50);
        // Stanko's shop
        g.fillStyle(0x2f5560); g.fillRect(515, 130, 290, 300);
        g.fillStyle(0x1c3840); g.fillPoints([{ x: 505, y: 132 }, { x: 815, y: 132 }, { x: 790, y: 96 }, { x: 530, y: 96 }], true);
        Draw.window(g, 545, 160, 50, 56, false, 0x1a2a30); Draw.window(g, 720, 160, 50, 56, true, 0x1a2a30);
        g.fillStyle(0x1a2a30); g.fillRect(536, 296, 78, 118);
        g.fillStyle(0xffd27a); g.fillRect(540, 300, 70, 110);
        g.fillStyle(0x3a3a3a); g.fillRect(548, 380, 54, 6); g.fillCircle(552, 383, 9); g.fillCircle(598, 383, 9);
        g.fillStyle(0xc03030); g.fillRect(552, 330, 16, 22); g.fillStyle(0x3060c0); g.fillRect(574, 326, 16, 26);
        g.fillStyle(0x1a2a30); g.fillRect(712, 296, 78, 118);
        g.fillStyle(0xffd27a); g.fillRect(716, 300, 70, 110);
        g.fillStyle(0x6b3b1a); g.fillRect(724, 330, 54, 12);
        Draw.door(g, 630, 330, 62, 100, 0x5a3a20);
        Draw.board(E, 560, 246, 200, 52, 'STANKO\nRabljena oprema i suplementi', 13, 0x8a2a6a, '#ffe0ff', 2);
        // Low wall on the right
        g.fillStyle(0x3a3a50); g.fillRect(805, 372, 219, 58);
        g.fillStyle(0x4a4a62); g.fillRect(805, 368, 219, 8);
        Draw.cobbles(g, 0, 428, W, 116, 0x6a6a7a);
        Draw.lamp(g, 30, 440, 150);
    },
    objects: [
        { id: 'izlazL', forms: 'luka|luke|luci|luku|lukom', rect: [0, 330, 32, 214], walk: [30, 476], exit: 'luka', spawn: 'ulica', verbs: { look: 'Put prema luci.' } },
        { id: 'izlazR', forms: 'plaža|plaže|plaži|plažu|plažom', rect: [992, 330, 32, 214], walk: [1000, 476], exit: 'plaza', spawn: 'ulica', verbs: { look: 'Put prema plaži. Miriše na ulje za sunčanje.' } },
        {
            id: 'plakat', forms: 'plakat|plakata|plakatu|plakat|plakatom', rect: [102, 244, 78, 96], walk: [141, 450],
            verbs: {
                look: '"VELIKO NATJECANJE ZA GOSPODARA OTOKA MIŠIĆA. Branitelj naslova: LeBulk (tristo godina zaredom)." Ispod je netko dopisao: "Nema šanse."',
                pick: 'Zalijepljen je nečim jačim od super-ljepila. Možda proteinskim šejkom.',
            },
        },
        {
            id: 'vrataBar', forms: 'vrata bara|vrata bara|vratima bara|vrata bara|vratima bara', rect: [226, 328, 78, 104], walk: [265, 448],
            exit: 'bar', spawn: 'ulica', face: 1,
            verbs: { look: 'Bar "Kod Znojnog Majmuna". Iznutra se čuje stenjanje i zveckanje šejkera.', close: 'Već su zatvorena. Otvaraju se iznutra prema van, kao i moja osobnost.' },
        },
        {
            id: 'natpisBar', forms: 'natpis bara|natpisa bara|natpisu bara|natpis bara|natpisom bara', rect: [178, 266, 176, 50], walk: [265, 448],
            verbs: { look: '"Kod Znojnog Majmuna". Najstariji bar na otoku. Nekad je bio "Kod Suhog Majmuna", ali onda su otvorili teretanu.' },
        },
        {
            id: 'izlog', forms: 'izlog|izloga|izlogu|izlog|izlogom', rect: [536, 296, 78, 118], walk: [575, 448],
            verbs: { look: 'Izlog: bučice, pojasevi, kante proteina i natpis "SVE MORA VAN!". Stoji tu već dvadeset godina.' },
        },
        {
            id: 'vrataDucan', forms: 'vrata dućana|vrata dućana|vratima dućana|vrata dućana|vratima dućana', rect: [626, 328, 70, 104], walk: [661, 448],
            exit: 'trgovina', spawn: 'ulica', face: 1,
            verbs: { look: 'Stankov dućan. "Rabljena oprema i suplementi". Naglasak na "rabljena".' },
        },
        {
            id: 'ulicica', forms: 'uličica|uličice|uličici|uličicu|uličicom', rect: [425, 140, 90, 250], walk: [470, 448],
            exit: 'teretana', spawn: 'ulica', face: 1,
            verbs: {
                look: E => E.f.dogGone ? 'Mračna uličica. Vodi do Stare teretane.' : 'Mračna uličica prema Staroj teretani. Na ulazu stražari pas.',
                walk: uliciaGo, open: uliciaGo,
            },
        },
        {
            id: 'rex', forms: 'Rex|Rexa|Rexu|Rexa|Rexom', rect: [430, 384, 96, 56], walk: [420, 456], face: 1,
            visible: E => !E.f.dogGone,
            make: E => Draw.dog(E, 470, 436),
            verbs: {
                look: 'Rex. Pas čuvar Stare teretane. Ima vrat deblji od mog. To je uvredljivo.',
                talk: async E => {
                    await E.say('hero', 'Dobar pas! Tko je dobar pas?');
                    E.sfx('bark');
                    await E.say(REX, 'GRRRR!');
                    await E.say('hero', 'Očito ne ti.');
                },
                pick: 'Ne diram pse koji imaju veći vrat od mene.',
                push: 'Rex bi me pojeo prije nego što bih ga pomaknuo. Barem bi dobio proteina.',
                'give:skusa': async E => {
                    E.take('skusa');
                    await E.say('hero', 'Evo ti, Rex. Svježa skuša. Pa, skoro svježa.');
                    E.sfx('bark');
                    await E.say(REX, 'VAU!');
                    const d = E.disp('rex');
                    d.setScale(-1, 1);
                    await E.tween({ targets: d, x: 470, y: 400, alpha: 0, duration: 900 });
                    E.f.dogGone = true;
                    E.refresh();
                    await E.say('hero', 'Rex je zgrabio skušu i otišao je pojesti na miru. Put do Stare teretane je slobodan!');
                },
                'use:skusa': async E => E.say('hero', 'Bolje da mu je dam. Ne želim mu je baciti u lice.'),
                'give:*': 'Rex to ne želi. Gleda me kao da sam JA hrana.',
            },
        },
        {
            id: 'palma', forms: 'palma|palme|palmi|palmu|palmom', rect: [850, 120, 130, 330], walk: [872, 468], face: 1,
            make(E) {
                const p = E.keep(E.add.graphics({ x: 905, y: 446 }).setDepth(446));
                Draw.palm(p, 0, 0, 1, true);
                return p;
            },
            verbs: {
                look: 'Palma puna banana. Kalij! Grčevi me se boje.',
                pick: 'Banane su previsoko. Čak i za moje bicepse.',
                push: shakePalm, pull: shakePalm,
                use: 'Kako se koristi palma? Kao sobni bicikl, samo vani?',
            },
        },
    ],
};

async function uliciaGo(E) {
    if (!E.f.dogGone) {
        E.sfx('bark');
        await E.say(REX, 'GRRRRR! VAU! VAU!');
        await E.say('hero', 'Rex me ne pušta. Trebam nešto čime ću ga odobrovoljiti.');
        return;
    }
    await E.goto('teretana', 'ulica');
}

async function shakePalm(E) {
    const p = E.disp('palma');
    E.pose('hero', 'reach');
    E.sfx('whoosh');
    await E.tween({ targets: p, angle: { from: 0, to: 4 }, duration: 90, yoyo: true, repeat: 3 });
    p.angle = 0;
    E.pose('hero', null);
    if (E.has('banana')) return E.say('hero', 'Pala je još jedna banana... ravno u more. Dobro, jedna mi je ionako dosta.');
    const b = E.keep(E.add.image(925, 200, 'it_banana').setDepth(600).setScale(0.6));
    await E.tween({ targets: b, x: E.hero.c.x + 30, y: E.hero.c.y - 110, angle: 360, duration: 600, ease: 'Quad.easeIn' });
    b.destroy();
    E.give('banana');
    await E.say('hero', 'Banana je pala ravno u moje ruke. Fizika voli jake ljude.');
}

// ---------------------------------------------------------------------------------------------
// BAR "Kod Znojnog Majmuna"
// ---------------------------------------------------------------------------------------------

const ING = { jaje: 'sirovo jaje', zob: 'zob', mlijeko: 'mlijeko', kreatin: 'drevni kreatin' };
const ING_LINE = {
    jaje: 'Razbio sam jaje u blender. Rocky bi bio ponosan.',
    zob: 'Ubacio sam šaku zobi. Ostatak čuvam za crne dane.',
    mlijeko: 'Ulio sam mlijeko. Miriše... zrelo.',
    kreatin: 'Odlomio sam komad kreatina iz osamdeset sedme. Zvučalo je kao da sam ubacio kamen.',
};

function addIngredient(id) {
    return async E => {
        if (E.f.shake) return E.say('hero', 'Legendarni šejk je već napravljen. Ne treba pretjerivati. Pogledaj što se dogodilo LeBulku.');
        if (E.f['b_' + id]) return E.say('hero', `${ING[id].charAt(0).toUpperCase() + ING[id].slice(1)} je već u blenderu.`);
        E.f['b_' + id] = true;
        if (id !== 'zob') E.take(id);
        E.sfx('pick');
        E.refresh();
        await E.say('hero', ING_LINE[id]);
        if (!E.f.recipe) await E.say('hero', 'Doduše, nemam pojma što ide u Legendarni šejk. Možda bih trebao nekoga pitati.');
    };
}

async function useBlender(E) {
    if (E.f.shake) return E.say('hero', 'Blender je prazan. Legendarni šejk je kod mene.');
    const missing = Object.keys(ING).filter(k => !E.f['b_' + k]);
    if (missing.length === 4) return E.say('hero', 'Blender je prazan. Nema smisla miksati zrak. Zrak nema proteina.');
    if (missing.length) {
        if (!E.f.recipe) return E.say('hero', 'Nešto mi govori da recept nije potpun. Moram saznati što ide u Legendarni šejk.');
        return E.say('hero', 'Još mi fali: ' + missing.map(k => ING[k]).join(', ') + '.');
    }
    E.sfx('blender');
    E.shake(1300, 0.005);
    const b = E.disp('blender');
    await E.tween({ targets: b, x: { from: -2, to: 2 }, duration: 50, yoyo: true, repeat: 12 });
    b.x = 0;
    await E.say('hero', 'VRRRRRRRRRRRRRRR!');
    for (const k of Object.keys(ING)) E.f['b_' + k] = false;
    E.f.shake = true;
    E.give('sejk');
    E.refresh();
    await E.say('bruno', 'Tako mi bučica... Legendarni šejk! Nisam ga vidio od osamdeset sedme!');
    await E.say('hero', 'Kušnja prehrane: riješena! Sad ga samo moram pokazati Važnim Bilderima.');
}

async function brunoTalk(E) {
    const s = l => E.say('bruno', l);
    await dialog(E, () => {
        const o = [];
        o.push(['Što imaš za popiti?', async () => {
            await s('Šejk od vanilije, šejk od čokolade i šejk od vanilije s okusom čokolade.');
            await E.say('hero', 'A nešto bez proteina?');
            await s('Voda. Ali to je samo za bolesne.');
        }]);
        if (!E.has('mlijeko') && !E.f.b_mlijeko && !E.f.shake) o.push(['Imaš li malo mlijeka?', async () => {
            await s('Mlijeko? Ovo je bar, mali, a ne... ah, dobro. Evo ti boca.');
            E.give('mlijeko');
            await s('Ionako će sutra biti sir.');
        }]);
        o.push(['Što je s tim blenderom?', async () => {
            await s('To je Legendarni Blender. U njemu je stari Šime nekad radio Legendarni šejk.');
            await s('Slobodno ga koristi. Samo ga nemoj pokušati podići. Zadnji koji je pokušao ima kilu.');
        }]);
        o.push(['Tko su ova trojica?', async () => {
            await s('Tri Važna Bildera. Oni odlučuju tko smije na natjecanje.');
            await s('Nemoj ih zvati "napuhanci". Zadnji koji je to rekao sad radi kao uteg.');
        }]);
        o.push(['Doviđenja.', () => s('Navrati opet. Ili nemoj. Meni je svejedno.'), true]);
        return o;
    });
}

async function trialStatus(E) {
    const left = [];
    if (!E.f.gDisk) left.push('Zlatni disk s Proklete šipke');
    if (!E.f.gSejk) left.push('Legendarni šejk');
    if (!E.f.gMajica) left.push('dokaz da si pobijedio Vesnu');
    return left;
}

async function checkTrials(E) {
    const left = await trialStatus(E);
    if (left.length) return E.say('b1', 'Još nam trebaš donijeti: ' + left.join(', ') + '.');
    await E.say('b1', 'Sve tri kušnje!');
    await E.say('b2', 'Gajbruš Bicepvud... ti si PRAVI BILDER!');
    E.pose('hero', 'flex');
    await E.say('b3', 'Sad si spreman za natjecanje za Gospodara Otoka Mišića!');
    E.pose('hero', null);
    await E.say('hero', 'Natjecanje? Sad?');
    await E.say('b1', 'Večeras. Na pozornici na trgu. Protiv... njega.');
    await E.say('hero', 'LeBulka?');
    E.sfx('thunder');
    E.shake(700, 0.006);
    await E.say('b2', 'NE IZGOVARAJ TO IME!');
    await E.say('b3', 'Sretno, mali. Trebat će ti.');
    await E.goto('pozornica');
}

async function bilderiTalk(E) {
    if (!E.f.metBilderi) {
        E.f.metBilderi = true;
        E.pose('hero', 'flex');
        await E.say('hero', 'Zovem se Gajbruš Bicepvud i želim postati bodybuilder!');
        E.pose('hero', null);
        await E.say('b1', 'Bodybuilder, ha?');
        await E.say('b2', 'Pogledaj ga. Ruke kao u gorile.');
        await E.say('b3', 'A glava kao u vjeverice.');
        await E.say('b1', 'Dobro. Da bi postao pravi bilder, moraš proći Tri Kušnje.');
        E.pose('b2', 'flex', 2500);
        await E.say('b2', 'Kušnju snage: podigni Prokletu šipku u Staroj teretani i donesi nam Zlatni disk.');
        E.pose('b3', 'crab', 2500);
        await E.say('b3', 'Kušnju prehrane: napravi Legendarni šejk po starom receptu.');
        E.pose('b1', 'flex', 2500);
        await E.say('b1', 'I kušnju poziranja: pobijedi Vesnu, Majstoricu Poziranja, u dvoboju poziranja.');
        await E.say('b2', 'Donesi nam dokaze i pustit ćemo te na natjecanje.');
        await E.say('hero', 'Natjecanje?');
        await E.say('b3', 'Za Gospodara Otoka Mišića. Na kojem uvijek pobijedi... on.');
        await E.say('b1', '...LeBulk.');
        E.sfx('thunder');
        await E.say('hero', 'Zvuči jednostavno. Idem odmah!');
        return;
    }
    await dialog(E, () => {
        const o = [];
        o.push(['Ponovite mi kušnje.', async () => {
            await E.say('b2', E.f.gDisk ? 'Kušnju snage si već prošao.' : 'Snaga: podigni Prokletu šipku u Staroj teretani i donesi Zlatni disk.');
            await E.say('b3', E.f.gSejk ? 'Kušnju prehrane si već prošao.' : 'Prehrana: napravi Legendarni šejk. Stari Šime zna recept.');
            await E.say('b1', E.f.gMajica ? 'Kušnju poziranja si već prošao.' : 'Poziranje: pobijedi Vesnu u Hramu poziranja, iza plaže.');
        }]);
        o.push(['Tko je LeBulk?', async () => {
            await E.say('b1', 'LeBulk...');
            await E.say('b2', 'Najveći bilder koji je ikad živio.');
            await E.say('b3', 'I najveći koji je ikad umro.');
            await E.say('b1', 'Sad je duh. Napuhan steroidima. I svake godine pobjeđuje.');
            await E.say('b2', 'Guvernerka Elena Marlić je glavna sutkinja, ali ne može ništa. Pravila kažu: najveći pobjeđuje.');
        }]);
        o.push(['Gdje je Stara teretana?', async () => {
            await E.say('b3', 'U uličici između bara i Stankovog dućana.');
            await E.say('b1', 'Ali pazi na Rexa. Taj pas je pojeo zadnjeg bildera koji je pokušao proći. Dobro, samo njegove proteinske pločice.');
        }]);
        o.push(['Tko je Vesna?', async () => {
            await E.say('b2', 'Majstorica Poziranja. Živi u Hramu poziranja, iza plaže.');
            await E.say('b1', 'Nitko je nije pobijedio u dvoboju poziranja. Nitko.');
            await E.say('b3', 'Prvo vježbaj na plaži s ostalim bilderima.');
        }]);
        o.push(['Moram ići.', () => E.say('b1', 'Ne vraćaj se bez dokaza!'), true]);
        return o;
    });
}

const BILDERI_VERBS = {
    look: 'Tri Važna Bildera. Zajedno imaju više mišića nego cijeli Zagreb. I manje vrata.',
    talk: bilderiTalk,
    pick: 'Ne mogu ih podići. Pokušao sam. U mislima. Boljelo je.',
    push: 'Gurnuti trojicu bildera? Nisam LeBulk.',
    'give:disk': async E => {
        E.take('disk');
        E.f.gDisk = true;
        await E.say('b2', 'Zlatni disk s Proklete šipke!');
        await E.say('b1', 'Nevjerojatno. Stvarno si je podigao.');
        await E.say('b3', 'Kušnja snage: položena!');
        await checkTrials(E);
    },
    'give:sejk': async E => {
        if (E.f.gSejk) return E.say('b2', 'Već smo ga probali. Bio je odličan. Čuvaj ga.');
        await E.say('b2', 'Da probam...');
        E.sfx('gulp');
        await E.wait(900);
        await E.say('b2', 'Mmmm... jaje, zob, mlijeko i... kreatin iz osamdeset sedme!');
        await E.say('b3', 'To je on! Legendarni šejk!');
        await E.say('b1', 'Kušnja prehrane: položena! Zadrži ostatak, trebat će ti.');
        E.f.gSejk = true;
        await checkTrials(E);
    },
    'give:majica': async E => {
        E.take('majica');
        E.f.gMajica = true;
        await E.say('b3', '"Pobijedio sam Vesnu i dobio samo ovu glupu majicu."');
        await E.say('b1', 'Nitko ne bi dobrovoljno nosio ovakvu majicu. Mora biti prava!');
        await E.say('b2', 'Kušnja poziranja: položena!');
        await checkTrials(E);
    },
    'give:*': async E => E.say('b1', 'Što ćemo mi s tim? Mi jedemo samo piletinu i rižu.'),
};

ROOMS.bar = {
    walk: { x1: 60, x2: 990, y1: 456, y2: 526 },
    scale: [456, 0.9, 526, 1],
    spawn: { default: { x: 100, y: 482, f: 1 }, ulica: { x: 100, y: 482, f: 1 } },
    draw(E, g) {
        Draw.vplanks(g, 0, 0, W, 432, 0x5a3a22, 28);
        g.fillStyle(0x2a1a10); g.fillRect(0, 0, W, 28);
        for (const x of [0, 340, 680]) g.fillRect(x, 28, 10, 400);
        Draw.planks(g, 0, 428, W, 116, 0x4a2c18, 5, 8);
        g.fillStyle(0x2a1a10); g.fillRect(0, 424, W, 6);
        // Shelves behind the counter
        const r = rng(44);
        for (const y of [190, 280]) {
            g.fillStyle(0x3a2212); g.fillRect(180, y, 340, 8);
            for (let x = 190; x < 510; x += 26) {
                const c = [0xc03030, 0x3060c0, 0xe0e0e0, 0x30a050, 0xe0a020, 0x8a3ac0][Math.floor(r() * 6)];
                const h = 30 + r() * 26;
                if (r() < 0.5) { g.fillStyle(c); g.fillRect(x, y - h, 20, h); g.fillStyle(0xffffff); g.fillRect(x + 3, y - h * 0.6, 14, 8); }
                else { g.fillStyle(shade(c, 0.7), 0.85); g.fillRect(x + 5, y - h, 10, h); g.fillRect(x + 8, y - h - 10, 4, 10); }
            }
        }
        // Lamps
        for (const x of [260, 620, 880]) {
            g.fillStyle(0x1a1a1a); g.fillRect(x - 1, 28, 2, 40);
            Draw.glow(g, x, 76, 110, 0xffb050, 0.04, 6);
            g.fillStyle(0x2a2a2a); g.fillTriangle(x - 18, 80, x + 18, 80, x, 64);
            g.fillStyle(0xffe08a); g.fillEllipse(x, 82, 16, 8);
        }
        // Poster
        g.fillStyle(0xd8c8a0); g.fillRect(556, 146, 88, 118);
        g.fillStyle(0x8a3020); g.fillRect(556, 146, 88, 18);
        E.txt(600, 155, 'MR. OTOK 1987', { fontSize: '11px', color: '#ffffff' }, 2).setOrigin(0.5);
        g.fillStyle(0x8a5a3a); g.fillCircle(600, 186, 8); g.fillEllipse(600, 214, 34, 36);
        g.fillCircle(578, 196, 7); g.fillCircle(622, 196, 7); g.fillRect(574, 186, 8, 14); g.fillRect(618, 186, 8, 14);
        g.fillRect(590, 230, 8, 26); g.fillRect(602, 230, 8, 26);
        // Window
        Draw.vgrad(g, 720, 140, 120, 100, 0x0a0e2a, 0x253468, 8);
        g.fillStyle(0xffffff); g.fillRect(745, 160, 2, 2); g.fillRect(800, 170, 1, 1); g.fillRect(770, 190, 2, 2);
        g.lineStyle(6, 0x2a1a10); g.strokeRect(720, 140, 120, 100); g.lineBetween(780, 140, 780, 240); g.lineBetween(720, 190, 840, 190);
        // Big dumbbell trophy on the wall
        g.fillStyle(0x2a2a2a); g.fillRect(880, 180, 90, 8); g.fillRoundedRect(870, 164, 16, 40, 4); g.fillRoundedRect(964, 164, 16, 40, 4);
        // Door
        g.fillStyle(0x1a0c06); g.fillRect(20, 236, 96, 196);
        Draw.door(g, 26, 242, 84, 190, 0x5a3418);
        // Counter, in front of Bruno
        const c = E.gfx(440);
        c.fillStyle(0x3a2010); c.fillRect(170, 316, 360, 18);
        c.fillStyle(0x6a3a1c); c.fillRect(176, 330, 348, 104);
        c.fillStyle(0x5a2e14); for (let x = 190; x < 520; x += 40) c.fillRect(x, 340, 30, 84);
        c.fillStyle(0xc89030); c.fillRect(170, 312, 360, 4);
        // Table, in front of the middle bodybuilder
        const t = E.gfx(455);
        t.fillStyle(0x3a2010); t.fillRect(800, 446, 8, 40); t.fillRect(900, 446, 8, 40);
        t.fillStyle(0x6a3a1c); t.fillEllipse(854, 446, 170, 30);
        t.fillStyle(0x8a5a2c); t.fillEllipse(854, 442, 166, 24);
        t.fillStyle(0xe0e0e0); t.fillRect(820, 424, 12, 18); t.fillStyle(0x8a5a6a); t.fillRect(822, 428, 8, 12);
        t.fillStyle(0xe0e0e0); t.fillRect(880, 422, 12, 20); t.fillStyle(0x6a8a3a); t.fillRect(882, 426, 8, 14);
    },
    actors: [
        {
            id: 'bruno', forms: 'Bruno|Bruna|Brunu|Bruna|Brunom', x: 350, y: 398, scale: 0.94, face: 1, walk: [296, 462],
            look: { skin: 0xd09060, shirt: 0xe8e8e8, shirtType: 'tee', hairStyle: 'bald', mustache: 0x2a1a10, sh: 50, waist: 36, arm: 14, leg: 14, color: 0xffb060, shorts: false, pants: 0x2a2a2a },
            verbs: {
                look: 'Bruno, šanker. Brije glavu da mu kosa ne ulazi u šejkove. Brkove ne brije. Brkovi su svetinja.',
                talk: brunoTalk,
                'give:*': async E => E.say('bruno', 'Ne primam napojnice u naturi.'),
                pick: 'Bruno ima 140 kila. I to samo lijeva ruka.',
            },
        },
        {
            id: 'b1', forms: 'Važni bilder|Važnog bildera|Važnom bilderu|Važnog bildera|Važnim bilderom', x: 738, y: 484, face: 1, walk: [660, 500],
            look: { skin: 0xe0a070, shirt: 0xc02828, shirtType: 'tank', hair: 0x1a1a1a, hairStyle: 'mohawk', sh: 52, waist: 22, arm: 15, leg: 14, color: 0xff7a7a, pants: 0x2a2a2a },
            verbs: BILDERI_VERBS,
        },
        {
            id: 'b2', forms: 'Važni bilder|Važnog bildera|Važnom bilderu|Važnog bildera|Važnim bilderom', x: 852, y: 430, face: -1, walk: [780, 500],
            look: { skin: 0xc88858, shirt: 0x1a1a1a, shirtType: 'tee', hairStyle: 'bald', beard: 0x3a2010, sh: 50, waist: 24, arm: 15, leg: 14, color: 0x70ff9a, pants: 0x3a3a6a },
            verbs: BILDERI_VERBS,
        },
        {
            id: 'b3', forms: 'Važni bilder|Važnog bildera|Važnom bilderu|Važnog bildera|Važnim bilderom', x: 948, y: 488, face: -1, walk: [870, 504],
            look: { skin: 0x8a5a38, shirtType: 'none', hair: 0x1a1a1a, hairStyle: 'short', sh: 54, waist: 22, arm: 16, leg: 15, color: 0xffe070, pants: 0x2a6a3a },
            verbs: BILDERI_VERBS,
        },
    ],
    objects: [
        { id: 'izlaz', forms: 'ulica|ulice|ulici|ulicu|ulicom', rect: [20, 236, 96, 196], walk: [80, 476], exit: 'ulica', spawn: 'bar', verbs: { look: 'Vrata prema ulici.' } },
        {
            id: 'police', forms: 'police s proteinima|polica s proteinima|policama s proteinima|police s proteinima|policama s proteinima',
            rect: [180, 130, 340, 160], walk: [350, 462],
            verbs: {
                look: 'Proteini svih okusa. Čak i "okus piletine". Tko to pije?',
                pick: async E => E.say('bruno', 'Ruke dalje od polica, mali.'),
            },
        },
        {
            id: 'poster', forms: 'poster|postera|posteru|poster|posterom', rect: [556, 146, 88, 118], walk: [600, 462],
            verbs: { look: '"Mister Otok 1987." Na posteru je mladi Šime. Imao je kosu! I bicepse! I kosu na bicepsima!', pick: 'To je kulturna baština. Ne diram.' },
        },
        { id: 'prozor', forms: 'prozor|prozora|prozoru|prozor|prozorom', rect: [720, 140, 120, 100], walk: [780, 462], verbs: { look: 'Noć. Zvijezde. Negdje vani netko upravo radi trbušnjake.', open: 'Zaglavljen je. Kao i svi mi ovdje.' } },
        { id: 'trofej', forms: 'bučica|bučice|bučici|bučicu|bučicom', rect: [866, 160, 118, 48], walk: [920, 466], verbs: { look: 'Ogromna bučica na zidu. Natpis: "Pobjednik 1987: Šime". Ispod, sitnije: "Dobro, i LeBulk."', pick: 'Prikovana je. Netko je znao da ću pokušati.' } },
        {
            id: 'blender', forms: 'blender|blendera|blenderu|blender|blenderom', rect: [444, 246, 54, 76], walk: [470, 462], face: 1,
            make(E) {
                const c = E.keep(E.add.container(0, 0).setDepth(445));
                const g = E.add.graphics();
                c.add(g);
                c.g = g;
                return c;
            },
            update(E, c) {
                const g = c.g, n = Object.keys(ING).filter(k => E.f['b_' + k]).length;
                g.clear();
                g.fillStyle(0x2a2a3a); g.fillRoundedRect(450, 296, 44, 22, 4);
                g.fillStyle(0xd04040); g.fillCircle(472, 307, 4);
                g.fillStyle(0xc8e0f0, 0.55); g.fillPoints([{ x: 452, y: 250 }, { x: 492, y: 250 }, { x: 488, y: 296 }, { x: 456, y: 296 }], true);
                if (n) { g.fillStyle(0xb88a70, 0.95); g.fillRect(457, 296 - n * 10, 30, n * 10); }
                g.fillStyle(0x2a2a3a); g.fillRect(450, 244, 44, 8);
                g.lineStyle(2, 0xe8f4ff, 0.6); g.lineBetween(458, 256, 460, 290);
            },
            verbs: {
                look: E => {
                    const inn = Object.keys(ING).filter(k => E.f['b_' + k]).map(k => ING[k]);
                    return 'Legendarni Blender 3000. ' + (inn.length ? 'Unutra: ' + inn.join(', ') + '.' : 'Prazan je.');
                },
                use: useBlender, push: useBlender,
                'use:jaje': addIngredient('jaje'), 'use:zob': addIngredient('zob'),
                'use:mlijeko': addIngredient('mlijeko'), 'use:kreatin': addIngredient('kreatin'),
                'use:banana': 'Banane nisu u receptu. Šime je bio vrlo jasan po tom pitanju.',
                'use:skusa': 'Riblji šejk? Ne. Čak ni ja nisam toliko očajan.',
                'use:*': 'To ne ide u šejk. Barem ne u legendarni.',
                pick: async E => E.say('bruno', 'Rekao sam, NE podiži blender!'),
                open: 'Poklopac je otvoren. Blender čeka sastojke.',
                close: 'Bolje da ostane otvoren dok ne ubacim sve sastojke.',
            },
        },
    ],
};

// ---------------------------------------------------------------------------------------------
// TRGOVINA — Stanko's used gym equipment & supplements
// ---------------------------------------------------------------------------------------------

async function stankoTalk(E) {
    const s = l => E.say('stanko', l);
    const buy = (id, price, line) => async () => {
        if (E.st.money < price) {
            await s(E.st.money ? `Hmm, imaš samo ${E.st.money} €. Ovo je dućan, a ne humanitarna udruga!` : 'Nemaš ni centa? Bez novca nema ni opreme, prijatelju!');
            return;
        }
        E.st.money -= price;
        E.f['buy_' + id] = true;
        E.give(id);
        E.sfx('coin');
        E.refresh();
        await s(line);
        if (E.st.money === 0) await E.say('hero', 'Novčanik mi je sad lakši od Stankove savjesti.');
    };
    await dialog(E, () => {
        const o = [];
        if (!E.f.buy_pojas) o.push(['Kupio bih onaj pojas za dizanje. (30 €)', buy('pojas', 30, 'Odličan izbor! Taj pojas je spasio više leđa nego svi kiropraktičari na otoku!')]);
        if (!E.f.buy_zob) o.push(['Treba mi vreća zobenih pahuljica. (10 €)', buy('zob', 10, 'Zob! Hrana prvaka! I konja. Ali uglavnom prvaka!')]);
        if (!E.f.buy_magnezij) o.push(['Daj mi kantu magnezija. (10 €)', buy('magnezij', 10, 'Magnezij! Suhe ruke, čvrst hvat, nula isprika!')]);
        o.push(['Imaš li steroide?', async () => {
            E.pose('stanko', 'crab');
            await s('ŠŠŠŠŠ! Jesi li lud?!');
            E.pose('stanko', null);
            await s('Ovo je POŠTEN dućan! Pogledaj što se dogodilo LeBulku. Ništa umjetno. Sve prirodno i rabljeno!');
        }]);
        o.push(['Kako ide posao?', () => s('Odlično! Ovaj tjedan prodao sam tri bučice! Istu bučicu, tri puta, ali ipak!')]);
        o.push(['Samo razgledam.', () => s('Razgledaj, razgledaj! Gledanje je besplatno! Zasad.'), true]);
        return o;
    });
}

ROOMS.trgovina = {
    walk: { x1: 60, x2: 960, y1: 456, y2: 526 },
    scale: [456, 0.9, 526, 1],
    spawn: { default: { x: 112, y: 486, f: 1 }, ulica: { x: 112, y: 486, f: 1 } },
    draw(E, g) {
        Draw.vgrad(g, 0, 0, W, 440, 0x4a2e5a, 0x2e1c3a, 16);
        g.fillStyle(0x5a3a6a, 0.5);
        for (let x = 0; x < W; x += 40) g.fillRect(x, 0, 14, 440);
        g.fillStyle(0x2a1830); g.fillRect(0, 0, W, 24);
        for (let y = 440; y < 544; y += 26) for (let x = 0; x < W; x += 52) {
            g.fillStyle(((x / 52) + (y - 440) / 26) % 2 ? 0x6a5a4a : 0x4a3e32);
            g.fillPoints([{ x, y }, { x: x + 52, y }, { x: x + 52 + (x - 512) * 0.05, y: y + 26 }, { x: x + (x - 512) * 0.05, y: y + 26 }], true);
        }
        g.fillStyle(0x2a1830); g.fillRect(0, 436, W, 6);
        // Shelves of tubs
        const r = rng(77);
        for (const y of [170, 260, 350]) {
            g.fillStyle(0x3a2212); g.fillRect(130, y, 160, 8);
            for (let x = 138; x < 280; x += 30) {
                const c = [0xc03030, 0x3060c0, 0x30a050, 0xe0a020, 0x8a3ac0, 0xe0e0e0][Math.floor(r() * 6)];
                const h = 34 + r() * 20;
                g.fillStyle(c); g.fillRect(x, y - h, 24, h);
                g.fillStyle(0xffffff); g.fillRect(x + 3, y - h * 0.55, 18, 9);
                g.fillStyle(shade(c, 0.7)); g.fillRect(x, y - h, 24, 5);
            }
        }
        // Wall hook for the belt
        g.fillStyle(0x6a6a6a); g.fillRect(338, 168, 6, 10);
        Draw.board(E, 360, 52, 380, 50, 'SVE RABLJENO!  POVRAT NOVCA: NE.', 18, 0xe8dcb0, '#8a1a2a', 2);
        E.txt(560, 130, '"Kod Stanka svaki uteg ima priču!"', { fontSize: '15px', color: '#e8c8ff', fontStyle: 'italic' }, 2).setOrigin(0.5);
        // Dumbbell rack
        g.fillStyle(0x2a2a2a); g.fillRect(540, 400, 120, 6); g.fillRect(546, 406, 6, 34); g.fillRect(648, 406, 6, 34);
        for (let i = 0; i < 4; i++) { g.fillStyle(0x3a3a3a); g.fillCircle(558 + i * 28, 392, 9); g.fillRect(552 + i * 28, 384, 12, 4); }
        // Door
        g.fillStyle(0x1a0c06); g.fillRect(20, 246, 84, 196);
        Draw.door(g, 26, 252, 72, 190, 0x5a3a20);
        // Counter
        const c = E.gfx(445);
        c.fillStyle(0x3a2030); c.fillRect(656, 352, 308, 14);
        c.fillStyle(0x6a3a5a); c.fillRect(662, 364, 296, 82);
        c.fillStyle(0x7a4a6a); for (let x = 676; x < 950; x += 46) c.fillRect(x, 374, 36, 62);
        c.fillStyle(0x2a2a2a); c.fillRect(830, 316, 70, 38); c.fillStyle(0x4a4a4a); c.fillRect(836, 304, 58, 16);
        c.fillStyle(0x70ff70); c.fillRect(842, 308, 46, 8);
    },
    actors: [{
        id: 'stanko', forms: 'Stanko|Stanka|Stanku|Stanka|Stankom', x: 600, y: 482, face: -1, pose: 'hips', walk: [500, 486],
        look: { skin: 0xe8b890, shirt: 0x7a3aa0, shirtType: 'jacket', pants: 0x2a2a3a, shorts: false, hair: 0x5a3a20, hairStyle: 'short', sh: 34, waist: 26, arm: 8, leg: 9, talkArms: true, color: 0xd890ff },
        verbs: {
            look: 'Stanko. Prodavač rabljene opreme. Sako mu je glasniji od njega. A on je jako glasan.',
            talk: stankoTalk,
            'give:*': async E => E.say('stanko', 'Otkup rabljene robe ne radim. Samo prodaju! Ha ha!'),
            pick: 'Stanko bi mi to naplatio.',
        },
    }],
    objects: [
        { id: 'izlaz', forms: 'ulica|ulice|ulici|ulicu|ulicom', rect: [20, 246, 84, 196], walk: [80, 486], exit: 'ulica', spawn: 'trgovina', verbs: { look: 'Vrata prema ulici.' } },
        {
            id: 'police', forms: 'police|polica|policama|police|policama', rect: [128, 110, 166, 252], walk: [210, 470],
            verbs: { look: 'Kante proteina s rokom trajanja "uskoro". Na jednoj piše "okus: da".', pick: async E => E.say('stanko', 'Hej! To se plaća!') },
        },
        {
            id: 'pojasD', forms: 'pojas za dizanje|pojasa za dizanje|pojasu za dizanje|pojas za dizanje|pojasom za dizanje', rect: [300, 170, 90, 66], walk: [340, 470],
            visible: E => !E.f.buy_pojas,
            make(E) {
                const g = E.gfx(2);
                g.fillStyle(0x6b3b1a); g.fillRoundedRect(306, 178, 76, 50, 10);
                g.fillStyle(0x4a2510); g.fillRoundedRect(318, 188, 52, 30, 8);
                g.fillStyle(0xd8b040); g.fillRect(332, 196, 22, 22);
                g.fillStyle(0xffffff); g.fillRect(360, 220, 28, 14);
                g.fillStyle(0x8a1a2a); g.fillRect(364, 225, 20, 4);
                return g;
            },
            verbs: { look: 'Kožni pojas za dizanje. Cijena: 30 €. Kao nov! Barem s jedne strane.', pick: async E => E.say('stanko', 'Hej, hej! Prvo se plaća, onda se nosi!') },
        },
        {
            id: 'zobD', forms: 'vreća zobi|vreće zobi|vreći zobi|vreću zobi|vrećom zobi', rect: [396, 384, 70, 62], walk: [430, 470],
            visible: E => !E.f.buy_zob,
            make(E) {
                const g = E.gfx(446);
                g.fillStyle(0xc8b080); g.fillPoints([{ x: 404, y: 396 }, { x: 456, y: 396 }, { x: 464, y: 446 }, { x: 398, y: 446 }], true);
                g.fillStyle(0xa89060); g.fillTriangle(408, 396, 452, 396, 430, 382);
                g.fillStyle(0x6a3a1a); g.fillRect(410, 394, 40, 4);
                g.fillStyle(0x6a3a1a); g.fillRect(414, 414, 32, 14);
                return g;
            },
            verbs: { look: 'Vreća zobenih pahuljica. Cijena: 10 €.', pick: async E => E.say('stanko', 'To nije besplatni uzorak, prijatelju!') },
        },
        {
            id: 'mgD', forms: 'kanta magnezija|kante magnezija|kanti magnezija|kantu magnezija|kantom magnezija', rect: [690, 306, 50, 50], walk: [714, 470],
            visible: E => !E.f.buy_magnezij,
            make(E) {
                const g = E.gfx(447);
                g.fillStyle(0xf0f0f0); g.fillRect(696, 318, 38, 36); g.fillEllipse(715, 318, 38, 10);
                g.fillStyle(0x2a6ad0); g.fillRect(696, 328, 38, 12);
                return g;
            },
            verbs: { look: 'Kanta magnezija. Cijena: 10 €. Bijeli prah, ali legalan.', pick: async E => E.say('stanko', 'Magnezij se plaća, a ne krade!') },
        },
        {
            id: 'blagajna', forms: 'blagajna|blagajne|blagajni|blagajnu|blagajnom', rect: [826, 298, 80, 58], walk: [860, 470],
            verbs: {
                look: 'Blagajna. Zvoni samo kad Stanko nešto proda. Zato je prašnjava.',
                open: async E => E.say('stanko', 'Ruke dalje od blagajne!'),
            },
        },
        { id: 'bucice', forms: 'bučice|bučica|bučicama|bučice|bučicama', rect: [536, 376, 128, 66], walk: [600, 470], verbs: { look: 'Rabljene bučice. Netko ih je jako dugo podizao. Ili ih je jako dugo bacao.', pick: async E => E.say('stanko', 'Bučice nisu na prodaju! One su... dekoracija!') } },
    ],
    async enter(E) {
        if (E.f.metStanko) return;
        E.f.metStanko = true;
        await E.say('stanko', 'Dobrodošao, dobrodošao! Stankova Rabljena Oprema i Suplementi!');
        await E.say('stanko', 'Sve je rabljeno, ali pažljivo! Prethodni vlasnik vježbao je samo nedjeljom!');
    },
};

// ---------------------------------------------------------------------------------------------
// TERETANA — the Old Gym with the Cursed Barbell
// ---------------------------------------------------------------------------------------------

async function liftBarbell(E) {
    if (E.f.lifted) return E.say('hero', 'Jednom je bilo dovoljno. Kralježnica mi se još ljuti.');
    E.face(1);
    if (!E.f.beltOn) {
        E.pose('hero', 'crab');
        E.sfx('grunt');
        await E.wait(700);
        E.pose('hero', null);
        return E.say('hero', E.has('pojas') ? 'Leđa mi kažu: "Stavi taj pojas koji nosiš sa sobom, genije."' : 'Pokušao sam... i leđa su mi rekla "NE". Treba mi pojas za dizanje.');
    }
    if (!E.f.chalked) {
        E.pose('hero', 'crab');
        await E.wait(600);
        E.pose('hero', null);
        return E.say('hero', 'Šipka mi klizi iz znojnih ruku. Treba mi nešto za bolji hvat.');
    }
    if (!E.f.energy) return E.say('hero', 'Nemam snage. Želudac mi kruli glasnije od Rexa. Moram nešto pojesti.');
    const bar = E.disp('sipka');
    bar.setVisible(false);
    E.hero.setProp('barbell');
    E.pose('hero', 'lift');
    E.sfx('grunt');
    E.shake(900, 0.01);
    await E.say('hero', 'HHHHNNNNNNNGGGGG!!!');
    E.sfx('cheer');
    await E.say('hero', 'DVJESTO KILA! PROKLETSTVO, KLEKNI PREDA MNOM!');
    E.hero.setProp('barbell', false);
    const gold = E.keep(E.add.image(E.hero.c.x + 110, E.hero.c.y - 200, 'it_disk').setDepth(600).setScale(0.7));
    E.sfx('clang');
    await E.tween({ targets: gold, x: E.hero.c.x + 150, y: E.hero.c.y, angle: 400, duration: 600, ease: 'Bounce.easeOut' });
    gold.destroy();
    E.hero.setProp(null);
    E.pose('hero', null);
    E.f.lifted = true;
    E.refresh();
    bar.setVisible(true);
    E.give('disk');
    await E.say('hero', 'Zlatni disk je otpao sa šipke! Kušnja snage: riješena!');
}

ROOMS.teretana = {
    walk: { x1: 60, x2: 990, y1: 456, y2: 526 },
    scale: [456, 0.9, 526, 1],
    spawn: { default: { x: 112, y: 486, f: 1 }, ulica: { x: 112, y: 486, f: 1 } },
    draw(E, g) {
        Draw.bricks(g, 0, 0, W, 440, 0x2e3446, 12);
        g.fillStyle(0x0a0c14, 0.35); g.fillRect(0, 0, W, 440);
        Draw.planks(g, 0, 432, W, 112, 0x3a3026, 5, 14);
        g.fillStyle(0x1a1410); g.fillRect(0, 428, W, 6);
        // Broken window and moonbeam
        Draw.vgrad(g, 560, 90, 150, 110, 0x0a0e2a, 0x253468, 8);
        g.fillStyle(0xfff4cc); g.fillCircle(660, 120, 14);
        g.lineStyle(8, 0x1a1a22); g.strokeRect(560, 90, 150, 110); g.lineBetween(635, 90, 635, 200); g.lineBetween(560, 145, 710, 145);
        g.lineStyle(2, 0xa0b0d0, 0.8); g.lineBetween(590, 100, 610, 130); g.lineBetween(610, 130, 600, 140); g.lineBetween(610, 130, 628, 138);
        g.fillStyle(0xb0c8ff, 0.07); g.fillPoints([{ x: 560, y: 200 }, { x: 710, y: 200 }, { x: 820, y: 530 }, { x: 470, y: 530 }], true);
        // Painted slogan and poster
        E.txt(430, 40, 'BEZ BOLI NEMA DOBITI', { fontSize: '30px', color: '#6a2a2a', fontStyle: 'bold' }, 1).setAlpha(0.6);
        g.fillStyle(0xb8a880, 0.7); g.fillRect(124, 112, 76, 106);
        E.txt(162, 128, '1987', { fontSize: '18px', color: '#5a2a1a' }, 1).setOrigin(0.5).setAlpha(0.7);
        g.fillStyle(0x6a4a3a, 0.7); g.fillCircle(162, 160, 9); g.fillEllipse(162, 190, 34, 34);
        // Cobwebs
        g.lineStyle(1, 0xc8c8d8, 0.5);
        for (let i = 0; i < 6; i++) g.lineBetween(0, 0, 90 * Math.cos(i * 0.3), 90 * Math.sin(i * 0.3));
        for (const rr of [30, 55, 80]) { g.beginPath(); g.arc(0, 0, rr, 0, 1.5); g.strokePath(); }
        for (let i = 0; i < 6; i++) g.lineBetween(W, 0, W - 70 * Math.cos(i * 0.3), 70 * Math.sin(i * 0.3));
        // Mirror
        g.fillStyle(0x5a4020); g.fillRect(244, 174, 122, 182);
        Draw.vgrad(g, 252, 182, 106, 166, 0x6a7a90, 0x3a4458, 10);
        g.fillStyle(0xffffff, 0.15); g.fillTriangle(260, 190, 300, 190, 260, 260);
        g.lineStyle(1, 0xffffff, 0.6); g.lineBetween(330, 190, 310, 240); g.lineBetween(310, 240, 340, 280);
        // Stationary bike
        g.lineStyle(6, 0x5a5a62); g.lineBetween(150, 430, 180, 380); g.lineBetween(180, 380, 220, 430); g.lineBetween(180, 380, 170, 360); g.lineBetween(200, 410, 226, 368);
        g.fillStyle(0x2a2a2a); g.fillEllipse(170, 356, 30, 10); g.fillRect(140, 428, 90, 8);
        g.lineStyle(4, 0x3a3a3a); g.strokeCircle(200, 410, 20);
        g.lineStyle(3, 0x5a5a62); g.lineBetween(220, 366, 236, 360);
        // Door
        g.fillStyle(0x0a0806); g.fillRect(18, 244, 88, 192);
        Draw.door(g, 24, 250, 76, 186, 0x3a2a1a);
        // Dumbbell pile
        for (let i = 0; i < 3; i++) { g.fillStyle(0x3a3434); g.fillCircle(400 + i * 18, 420 - (i % 2) * 6, 8); g.fillRect(396 + i * 18, 410, 8, 10); }
    },
    objects: [
        { id: 'izlaz', forms: 'ulica|ulice|ulici|ulicu|ulicom', rect: [18, 244, 88, 192], walk: [80, 486], exit: 'ulica', spawn: 'teretana', verbs: { look: 'Vrata natrag u uličicu.' } },
        { id: 'prozor', forms: 'prozor|prozora|prozoru|prozor|prozorom', rect: [556, 86, 158, 118], walk: [635, 470], verbs: { look: 'Razbijeni prozor. Kroz njega ulazi mjesečina. I propuh. Uglavnom propuh.', open: 'Već je otvoren. Doslovno je rupa.' } },
        { id: 'poster', forms: 'poster|postera|posteru|poster|posterom', rect: [120, 108, 84, 114], walk: [162, 470], verbs: { look: 'Izblijedjeli poster iz 1987. Neki ogromni lik s gusarskim šeširom. Ispod piše "Le...". Ostatak je netko izgrebao.' } },
        {
            id: 'ogledalo', forms: 'ogledalo|ogledala|ogledalu|ogledalo|ogledalom', rect: [244, 174, 122, 182], walk: [305, 466], face: -1,
            verbs: {
                look: 'Netko jako zgodan me gleda iz ogledala. Ah, to sam ja.',
                use: async E => {
                    E.pose('hero', 'flex');
                    await E.say('hero', 'Tko je najnapumpaniji na cijelom otoku?');
                    E.pose('hero', 'crab');
                    await E.wait(800);
                    E.pose('hero', null);
                    await E.say('hero', 'Ogledalo je napuklo. Od divljenja, nadam se.');
                },
                pick: 'Teško je i ukleto. Ne treba mi sedam godina nesreće ni sedam godina bez napretka.',
            },
        },
        {
            id: 'bicikl', forms: 'sobni bicikl|sobnog bicikla|sobnom biciklu|sobni bicikl|sobnim biciklom', rect: [130, 344, 120, 94], walk: [190, 470],
            verbs: {
                look: 'Sobni bicikl. Prešao je tisuće kilometara, a nije se maknuo s mjesta. Kao moja karijera dosad.',
                use: 'Kardio? Ja? Kardio je za ljude koji ne znaju dizati.',
                push: 'Ne miče se. Ni kad pedaliraš.',
            },
        },
        {
            id: 'sipka', forms: 'Prokleta šipka|Proklete šipke|Prokletoj šipki|Prokletu šipku|Prokletom šipkom', rect: [386, 400, 290, 82], walk: [528, 494], face: 1,
            make(E) {
                const c = E.keep(E.add.container(0, 0).setDepth(472));
                const g = E.add.graphics();
                g.fillStyle(0x7a7a80); g.fillRect(400, 444, 256, 7);
                for (const x of [430, 626]) { g.fillStyle(0x1e1e22); g.fillRoundedRect(x - 9, 404, 18, 86, 5); }
                for (const x of [448, 608]) { g.fillStyle(0x2a2a30); g.fillRoundedRect(x - 7, 414, 14, 66, 4); }
                g.fillStyle(0x8a5a3a, 0.5); g.fillRect(470, 440, 30, 3); g.fillRect(560, 452, 24, 2);
                const gold = E.add.graphics();
                gold.fillStyle(0xf2c430); gold.fillRoundedRect(640, 412, 14, 70, 5);
                gold.fillStyle(0xfff0a0); gold.fillRect(643, 418, 3, 56);
                c.add([g, gold]);
                c.gold = gold;
                E.tweens.add({ targets: gold, alpha: { from: 1, to: 0.7 }, duration: 700, yoyo: true, repeat: -1 });
                return c;
            },
            update(E, c) { c.gold.setVisible(!E.f.lifted); },
            verbs: {
                look: E => E.f.lifted ? 'Prokleta šipka. Više nije toliko prokleta. Sad je samo jako teška.' : 'Prokleta šipka. Kažu da je na njoj dvjesto kila, prokletstvo i malo hrđe. Na kraju je pričvršćen Zlatni disk.',
                pick: liftBarbell, use: liftBarbell, pull: liftBarbell,
                push: 'Gurnuti šipku? To nije vježba. To je odustajanje.',
                'use:pojas': 'Pojas se stavlja na mene, ne na šipku.',
                'use:magnezij': 'Magnezij ide na ruke, ne na šipku.',
            },
        },
        {
            id: 'ormarici', forms: 'ormarići|ormarića|ormarićima|ormariće|ormarićima', rect: [784, 244, 188, 192], walk: [878, 470],
            verbs: {
                look: 'Stari ormarići. Na lokotima piše "Moji proteini. Ne diraj. — Mile, 1986."',
                open: 'Ti su zaključani. Mile je bio paranoičan.',
            },
        },
        {
            id: 'ormaric', forms: 'srednji ormarić|srednjeg ormarića|srednjem ormariću|srednji ormarić|srednjim ormarićem', rect: [848, 244, 60, 192], walk: [878, 470],
            make(E) {
                const c = E.keep(E.add.container(0, 0).setDepth(300));
                const g = E.add.graphics();
                c.add(g); c.g = g;
                return c;
            },
            update(E, c) {
                const g = c.g;
                g.clear();
                for (const x of [788, 850, 912]) {
                    g.fillStyle(0x3a4a5a); g.fillRect(x, 246, 58, 190);
                    g.fillStyle(0x2a3440); for (let i = 0; i < 4; i++) g.fillRect(x + 14, 264 + i * 8, 30, 3);
                    g.fillStyle(0x8a8a8a); g.fillRect(x + 46, 330, 5, 16);
                }
                g.fillStyle(0x6a5a3a, 0.5); g.fillRect(800, 336, 8, 10); g.fillRect(924, 336, 8, 10);
                if (E.f.locker) {
                    g.fillStyle(0x0c1016); g.fillRect(850, 246, 58, 190);
                    g.fillStyle(0x2a3440); g.fillRect(850, 370, 58, 4);
                    g.fillStyle(0x4a5a6a); g.fillPoints([{ x: 850, y: 246 }, { x: 826, y: 236 }, { x: 826, y: 446 }, { x: 850, y: 436 }], true);
                }
            },
            verbs: {
                look: E => E.f.locker ? (E.f.kreatinTaken ? 'Prazan ormarić. Miriše na 1987.' : 'U ormariću je stara kanta nečega.') : 'Srednji ormarić. Nema lokota. Mile je očito imao povjerenja u ljude.',
                open: async E => {
                    if (E.f.locker) return E.say('hero', 'Već je otvoren.');
                    E.f.locker = true;
                    E.sfx('creak');
                    E.refresh();
                    await E.say('hero', E.f.kreatinTaken ? 'Prazan je.' : 'Ormarić je zaškripio kao koljena starog bildera. Unutra je nešto!');
                },
                close: async E => {
                    if (!E.f.locker) return E.say('hero', 'Već je zatvoren.');
                    E.f.locker = false;
                    E.sfx('creak');
                    E.refresh();
                },
            },
        },
        {
            id: 'kreatinD', forms: 'kanta kreatina|kante kreatina|kanti kreatina|kantu kreatina|kantom kreatina', rect: [856, 326, 46, 46], walk: [878, 470],
            visible: E => E.f.locker && !E.f.kreatinTaken,
            make(E) {
                const g = E.gfx(301);
                g.fillStyle(0x4a6a3a); g.fillRect(862, 334, 34, 36); g.fillEllipse(879, 334, 34, 9);
                g.fillStyle(0xd8c890); g.fillRect(864, 344, 30, 14);
                g.lineStyle(1, 0xdddddd, 0.6); g.lineBetween(862, 330, 852, 316); g.lineBetween(896, 330, 906, 318);
                return g;
            },
            verbs: {
                look: 'Kanta kreatina. Rok trajanja: ožujak 1989. Savršeno odležano!',
                pick: async E => {
                    E.f.kreatinTaken = true;
                    E.give('kreatin');
                    E.refresh();
                    await E.say('hero', 'Drevni kreatin! Stvrdnuo se u kocku, ali prah je samo stanje uma.');
                },
            },
        },
    ],
    async enter(E) {
        if (E.f.inGym) return;
        E.f.inGym = true;
        await E.say('hero', 'Stara teretana... Ovdje je nekad vježbao sam LeBulk. Još se osjeća miris znoja. I nečeg sumnjivo kemijskog.');
    },
};

// ---------------------------------------------------------------------------------------------
// PLAŽA — beach bodybuilders and posing duels
// ---------------------------------------------------------------------------------------------

const BEACH = [
    { forms: 'Napuhani Nikola|Napuhanog Nikole|Napuhanom Nikoli|Napuhanog Nikolu|Napuhanim Nikolom', skin: 0xc88a5a, pants: 0xd03030, hair: 0x2a1a10, hairStyle: 'short' },
    { forms: 'Mišićavi Mile|Mišićavog Mile|Mišićavom Mili|Mišićavog Milu|Mišićavim Milom', skin: 0xe0a878, pants: 0x2a8ad0, hair: 0xb04020, hairStyle: 'mohawk' },
    { forms: 'Kockasti Krešo|Kockastog Kreše|Kockastom Kreši|Kockastog Krešu|Kockastim Krešom', skin: 0x9a6a40, pants: 0xe0c020, hair: 0x111111, hairStyle: 'bald', beard: 0x111111 },
    { forms: 'Uljeni Ivo|Uljenog Ive|Uljenom Ivi|Uljenog Ivu|Uljenim Ivom', skin: 0xd89a60, pants: 0x30a050, hair: 0xe8d070, hairStyle: 'long' },
    { forms: 'Zdepasti Zdravko|Zdepastog Zdravka|Zdepastom Zdravku|Zdepastog Zdravka|Zdepastim Zdravkom', skin: 0xb07a50, pants: 0x8a3ac0, hair: 0x3a2a1a, hairStyle: 'short', mustache: 0x3a2a1a },
];
const beachGuy = E => BEACH[E.st.beachIdx % BEACH.length];

async function beachTalk(E) {
    const b = 'bilder';
    if (E.st.ins.length === 0) {
        await E.say(b, 'Dvoboj poziranja? S tobom? Ti ne znaš ni jednu uvredu!');
        await E.say(b, 'Idi do Starog Šime u luci, neka te nauči osnove.');
        return;
    }
    await E.say(b, pick(['Hej, ti! Ti s repićem! Izazivam te na dvoboj poziranja!', 'Što gledaš, mršavko? Hoćeš dvoboj?', 'Ti? Opet ti? Dobro, idemo!']));
    const i = await E.choose(['Prihvaćam! Napni se, napuhanče!', 'Ne sada, moram ići nauljiti trbušnjake.']);
    await E.say('hero', i === 0 ? 'Prihvaćam! Napni se, napuhanče!' : 'Ne sada, moram ići nauljiti trbušnjake.');
    if (i === 1) { await E.say(b, 'Kukavica! Kukavica s repićem!'); return; }
    E.pose(b, null);
    const won = await poseOff(E, b, false);
    if (won) {
        E.st.beachWins++;
        await E.say(b, pick(['Porazio si me! Idem jesti piletinu i plakati.', 'Nemoguće! Moji trbušnjaci se srame!', 'Dobro, dobro! Ti si bolji. Ovaj put.']));
        const d = E.actor(b);
        E.sfx('whoosh');
        await E.tween({ targets: d.c, x: 1100, duration: 900 });
        E.st.beachIdx++;
        const n = E.respawnActor(b);
        n.c.x = 1100;
        await E.tween({ targets: n.c, x: 640, duration: 900 });
        await E.say(b, `Ja sam ${E.nameOf(b)}! Čuo sam da ovdje netko traži dvoboj!`);
        if (E.st.beachWins === 2) await E.say('hero', 'Mislim da sam spreman za Vesnu. Možda. Trebao bih znati što više odgovora.');
    } else {
        await E.say(b, 'Hahaha! Vrati se kad naučiš odgovarati, repiću!');
        await E.say('hero', 'Barem sam naučio nešto novo. Mislim.');
    }
}

ROOMS.plaza = {
    walk: { x1: 30, x2: 1000, y1: 432, y2: 522 },
    scale: [432, 0.86, 522, 1],
    spawn: { default: { x: 120, y: 476, f: 1 }, ulica: { x: 50, y: 476, f: 1 }, hram: { x: 985, y: 460, f: -1 } },
    draw(E, g) {
        Draw.vgrad(g, 0, 0, W, 260, 0x0b1030, 0x4a3a7a);
        Draw.stars(g, 0, 0, W, 180, 120, 51);
        Draw.moon(g, 790, 82, 34);
        Draw.vgrad(g, 0, 250, W, 80, 0x2a3a7a, 0x1a2a5a, 10);
        for (let i = 0; i < 8; i++) { g.fillStyle(0xfff3c0, 0.4 - i * 0.04); g.fillRect(770 - i * 4, 256 + i * 9, 40 + i * 8, 2); }
        Draw.waves(E, 0, 1024, 258, 322, 20, 61);
        Draw.vgrad(g, 0, 320, W, 224, 0x8a7a5a, 0xc0a878, 12);
        g.fillStyle(0xe8e0d0, 0.5); for (let x = 0; x < W; x += 60) g.fillEllipse(x + 20, 324, 70, 6);
        const r = rng(62);
        g.fillStyle(0x9a8a6a); for (let i = 0; i < 80; i++) g.fillRect(r() * W, 340 + r() * 200, 2, 1);
        g.fillStyle(0xe06040); g.fillPoints([{ x: 300, y: 520 }, { x: 306, y: 508 }, { x: 312, y: 520 }, { x: 324, y: 522 }, { x: 314, y: 528 }, { x: 318, y: 540 }, { x: 306, y: 532 }, { x: 294, y: 540 }, { x: 298, y: 528 }, { x: 288, y: 522 }], true);
        g.fillStyle(0xf0e0d0); g.fillEllipse(760, 528, 16, 10);
        Draw.palm(g, 70, 440, 1.1);
        Draw.palm(g, 190, 400, 0.7);
        // Jungle on the right
        g.fillStyle(0x0e2a1a);
        for (let i = 0; i < 14; i++) g.fillCircle(910 + (i % 4) * 40 + r() * 20, 160 + Math.floor(i / 4) * 70 + r() * 20, 50 + r() * 20);
        g.fillStyle(0x163a22);
        for (let i = 0; i < 8; i++) g.fillCircle(930 + r() * 100, 200 + r() * 200, 30 + r() * 20);
        g.fillStyle(0x061208); g.fillEllipse(990, 400, 80, 120);
        // Coconut dumbbells
        g.fillStyle(0x6a4a2a); g.fillRect(430, 482, 50, 5);
        g.fillStyle(0x5a3a1a); g.fillCircle(428, 484, 12); g.fillCircle(482, 484, 12);
        g.fillStyle(0x3a2410); g.fillCircle(424, 480, 2); g.fillCircle(430, 480, 2); g.fillCircle(484, 480, 2);
        g.fillStyle(0x4a3220); g.fillRect(880, 360, 8, 76);
        Draw.board(E, 836, 330, 140, 34, 'HRAM POZIRANJA →', 14, 0x6a4422, '#ffe8b0', 2);
        Draw.torch(E, 300, 440);
        Draw.torch(E, 760, 432);
    },
    actors: [{
        id: 'bilder', forms: E => beachGuy(E).forms, x: 640, y: 470, face: -1, pose: 'flex',
        look: E => Object.assign({ shirtType: 'none', shorts: true, sh: 50, waist: 21, arm: 15, leg: 14, color: 0x80e0ff }, beachGuy(E)),
        verbs: {
            look: E => `${E.nameOf('bilder')}. Bilder s plaže. Nauljen kao sardina i jednako pametan.`,
            talk: beachTalk,
            'give:*': async E => E.say('bilder', 'Ne trebam ništa od tebe. Osim tvog poraza!'),
            pick: 'Previše je nauljen. Iskliznuo bi mi kao sapun.',
        },
    }],
    objects: [
        { id: 'izlazL', forms: 'ulica|ulice|ulici|ulicu|ulicom', rect: [0, 330, 32, 214], walk: [30, 476], exit: 'ulica', spawn: 'plaza', verbs: { look: 'Put natrag u grad.' } },
        { id: 'izlazR', forms: 'Hram poziranja|Hrama poziranja|Hramu poziranja|Hram poziranja|Hramom poziranja', rect: [950, 330, 74, 130], walk: [1000, 456], exit: 'hram', spawn: 'plaza', verbs: { look: 'Staza kroz džunglu prema Hramu poziranja.' } },
        { id: 'more', forms: 'more|mora|moru|more|morem', rect: [0, 250, 900, 72], walk: [500, 436], verbs: { look: 'More se sjaji na mjesečini. Romantično. Kad ne bi mirisalo na ulje za sunčanje.' } },
        { id: 'znak', forms: 'natpis|natpisa|natpisu|natpis|natpisom', rect: [834, 328, 144, 108], walk: [884, 446], verbs: { look: '"Hram poziranja →". Ispod sitnije: "Ulaz samo za one koji su nekoga pobijedili."' } },
        { id: 'kokosi', forms: 'bučice od kokosa|bučica od kokosa|bučicama od kokosa|bučice od kokosa|bučicama od kokosa', rect: [412, 468, 86, 32], walk: [456, 500], verbs: { look: 'Bučice od kokosa. Domaća radinost. Sigurno pola kile, sve zajedno.', pick: 'Preteške su. Šalim se. Ali ne trebaju mi.', use: 'Ne mogu vježbati s nečim što je lakše od moje sendviča.' } },
        { id: 'baklja', forms: 'baklja|baklje|baklji|baklju|bakljom', rect: [286, 320, 30, 120], walk: [300, 450], verbs: { look: 'Baklja. Daje taman dovoljno svjetla da se vide trbušnjaci.', pick: 'Vruća je. A ja nisam nauljen dovoljno za to.' } },
    ],
};

// ---------------------------------------------------------------------------------------------
// HRAM POZIRANJA — Vesna, the Posing Master
// ---------------------------------------------------------------------------------------------

async function vesnaTalk(E) {
    const s = l => E.say('vesna', l);
    if (!E.f.metVesna) {
        E.f.metVesna = true;
        await s('Gle, gle. Netko je zalutao u moj hram.');
        await s('Ja sam Vesna, Majstorica Poziranja. Što hoćeš, repiću?');
    }
    await dialog(E, () => {
        const o = [];
        if (!E.f.vesna) o.push(['Izazivam te na dvoboj poziranja!', async () => {
            if (E.st.beachWins < 2) {
                await s('Ti? Mene? Prvo pobijedi barem dvojicu onih napuhanaca na plaži.');
                await s(`Zasad si pobijedio ${E.st.beachWins}. Vrati se kad budeš imao nešto za pokazati.`);
                return;
            }
            await s('Dobro. Ali upozoravam te: moje uvrede nisu kao one na plaži.');
            E.pose('vesna', null);
            const won = await poseOff(E, 'vesna', true);
            E.pose('vesna', 'hips');
            if (won) {
                await s('Nemoguće... Pobijedio si me!');
                await s('Dobro. Zaslužio si dokaz. Evo, uzmi ovu majicu.');
                E.give('majica');
                E.f.vesna = true;
                await E.say('hero', '"Pobijedio sam Vesnu i dobio samo ovu glupu majicu"?');
                await s('Tako na njoj i piše. Trebao si vidjeti one koje sam dijelila prošle godine.');
            } else {
                await s('Ha! Vrati se kad naučiš prave odgovore.');
                await s('Savjet: bilderi na plaži znaju sve odgovore. Samo ih moraš natjerati da ih kažu.');
            }
        }]);
        o.push(['Zašto te zovu Majstorica Poziranja?', () => s('Zato što sam pobijedila svakog bildera na otoku. Neke i dvaput. Jednog triput, ali on je stalno mijenjao perike.')]);
        o.push(['Jesi li ikad pobijedila LeBulka?', async () => {
            await s('LeBulk ne ulazi u dvoboje poziranja. On samo stoji i bude ogroman. I to mu, nažalost, uvijek prođe.');
            await s('Toliko je umjetan da ne podnosi ništa prirodno. Ni sunce, ni salatu.');
        }]);
        o.push(['Moram ići.', () => s(E.f.vesna ? 'Idi. I nosi tu majicu s ponosom.' : 'Idi, idi. Vježbaj.'), true]);
        return o;
    });
}

ROOMS.hram = {
    walk: { x1: 30, x2: 1000, y1: 456, y2: 526 },
    scale: [456, 0.88, 526, 1],
    spawn: { default: { x: 60, y: 488, f: 1 }, plaza: { x: 60, y: 488, f: 1 } },
    draw(E, g) {
        Draw.vgrad(g, 0, 0, W, 440, 0x07160e, 0x1a3a2a, 16);
        Draw.stars(g, 0, 0, W, 80, 40, 71);
        const r = rng(72);
        g.fillStyle(0x0c2416);
        for (let i = 0; i < 30; i++) g.fillCircle(r() * W, 60 + r() * 160, 40 + r() * 40);
        g.fillStyle(0x12301e);
        for (let i = 0; i < 16; i++) g.fillCircle(r() * W, 240 + r() * 160, 30 + r() * 30);
        Draw.vgrad(g, 0, 436, W, 108, 0x4a4a3a, 0x3a3a2a, 6);
        // Temple
        g.fillStyle(0x8a8a7a); g.fillRect(250, 360, 540, 80);
        g.fillStyle(0x9a9a8a); g.fillRect(270, 340, 500, 24); g.fillRect(290, 320, 460, 24);
        g.fillStyle(0x7a7a6a); g.fillRect(250, 400, 540, 4); g.fillRect(270, 362, 500, 4);
        g.fillStyle(0x0a0a08); g.fillRect(480, 190, 100, 130);
        Draw.glow(g, 530, 270, 60, 0xff9040, 0.04, 4);
        for (const x of [310, 410, 630, 730]) {
            g.fillStyle(0xb0b0a0); g.fillRect(x - 18, 160, 36, 162);
            g.fillStyle(0x9a9a8a); for (let k = -12; k <= 12; k += 8) g.fillRect(x + k, 166, 3, 150);
            g.fillStyle(0xc0c0b0); g.fillRect(x - 24, 152, 48, 12); g.fillRect(x - 24, 316, 48, 8);
        }
        g.fillStyle(0xb8b8a8); g.fillRect(270, 124, 500, 32);
        g.fillStyle(0xa8a898); g.fillTriangle(262, 126, 778, 126, 520, 56);
        g.fillStyle(0x8a8a7a); g.fillTriangle(310, 118, 730, 118, 520, 72);
        E.txt(520, 140, 'HRAM POZIRANJA', { fontSize: '20px', color: '#5a5a4a', fontStyle: 'bold' }, 1).setOrigin(0.5);
        g.fillStyle(0x2a6a2a);
        for (let i = 0; i < 10; i++) { g.fillRect(250 + i * 58, 156, 3, 30 + r() * 60); g.fillCircle(252 + i * 58, 190 + r() * 40, 5); }
        // Pedestals for the statues
        for (const x of [160, 880]) { g.fillStyle(0x8a8a7a); g.fillRect(x - 40, 392, 80, 48); g.fillStyle(0x9a9a8a); g.fillRect(x - 46, 386, 92, 10); }
        Draw.torch(E, 230, 446, 100);
        Draw.torch(E, 820, 446, 100);
        const st1 = makeDude(E, { skin: 0xa8a898, shirtType: 'none', pants: 0x9a9a8a, shoes: 0x9a9a8a, hair: 0x9a9a8a, hairStyle: 'short', sh: 50, waist: 20, arm: 15, leg: 14 });
        st1.c.setPosition(160, 388); st1.setScale(0.8); st1.pose = 'flex'; st1.c.setDepth(388);
        const st2 = makeDude(E, { skin: 0xa8a898, shirtType: 'none', pants: 0x9a9a8a, shoes: 0x9a9a8a, hair: 0x9a9a8a, hairStyle: 'pirate', longBeard: true, beard: 0x9a9a8a, sh: 60, waist: 26, arm: 18, leg: 16 });
        st2.c.setPosition(880, 388); st2.setScale(0.8); st2.setFacing(-1); st2.pose = 'crab'; st2.c.setDepth(388);
        for (const st of [st1, st2]) { E.keep(st.c); for (let i = 0; i < 60; i++) st.update(30); }
    },
    actors: [{
        id: 'vesna', forms: 'Vesna|Vesne|Vesni|Vesnu|Vesnom', x: 540, y: 470, face: -1, pose: 'hips', walk: [430, 486],
        look: { skin: 0xe0a070, shirt: 0xb03a90, shirtType: 'top', shorts: true, pants: 0x3a1a4a, hair: 0xd04a20, hairStyle: 'long', female: true, sh: 38, waist: 17, arm: 10, leg: 11, h: 0.97, color: 0xff80c0 },
        verbs: {
            look: 'Vesna, Majstorica Poziranja. Ima bicepse veće od mojih. I to mi nimalo ne smeta. Možda malo.',
            talk: vesnaTalk,
            'give:*': async E => E.say('vesna', 'Ne trebaju mi pokloni. Trebaju mi izazovi.'),
            pick: 'Ona bi mene prije podigla. Jednom rukom.',
        },
    }],
    objects: [
        { id: 'izlaz', forms: 'plaža|plaže|plaži|plažu|plažom', rect: [0, 330, 32, 214], walk: [30, 488], exit: 'plaza', spawn: 'hram', verbs: { look: 'Staza natrag na plažu.' } },
        { id: 'stupovi', forms: 'stupovi|stupova|stupovima|stupove|stupovima', rect: [280, 56, 480, 270], walk: [520, 466], verbs: { look: 'Mramorni stupovi. Isklesani su u obliku... bicepsa? Da, definitivno bicepsa.', push: 'Ne želim srušiti hram. Barem ne prije natjecanja.' } },
        { id: 'ulaz', forms: 'ulaz u hram|ulaza u hram|ulazu u hram|ulaz u hram|ulazom u hram', rect: [480, 190, 100, 130], walk: [530, 466], verbs: { look: 'Unutra je mračno i miriše na ulje za sunčanje i ego.', walk: async E => E.say('vesna', 'Unutra smiju samo pobjednici. A ti to još nisi.'), open: 'Nema vrata. Samo tama i miris ega.' } },
        { id: 'kip1', forms: 'kip|kipa|kipu|kip|kipom', rect: [110, 230, 100, 210], walk: [170, 470], verbs: { look: 'Kip nepoznatog bildera. Na postolju piše: "Preskočio je dan za noge samo jednom."', pick: 'Kameni bilder težak je kao pravi. Vjerojatno i jednako tvrdoglav.' } },
        { id: 'kip2', forms: 'kip LeBulka|kipa LeBulka|kipu LeBulka|kip LeBulka|kipom LeBulka', rect: [820, 210, 120, 230], walk: [860, 470], verbs: { look: 'Kip LeBulka iz vremena kad je još bio živ. I prirodan. Tada je bio samo velik, a ne ogroman.', push: 'Ne miče se. Čak i kao kip je tvrdoglav.' } },
    ],
};

// ---------------------------------------------------------------------------------------------
// POZORNICA — the contest and the finale
// ---------------------------------------------------------------------------------------------

async function lebulkTalk(E) {
    const s = l => E.say('lebulk', l);
    await dialog(E, () => [
        ['Izazivam te, LeBulk!', async () => {
            await s('Ti? MENE?');
            E.pose('lebulk', 'flex');
            E.sfx('whoosh');
            E.shake(600, 0.01);
            await s('MOJI STEROIDI IMAJU STEROIDE!');
            await E.tween({ targets: E.hero.c, x: E.hero.c.x - 60, duration: 250, ease: 'Quad.easeOut' });
            E.pose('lebulk', null);
            await E.say('hero', 'Uf. Mora postojati neki drugi način.');
        }],
        ['Kako si postao tako velik?', async () => {
            await s('Jednostavno! Steroidi! Hormoni! Sintetika! Kemija!');
            await s('Ništa prirodno! Nikad! Ni jedna jedina kalorija prirodnog podrijetla!');
            await s('Prirodna hrana me... brrr. Ne želim ni misliti o tome.');
        }],
        ['Zašto si duh?', async () => {
            await s('Malo sam pretjerao s dozom. Jako malo. Toliko da sam umro.');
            await s('Ali pogledaj kako sam napumpan! Isplatilo se!');
        }],
        ['Ništa, ništa.', async () => { E.sfx('laugh'); await s('HAHAHAHA!'); }, true],
    ]);
}

async function finale(E) {
    await E.say('hero', 'Hej, LeBulk! Mora da si žedan nakon tristo godina pobjeđivanja. Izvoli, šejk!');
    await E.say('lebulk', 'Šejk? HAHAHA! Ja pijem samo čiste... sintetičke... umjetne...');
    await E.say('lebulk', '...hm. A kakav je to šejk?');
    await E.say('hero', 'Legendarni. Najjači na otoku.');
    await E.say('lebulk', 'NAJJAČI? Daj to ovamo!');
    E.take('sejk');
    E.pose('lebulk', 'reach');
    E.sfx('gulp');
    await E.wait(900);
    E.pose('lebulk', null);
    await E.say('lebulk', 'Mmm... jaje... zob... mlijeko... kreatin iz osamdeset sedme...');
    await E.say('lebulk', 'Čekaj... sve ovo je... PRIRODNO?!');
    E.sfx('poof');
    E.shake(1600, 0.012);
    const lb = E.actor('lebulk');
    E.tweens.add({ targets: lb.c, alpha: { from: 0.85, to: 0.35 }, duration: 90, yoyo: true, repeat: 10 });
    await E.say('lebulk', 'NEEEEEEEEEEE! Ispuhujem se! Moji steroidi... moji predivni steroidi...');
    if (E.lbGlow) E.tweens.add({ targets: E.lbGlow, alpha: 0, duration: 1600 });
    await E.tween({ targets: lb.c, scaleX: -0.04, scaleY: 0.04, alpha: 0, y: lb.c.y - 80, duration: 1700, ease: 'Quad.easeIn' });
    for (let i = 0; i < 18; i++) {
        const p = E.keep(E.add.circle(770, 360, 8 + Math.random() * 14, 0x9affb0, 0.7).setDepth(900));
        E.tweens.add({ targets: p, x: 770 + (Math.random() - 0.5) * 400, y: 360 + (Math.random() - 0.7) * 300, alpha: 0, scale: 2, duration: 1200 + Math.random() * 800 });
    }
    await E.say({ x: 770, y: 240, color: 0x80ff80 }, 'Vratit ću se... u nastavku...');
    E.sfx('cheer');
    E.pose('elena', 'cheer');
    await E.say('elena', 'Dame i gospodo... LeBulk se ispuhao!');
    await E.say('elena', 'Novi Gospodar Otoka Mišića je... GAJBRUŠ BICEPVUD!');
    E.sfx('cheer');
    E.pose('hero', 'flex');
    await E.say('hero', 'Zovem se Gajbruš Bicepvud i... POSTAO SAM BODYBUILDER!');
    E.pose('hero', 'cheer');
    E.pose('elena', null);
    await E.say('elena', 'Čestitam, Gajbruš. A sad... jesi li za večeru? Čula sam da imaš odličan recept za šejk.');
    await E.say('hero', 'Za tebe? Dupla porcija zobi.');
    await E.wait(600);
    E.showEnding();
}

ROOMS.pozornica = {
    walk: { x1: 290, x2: 690, y1: 438, y2: 476 },
    scale: [438, 0.9, 476, 0.97],
    spawn: { default: { x: 330, y: 462, f: 1 } },
    draw(E, g) {
        Draw.vgrad(g, 0, 0, W, 340, 0x1a0a2a, 0x3a1450, 12);
        Draw.stars(g, 100, 90, 824, 220, 70, 81);
        g.fillStyle(0x2a0e3a); for (let x = 90; x < 934; x += 36) g.fillRect(x, 0, 14, 340);
        E.txt(512, 112, 'GOSPODAR OTOKA MIŠIĆA', { fontSize: '40px', color: '#ffcc33', stroke: '#5a2a00', strokeThickness: 6, fontStyle: 'bold' }, 2).setOrigin(0.5);
        E.txt(512, 152, 'veliko finale · 300. obljetnica LeBulkove pobjede', { fontSize: '16px', color: '#e0b0ff' }, 2).setOrigin(0.5);
        Draw.planks(g, 0, 330, W, 150, 0x7a5a3a, 5, 91);
        g.fillStyle(0x3a2414); g.fillRect(0, 476, W, 24);
        g.fillStyle(0x0a0610); g.fillRect(0, 500, W, 44);
        // Curtains
        for (const [x0, x1] of [[0, 90], [934, 1024]]) {
            g.fillStyle(0x8a1020); g.fillRect(x0, 0, x1 - x0, 476);
            g.fillStyle(0x6a0818); for (let x = x0 + 10; x < x1; x += 22) g.fillRect(x, 0, 8, 476);
        }
        g.fillStyle(0x8a1020); g.fillRect(0, 0, W, 40);
        g.fillStyle(0xa01828); for (let x = 0; x < W; x += 64) g.fillEllipse(x + 32, 40, 64, 30);
        g.fillStyle(0xd8a020); g.fillRect(0, 0, W, 6);
        // Spotlights
        for (const [x, tx] of [[180, 360], [512, 512], [840, 760]]) {
            const b = E.keep(E.add.graphics().setDepth(3));
            b.fillStyle(0xfff4c0, 0.09); b.fillTriangle(x, 0, tx - 120, 480, tx + 120, 480);
            E.tweens.add({ targets: b, alpha: { from: 1, to: 0.5 }, duration: 900 + x, yoyo: true, repeat: -1 });
        }
        // Judge's table
        const t = E.gfx(470);
        t.fillStyle(0x3a2010); t.fillRect(120, 420, 160, 52);
        t.fillStyle(0x5a3018); t.fillRect(114, 412, 172, 12);
        t.fillStyle(0xe8dcb0); t.fillRect(160, 432, 80, 22);
        E.txt(200, 443, 'SUTKINJA', { fontSize: '13px', color: '#5a2a1a' }, 471).setOrigin(0.5);
        // LeBulk's ghost glow
        E.lbGlow = E.gfx(440);
        Draw.glow(E.lbGlow, 770, 340, 170, 0x60ff90, 0.05, 7);
        E.tweens.add({ targets: E.lbGlow, alpha: { from: 1, to: 0.6 }, duration: 700, yoyo: true, repeat: -1 });
        // Crowd
        const c = E.gfx(2000), r = rng(99);
        for (let x = -10; x < W + 20; x += 28 + r() * 10) {
            const y = 512 + r() * 20, col = r() < 0.5 ? 0x0e0a18 : 0x161024;
            c.fillStyle(col); c.fillEllipse(x, y + 30, 46, 50); c.fillCircle(x, y, 15);
            if (r() < 0.25) { c.fillRect(x + 10, y - 40, 7, 36); c.fillCircle(x + 13, y - 42, 6); }
        }
    },
    actors: [
        {
            id: 'elena', forms: 'Elena|Elene|Eleni|Elenu|Elenom', x: 200, y: 446, face: 1, scale: 0.8, depth: 446,
            look: { skin: 0xf0c8a0, shirt: 0x2a8a6a, shirtType: 'tee', shorts: false, pants: 0x1a2a4a, hair: 0x6a3a1a, hairStyle: 'long', female: true, sh: 28, waist: 17, arm: 6, leg: 8, color: 0xffd0a0 },
            verbs: {
                look: 'Elena Marlić, guvernerka otoka i glavna sutkinja. Pametna, lijepa i jedina na otoku koja zna što je salata.',
                talk: async E => {
                    await E.say('elena', 'Gajbruš! Ne smijem ti pomagati, ja sam sutkinja.');
                    await E.say('elena', 'Ali... da sam ja ti, sjetila bih se što LeBulk najviše mrzi.');
                    await E.say('elena', 'Nešto... prirodno. Domaće. Po starom receptu.');
                },
                'give:sejk': async E => E.say('elena', 'Hvala, ali sutkinje ne smiju primati mito. Čak ni ukusno. Daj ga nekome kome treba... prirode.'),
                'give:*': async E => E.say('elena', 'To je mito, Gajbruš. Lijepo od tebe, ali ne.'),
            },
        },
        {
            id: 'lebulk', forms: 'LeBulk|LeBulka|LeBulku|LeBulka|LeBulkom', x: 770, y: 456, face: -1, depth: 456, walk: [650, 466],
            look: {
                skin: 0x7ae0a0, shirtType: 'none', shorts: true, pants: 0x1a4a2a, shoes: 0x0e2a18, hair: 0x0e2a18, hairStyle: 'pirate',
                beard: 0x2a6a3a, longBeard: true, sh: 72, waist: 32, arm: 22, leg: 19, h: 1.12, alpha: 0.88, color: 0x80ff80,
            },
            verbs: {
                look: 'LeBulk. Napuhani duh od steroida. Toliko je velik da ima vlastitu vremensku prognozu.',
                talk: lebulkTalk,
                'give:sejk': finale, 'use:sejk': finale,
                'give:*': async E => E.say('lebulk', 'Ne trebam tvoje smeće! Trebam samo SINTETIKU!'),
                'use:*': async E => E.say('lebulk', 'HAHAHA! To me samo škaklja!'),
                pick: 'Ruka mi prolazi kroz njega. Hladan je i ljepljiv, kao protein bar iz hladnjaka.',
                push: 'Ruka mi prolazi kroz njega. Hladan je i ljepljiv, kao protein bar iz hladnjaka.',
            },
        },
    ],
    objects: [
        { id: 'publika', forms: 'publika|publike|publici|publiku|publikom', rect: [0, 500, W, 44], walk: [490, 476], verbs: { look: 'Publika. Svi navijaju za LeBulka. Iz straha, pretpostavljam.', talk: 'Netko iz publike viče: "Skini se do pojasa!" Ja sam već do pojasa.' } },
        { id: 'transparent', forms: 'transparent|transparenta|transparentu|transparent|transparentom', rect: [250, 84, 524, 84], walk: [500, 446], verbs: { look: '"Gospodar Otoka Mišića". Večeras netko odlazi kući s titulom. A netko bez steroida.' } },
        { id: 'stol', forms: 'sudački stol|sudačkog stola|sudačkom stolu|sudački stol|sudačkim stolom', rect: [112, 410, 176, 64], walk: [300, 462], verbs: { look: 'Sudački stol. Na njemu su bodovne liste, olovka i jedna jako uplašena čaša vode.' } },
    ],
    async enter(E) {
        if (E.f.stageIntro) return;
        E.f.stageIntro = true;
        E.pose('hero', null);
        await E.say('elena', 'Dame i gospodo! Dobrodošli na natjecanje za Gospodara Otoka Mišića!');
        await E.say('elena', 'Branitelj naslova, tristo godina zaredom... LeBulk!');
        E.pose('lebulk', 'flex');
        E.sfx('laugh');
        E.shake(500, 0.005);
        await E.say('lebulk', 'HAHAHAHAHA! Tko se usuđuje izazvati MENE?');
        E.pose('lebulk', null);
        E.pose('hero', 'flex');
        await E.say('hero', 'Ja! Gajbruš Bicepvud!');
        E.pose('hero', null);
        await E.say('lebulk', 'Gajbruš? Kakvo je to ime? Zvučiš kao četka za WC.');
        await E.say('elena', 'Prema pravilima, pobjeđuje najveći. A LeBulk je... pa... ogroman.');
        await E.say('hero', 'Mora postojati način da ga smanjim na pravu mjeru.');
    },
};
