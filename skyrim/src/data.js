// Items, spells, shouts, creatures, quests and every conversation in the game.
const ITEMS = {
    iron_sword: { name: 'Željezni mač', kind: 'weapon', dmg: 8, price: 30, tint: 0x9aa0a6 },
    steel_sword: { name: 'Čelični mač', kind: 'weapon', dmg: 13, price: 110, tint: 0xd6dade },
    orcish_sword: { name: 'Orkovski mač', kind: 'weapon', dmg: 19, price: 280, tint: 0x7f9a6a },
    ebony_sword: { name: 'Ebanovinski mač', kind: 'weapon', dmg: 28, price: 750, tint: 0x4a3f58 },
    dragonbone_sword: { name: 'Mač od zmajeve kosti', kind: 'weapon', dmg: 40, price: 1200, tint: 0xf0e2c0, needs: 'dragon_bone' },
    hunting_bow: { name: 'Lovački luk', kind: 'bow', dmg: 12, price: 70 },
    elven_bow: { name: 'Vilenjački luk', kind: 'bow', dmg: 22, price: 380 },
    hide_armor: { name: 'Kožni oklop', kind: 'armor', armor: 10, price: 20 },
    iron_armor: { name: 'Željezni oklop', kind: 'armor', armor: 25, price: 140 },
    steel_armor: { name: 'Čelični oklop', kind: 'armor', armor: 42, price: 400 },
    dragonscale_armor: { name: 'Oklop od zmajevih ljusaka', kind: 'armor', armor: 75, price: 1100, needs: 'dragon_bone' },
    potion_hp: { name: 'Napitak zdravlja', kind: 'potion', stat: 'hp', amt: 60, price: 25 },
    potion_mp: { name: 'Napitak magije', kind: 'potion', stat: 'mp', amt: 60, price: 25 },
    potion_sp: { name: 'Napitak izdržljivosti', kind: 'potion', stat: 'sp', amt: 70, price: 20 },
    sweetroll: { name: 'Slatka kifla', kind: 'potion', stat: 'hp', amt: 15, price: 3 },
    mead: { name: 'Medovina Honningbrew', kind: 'potion', stat: 'sp', amt: 35, price: 8 },
    arrows: { name: 'Željezne strijele (15)', kind: 'arrows', qty: 15, price: 12 },
    tome_firebolt: { name: 'Knjiga čarolija: Vatrena strijela', kind: 'tome', spell: 'firebolt', price: 160 },
    tome_icespike: { name: 'Knjiga čarolija: Ledeni šiljak', kind: 'tome', spell: 'icespike', price: 320 },
    golden_claw: { name: 'Zlatna kandža', kind: 'quest' },
    dragonstone: { name: 'Zmajev kamen', kind: 'quest' },
    dragon_bone: { name: 'Zmajeva kost', kind: 'quest' },
};

const SPELLS = {
    flames: { name: 'Plamen', cost: 16, kind: 'stream', dmg: 28, col: 0xff8a2a },
    healing: { name: 'Iscjeljivanje', cost: 15, kind: 'heal', amt: 24, col: 0xffe28a },
    firebolt: { name: 'Vatrena strijela', cost: 24, kind: 'bolt', dmg: 36, speed: 520, tex: 'firebolt', col: 0xff6a1a },
    icespike: { name: 'Ledeni šiljak', cost: 30, kind: 'bolt', dmg: 44, speed: 620, tex: 'icespike', col: 0x9fe8ff, slow: true },
};

const SHOUTS = {
    fus: { name: 'Nezaustavljiva sila', words: ['FUS', 'RO', 'DAH'], key: 'Z', cd: [0, 6000, 8000, 10000] },
    wuld: { name: 'Vihorni sprint', words: ['WULD', 'NAH', 'KEST'], key: 'X', cd: [0, 4000] },
    joor: { name: 'Zmajosjek', words: ['JOOR', 'ZAH', 'FRUL'], key: 'C', cd: [0, 11000] },
};

// rad = hit radius in px; aggro = notice distance; scale = sprite scale
const FOES = {
    skeever: { name: 'Skever', tex: 'skeever', hp: 16, dmg: 4, speed: 115, range: 22, cd: 800, xp: 5, gold: [0, 3], aggro: 200, rad: 12, beast: true },
    wolf: { name: 'Vuk', tex: 'wolf', hp: 34, dmg: 7, speed: 140, range: 26, cd: 900, xp: 12, gold: [0, 0], aggro: 250, rad: 16, beast: true },
    sabre: { name: 'Sabljozubi mačak', tex: 'sabre', hp: 90, dmg: 15, speed: 155, range: 30, cd: 1000, xp: 40, gold: [0, 0], aggro: 270, rad: 20, beast: true },
    bandit: { name: 'Bandit', tex: 'bandit', hp: 55, dmg: 10, speed: 92, range: 30, cd: 1000, xp: 22, gold: [5, 30], aggro: 260, rad: 14, loot: 0.3 },
    archer: { name: 'Bandit strijelac', tex: 'archer', hp: 40, dmg: 9, speed: 88, range: 240, cd: 1700, xp: 22, gold: [5, 25], aggro: 320, rad: 14, ranged: 'arrow', loot: 0.25 },
    chief: { name: 'Haldor, vođa bandita', tex: 'chief', hp: 180, dmg: 18, speed: 95, range: 34, cd: 1100, xp: 90, gold: [80, 140], aggro: 280, rad: 17, boss: true, loot: 1 },
    arvel: { name: 'Arvel Brzi', tex: 'arvel', hp: 55, dmg: 9, speed: 125, range: 30, cd: 800, xp: 30, gold: [10, 30], aggro: 400, rad: 14 },
    spider: { name: 'Mrazni pauk', tex: 'spider', hp: 95, dmg: 12, speed: 100, range: 34, cd: 1100, xp: 40, gold: [0, 0], aggro: 260, rad: 22, spit: true, beast: true },
    draugr: { name: 'Draugr', tex: 'draugr', hp: 65, dmg: 12, speed: 78, range: 30, cd: 1100, xp: 28, gold: [3, 20], aggro: 230, rad: 14, sleep: true, loot: 0.2 },
    overlord: { name: 'Draugr Gospodar', tex: 'overlord', hp: 340, dmg: 22, speed: 88, range: 36, cd: 1200, xp: 220, gold: [100, 150], aggro: 400, rad: 18, boss: true, shout: true, scale: 1.2 },
    troll: { name: 'Ledeni trol', tex: 'troll', hp: 170, dmg: 20, speed: 108, range: 34, cd: 1200, xp: 75, gold: [0, 0], aggro: 260, rad: 20, regen: 4, beast: true },
    giant: { name: 'Div', tex: 'giant', hp: 400, dmg: 45, speed: 72, range: 52, cd: 2000, xp: 170, gold: [60, 110], aggro: 300, rad: 26, neutral: true },
    mirmulnir: { name: 'Mirmulnir', tex: 'dragon', hp: 720, dmg: 26, xp: 450, dragon: true, boss: true },
    alduin: { name: 'Alduin, Proždiratelj Svjetova', tex: 'alduin', hp: 1600, dmg: 36, xp: 1000, dragon: true, boss: true, needsRend: true },
};

// Quest stages. A marker is [mapId, npcId | {x, y} in tiles].
const QUESTS = {
    main: {
        name: 'Zmajorođeni', get: () => S.q, stages: {
            0: { d: 'Kažu da je zmaj spalio Helgen. Javi to kovaču Alvoru u Riverwoodu.', m: ['world', 'alvor'] },
            1: { d: 'Javi jarlu Balgruufu u Whiterunu da se vratio zmaj.', m: ['world', 'jarl'] },
            2: { d: 'Pronađi Zmajev kamen u drevnoj grobnici Bleak Falls Barrow, visoko iznad Riverwooda.', m: ['world', { x: 20, y: 29 }], mb: ['barrow', { x: 13, y: 47 }] },
            3: { d: 'Odnesi Zmajev kamen jarlu Balgruufu u Dragonsreach.', m: ['world', 'jarl'] },
            4: { d: 'Zmaj napada Zapadnu stražarnicu! Ubij ga.', m: ['world', { x: 78, y: 74 }] },
            5: { d: 'Upio si zmajevu dušu. Javi se jarlu Balgruufu.', m: ['world', 'jarl'] },
            6: { d: 'Sivobradi te zovu. Popni se 7000 stepenica do High Hrothgara.', m: ['world', 'arngeir'] },
            7: { d: 'Popni se na sam vrh Grla svijeta i pronađi Paarthurnaxa.', m: ['world', 'paarthurnax'] },
            8: { d: 'Alduin je stigao! Zmajosjekom ga obori na tlo i pobijedi ga.', m: ['world', { x: 64, y: 10 }] },
            9: { d: 'Alduin je poražen. Skyrim je slobodan.', done: true },
        },
    },
    claw: {
        name: 'Zlatna kandža', get: () => S.f.claw, stages: {
            1: { d: 'Lopovi su Lucanu ukrali Zlatnu kandžu i pobjegli u Bleak Falls Barrow. Vrati je.', m: ['world', { x: 20, y: 29 }], mb: ['barrow', { x: 45, y: 18 }] },
            2: { d: 'Imaš Zlatnu kandžu. Vrati je Lucanu u Riverwood.', m: ['world', 'lucan'] },
            3: { d: 'Lucan je ponovno dobio svoju kandžu.', done: true },
        },
    },
    bounty: {
        name: 'Ucjena: Haldor', get: () => S.f.bounty, stages: {
            1: { d: 'Ubij Haldora, vođu bandita u logoru Halted Stream sjeverno od Whiteruna.', m: ['world', { x: 82, y: 38 }] },
            2: { d: 'Haldor je mrtav. Javi se Irileth u Whiterunu po nagradu.', m: ['world', 'irileth'] },
            3: { d: 'Ucjena je isplaćena.', done: true },
        },
    },
};

// A conversation node: { t: text, c: [{ l: label, go() -> node | undefined }] }. No go = close.
const bye = { l: 'Doviđenja.' };
const shopChoice = (title, list) => ({ l: 'Pokaži mi što prodaješ.', go() { G.openShop(title, list); } });

const NPCS = {
    alvor: {
        name: 'Alvor', tex: 'npc_alvor', talk() {
            if (S.q === 0) return {
                t: 'Što? Zmaj je spalio Helgen?! Ysmira nam pomogla... Riverwood nema ni zidina ni straže. Jarl Balgruuf u Whiterunu mora poslati ljude. Hoćeš li mu to javiti?',
                c: [{ l: 'Idem odmah u Whiterun.', go() { G.setQ(1); G.give('potion_hp', 2); return { t: 'Hvala ti, putniče. Evo dva napitka za put. Whiterun je na istoku, preko rijeke. Ako ti treba bolji čelik, znaš gdje sam.', c: [shopChoice('Alvorova kovačnica', ['iron_sword', 'steel_sword', 'hunting_bow', 'arrows', 'iron_armor']), bye] }; } }, bye],
            };
            return {
                t: pick(['Kovač bez ugljena je samo čovjek s čekićem. Treba li ti što?', 'Moj čelik ne puca na studeni. Za razliku od onih carskih kopalja.', 'Sigrid kaže da sam previše na nakovnju. Ali netko mora kovati dok zmajevi lete.']),
                c: [shopChoice('Alvorova kovačnica', ['iron_sword', 'steel_sword', 'hunting_bow', 'arrows', 'iron_armor']), bye],
            };
        },
    },
    lucan: {
        name: 'Lucan Valerius', tex: 'npc_lucan', talk() {
            const shop = shopChoice('Trgovina Riverwood', ['potion_hp', 'potion_mp', 'potion_sp', 'sweetroll', 'mead', 'arrows']);
            if (G.has('golden_claw') && S.flags.clawUsed && S.f.claw < 3) return {
                t: 'Je li to... moja Zlatna kandža?! Talos te blagoslovio! Moja sestra neće vjerovati. Evo, uzmi ovo, zaslužio si svaki novčić.',
                c: [{ l: 'Izvoli.', go() { G.take('golden_claw'); G.addGold(300); S.f.claw = 3; G.questUpdate('claw', 'Zadatak dovršen'); return { t: 'Ako ikad trebaš nešto, za tebe su cijene najbolje u Riverwoodu.', c: [shop, bye] }; } }],
            };
            if (S.f.claw === 0) return {
                t: 'Dobro došao u trgovinu Riverwood. Oprosti na neredu, opljačkali su nas. Uzeli su samo jednu stvar: Zlatnu kandžu, ukras od čistog zlata. Pobjegli su gore u Bleak Falls Barrow.',
                c: [{ l: 'Vratit ću ti kandžu.', go() { S.f.claw = 1; G.questUpdate('claw', 'Zadatak započet'); return { t: 'Stvarno? Platit ću ti dobro, kunem se. Grobnica je iznad grada, cesta vodi na sjever kroz snijeg.', c: [shop, bye] }; } }, shop, bye],
            };
            return { t: pick(['Zlatna kandža i dalje nije na svom mjestu. Ili jest? Ne, nije.', 'Trgujem s cijelim Skyrimom. Pa, s Riverwoodom.', 'Camilla ponovno razmišlja o onom bardu. Bogovi, pomozite.']), c: [shop, bye] };
        },
    },
    sven: { name: 'Sven', tex: 'npc_sven', talk() { return { t: pick(['Ja sam Sven, bard. Želiš li čuti baladu o Ragnaru Crvenom? Ne? Nitko ne želi.', 'Camilla je najljepša žena u Riverwoodu. Faendal neka se drži svog luka.']), c: [bye] }; } },
    gerdur: { name: 'Gerdur', tex: 'npc_gerdur', talk() { return { t: pick(['Pilana radi od zore. Ako vidiš Hoda, reci mu da se vrati na posao.', 'Ako je zmaj stvarno nad Helgenom, Riverwood je sljedeći. Bogovi nas čuvali.']), c: [bye] }; } },
    camilla: { name: 'Camilla Valerius', tex: 'npc_camilla', talk() { return { t: pick(['Moj brat Lucan cijeli dan govori samo o toj kandži.', 'Sven i Faendal opet nešto smišljaju. Muškarci.']), c: [bye] }; } },

    jarl: {
        name: 'Jarl Balgruuf', tex: 'npc_jarl', talk() {
            if (S.q <= 1) return {
                t: 'Dakle, dolaziš iz Riverwooda s vijestima o zmaju. Ne ignoriram glasine o zmajevima. Moj dvorski čarobnjak Farengar traži drevnu ploču, Zmajev kamen, zakopanu u Bleak Falls Barrowu. Kaže da na njoj piše gdje zmajevi spavaju.',
                c: [{ l: 'Donijet ću ti Zmajev kamen.', go() { G.setQ(2); G.addGold(50); return { t: 'Dobro. Grobnica je iznad Riverwooda, iza snijega i bandita. Uzmi ovih pedeset zlatnika za opremu. I čuvaj se draugra.', c: [bye] }; } }, bye],
            };
            if (S.q === 2) return { t: G.has('dragonstone') ? 'Imaš kamen?' : 'Zmajev kamen je u Bleak Falls Barrowu, visoko iznad Riverwooda. Ne vraćaj se bez njega.', c: [bye] };
            if (S.q === 3) return {
                t: 'Zmajev kamen! Farengar će biti presretan. Zaslužio si nagradu.',
                c: [{
                    l: 'Izvoli.', go() {
                        G.take('dragonstone'); G.addGold(250);
                        return {
                            who: 'Irileth', t: 'Moj jarle! Stražar sa Zapadne stražarnice — zmaj! Napada kulu, upravo sada!',
                            c: [{ l: '(Jarlu) Idem tamo.', go() { G.setQ(4); return { t: 'Idi! Irileth i straža su već na putu. Kula je južno od grada, uz cestu. Neka te Shor čuva.', c: [bye] }; } }],
                        };
                    },
                }],
            };
            if (S.q === 4) return { t: 'Što čekaš? Zapadna stražarnica gori!', c: [bye] };
            if (S.q === 5) return {
                t: 'Vidjeli su to svi stražari: zmaj je pao i ti si mu upio dušu. Čuješ li onu grmljavinu s planine? Sivobradi te zovu — "Dovahkiin". Ti si Zmajorođeni!',
                c: [{
                    l: 'Što to znači?', go() {
                        G.setQ(6); G.addGold(500); S.flags.thane = true;
                        return { t: 'Znači da te čeka put do High Hrothgara, sedam tisuća stepenica gore na Grlu svijeta. Proglašavam te tanom Whiterun. Uzmi ovo zlato. A ako ti zmajeva kost išta znači, Adrianne iz Ratne djeve kuje čuda.', c: [bye] };
                    },
                }],
            };
            if (S.q < 9) return { t: 'Sivobradi te čekaju. Stepenice počinju sjeverno od ceste, između Riverwooda i Whiteruna.', c: [bye] };
            return { t: 'Alduin je mrtav! Skaldi će o tebi pjevati dok je Skyrima. Dragonsreach je uvijek tvoj dom, tane.', c: [bye] };
        },
    },
    irileth: {
        name: 'Irileth', tex: 'npc_irileth', talk() {
            if (S.f.bounty === 0) return {
                t: 'Ja sam jarlova kućna karla. Haldor i njegovi banditi napadaju karavane iz logora Halted Stream, sjeverno od grada. Jarl je raspisao ucjenu: dvjesto zlatnika.',
                c: [{ l: 'Pobrinut ću se za Haldora.', go() { S.f.bounty = 1; G.questUpdate('bounty', 'Zadatak započet'); } }, bye],
            };
            if (S.f.bounty === 2) return {
                t: 'Haldor je mrtav? Dobar posao. Evo tvoje nagrade, kako je obećano.',
                c: [{ l: 'Hvala.', go() { S.f.bounty = 3; G.addGold(200); G.questUpdate('bounty', 'Zadatak dovršen'); } }],
            };
            return { t: pick(['Ne vjerujem čarobnjacima. Pa ni Farengaru.', 'Ja služim jarlu. Ne gradu, ne Carstvu. Jarlu.']), c: [bye] };
        },
    },
    farengar: {
        name: 'Farengar Tajna-Vatra', tex: 'npc_farengar', talk() {
            const shop = shopChoice('Farengarove knjige', ['tome_firebolt', 'tome_icespike', 'potion_mp']);
            return { t: S.q < 3 ? 'Zmajev kamen bi mi otkrio gdje su zmajeve grobnice. Neki moji "partneri" plaćaju dobro za takve stvari. Zanimaju li te čarolije?' : 'Fascinantno, fascinantno. Ploča je neoštećena! A tebi treba nešto magije, rekao bih.', c: [shop, bye] };
        },
    },
    adrianne: {
        name: 'Adrianne Avenicci', tex: 'npc_adrianne', talk() {
            const list = ['steel_sword', 'orcish_sword', 'ebony_sword', 'steel_armor', 'elven_bow', 'arrows'];
            if (G.has('dragon_bone')) list.push('dragonbone_sword', 'dragonscale_armor');
            return { t: G.has('dragon_bone') ? 'Je li to... zmajeva kost? Daj mi je i iskovat ću ti nešto što Skyrim nije vidio stoljećima.' : 'Ratna djeva — najbolja kovačnica u Whiterunu. Moj otac drži trgovinu, ja držim nakovanj.', c: [shopChoice('Ratna djeva', list), bye] };
        },
    },
    arcadia: { name: 'Arcadia', tex: 'npc_arcadia', talk() { return { t: 'Arcadijin kotlić. Napici za svaku ranu, osim slomljenog srca.', c: [shopChoice('Arcadijin kotlić', ['potion_hp', 'potion_mp', 'potion_sp', 'sweetroll']), bye] }; } },
    nazeem: { name: 'Nazeem', tex: 'npc_nazeem', talk() { return { t: 'Dolaziš li često u Oblačni okrug? Ma što pitam. Naravno da ne dolaziš.', c: [bye] }; } },
    heimskr: { name: 'Heimskr', tex: 'npc_heimskr', talk() { return { t: 'Talos! Talos je pobijedio Carstvo i ujedinio Tamriel! A Thalmor bi htio da zaboravimo! Slušaj me, prijatelju — slušaj!', c: [bye] }; } },
    guard: {
        name: 'Stražar', tex: 'npc_guard', talk() {
            return {
                t: S.q >= 5 && S.q < 9 && Math.random() < 0.5 ? 'Zmajorođeni... Ja sam samo stražar, ali vjerujem u tebe.' : pick([
                    'Nekoć sam bio avanturist kao ti, a onda sam dobio strijelu u koljeno.',
                    'Ne radi probleme. Ili radi. Imamo mi ćelija.',
                    'Pazi se, putniče. Bandini su sve odvažniji.',
                    'Mislim da je netko ukrao moju slatku kiflu.',
                    'Moj rođak je vani i bori se. A što mi dobijemo? Stražu.',
                ]), c: [bye],
            };
        },
    },
    arngeir: {
        name: 'Arngeir', tex: 'npc_arngeir', talk() {
            if (S.q < 6) return { t: 'Ovo je High Hrothgar. Ovdje sivobradi meditiraju o Putu Glasa. Nemaš ovdje posla... još.', c: [bye] };
            if (S.q === 6) return {
                t: 'Zmajorođeni. Osjetili smo tvoj dolazak. Tvoj Glas zna samo jednu riječ — FUS. Pokazat ćemo ti još dvije: RO i DAH. I riječ vjetra, WULD, da ti noge budu brže od strijele.',
                c: [{
                    l: 'Spreman sam učiti.', go() {
                        G.learnShout('fus', 3); G.learnShout('wuld', 1); G.setQ(7);
                        return { t: 'Tvoj Glas je jak. Ali Alduin, Proždiratelj Svjetova, se vratio. Naš gospodar Paarthurnax živi na vrhu planine. Samo on te može naučiti kako ga pobijediti. Put gore čuvaju trolovi i led.', c: [bye] };
                    },
                }],
            };
            return { t: S.q < 9 ? 'Paarthurnax te čeka na vrhu. Neka ti Glas bude čist.' : 'Svijet i dalje postoji. Hvala tebi, Dovahkiin.', c: [bye] };
        },
    },
    paarthurnax: {
        name: 'Paarthurnax', tex: 'paarthurnax', talk() {
            if (S.q < 7) return { t: 'Drem yol lok. Mir s tobom, joor. Još nije vrijeme.', c: [bye] };
            if (S.q === 7) return {
                t: 'Drem yol lok. Pozdrav, Dovahkiin. Alduin se vraća i proždire duše mrtvih. Moj brat leti visoko — tvoj Glas ga ne može dosegnuti u zraku. Ali drevni nordijski heroji su skovali Zmajosjek: JOOR ZAH FRUL. Smrtnik, konačno, zatočenje.',
                c: [{
                    l: 'Nauči me Zmajosjek.', go() {
                        G.learnShout('joor', 1); G.setQ(8);
                        G.time.delayedCall(2500, () => G.summonAlduin());
                        return { t: 'Zah frul... Osjećaš li to? On dolazi. Zmajosjekom (C) ga obori na tlo pa udri. Krosis! Na noge, Dovahkiin!', c: [{ l: 'Neka dođe.' }] };
                    },
                }],
            };
            if (S.q === 8) return { t: 'Joor Zah Frul! Obori ga!', c: [bye] };
            return { t: 'Alduin je pao. Svijet će trajati još jedan dan... i još mnogo dana. Lok Vah Koor — neka nebo bude čisto.', c: [bye] };
        },
    },
    arvel: {
        name: 'Arvel Brzi', tex: 'arvel', talk() {
            if (G.alive('spider')) return { t: 'Skini me iz ove mreže prije nego se ta stvar vrati! Molim te!', c: [bye] };
            return {
                t: 'Ubio si ga! Sad me oslobodi, brzo. Znam tajnu Zlatne kandže — vrata u dnu grobnice! Pustit ću te s sobom, kunem se.',
                c: [{ l: '(Presijeci mrežu.)', go() { G.freeArvel(); return { t: 'Ha! Budalo! Zašto bih dijelio blago s tobom?!', c: [{ l: '...' }] }; } }],
            };
        },
    },
};
