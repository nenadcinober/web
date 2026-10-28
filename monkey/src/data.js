// The story: items, the battle-of-wits insults, every room's hotspots and the scripts behind
// them. Scripts are async functions that drive the engine through G.

const ITEMS = {
    dinari: { icon: 'dinari', name: N('dva dinara', 'dva dinara', 'dva dinara', 'dvama dinarima', 'dvama dinarima'),
        look: 'Dva dinara. Cijelo moje bogatstvo.' },
    krvavica: { icon: 'krvavica', name: N('krvavica', 'krvavicu', 'krvavice', 'krvavici', 'krvavicom'),
        look: 'Debela, masna krvavica. Lojzek ju nebu falil. Valjda.' },
    mak: { icon: 'mak', name: N('mak', 'mak', 'maka', 'maku', 'makom'),
        look: 'Šaka makovih glavica. Od toga se dobro spava, veli Regičina baka.' },
    krvavica_mak: { icon: 'krvavica_mak', name: N('krvavica s makom', 'krvavicu s makom', 'krvavice s makom', 'krvavici s makom', 'krvavicom s makom'),
        look: 'Krvavica nadjevena makom. Uspavanka za pse.' },
    pita: { icon: 'pita', name: N('bučnica', 'bučnicu', 'bučnice', 'bučnici', 'bučnicom'),
        look: 'Regičina bučnica. Još je topla. Ne smijem ju pojesti. Ne smijem ju pojesti...',
        use: async () => { await G.say('draz', 'Samo jedan griz...'); await G.say('draz', 'NE! Kušnja je kušnja, Draž!'); } },
    lopata: { icon: 'lopata', name: N('lopata', 'lopatu', 'lopate', 'lopati', 'lopatom'),
        look: 'Regičina lopata. Vratit ću ju. Jednog dana.' },
    karta: { icon: 'karta', name: N('karta', 'kartu', 'karte', 'karti', 'kartom'),
        look: async () => STORY.readMap(), use: async () => STORY.readMap() },
    lonac: { icon: 'lonac', name: N('lonac s dukatima', 'lonac s dukatima', 'lonca s dukatima', 'loncu s dukatima', 'loncem s dukatima'),
        look: 'Stari zemljani lonac pun dukata! Grunt je ipak nekaj vrijedil.',
        use: 'Bum ih brojal kasnije. Puno ih je, a ja znam brojiti samo do dvadeset.' },
    rupec: { icon: 'rupec', name: N('Jagin rupec', 'Jagin rupec', 'Jaginog rupca', 'Jaginom rupcu', 'Jaginim rupcem'),
        look: 'Jagin rupec, plavi s bijelim cvijećem. Dokaz da sem ju nadmudril!' },
    rakija: { icon: 'rakija', name: N('rakija', 'rakiju', 'rakije', 'rakiji', 'rakijom'),
        look: 'Cinoberova šljivovica. Od same pare mi suze idu.',
        use: 'Ne bum. Trebam ju za nekoga tko ima jaču glavu od mene.' },
    kokos: { icon: 'kokos', name: N('gumena kokoš', 'gumenu kokoš', 'gumene kokoši', 'gumenoj kokoši', 'gumenom kokoši'),
        look: 'Gumena kokoš s koloturom na sredini. Kaj god to bilo.',
        use: async () => { G.sfx('gulp'); await G.say('draz', 'Stisnem ju. „Kvi-i-ik.“ Pa kaj bi drugo delala.'); } },
    gruntovnica: { icon: 'gruntovnica', name: N('gruntovnica', 'gruntovnicu', 'gruntovnice', 'gruntovnici', 'gruntovnicom'),
        look: 'Gruntovnica! Knjiga v kojoj piše čiji je koji grunt. I ada je naša!' },
};

const COMBOS = {
    'krvavica+mak': async () => {
        G.removeItem('krvavica'); G.removeItem('mak');
        await G.addItem('krvavica_mak');
        await G.say('draz', 'Nadjenem krvavicu makom. Sad je to prava uspavanka.');
    },
    'kokos+lopata': 'Lopata s kokoši. Najgori alat v Podravini.',
    'kokos+rakija': 'Kokoš ne pije. Pogotovo gumena.',
    'pita+mak': 'Bučnica s makom? Regica bi me ubila.',
    'krvavica+pita': 'Krvavica i bučnica. Ručak i desert. Ali nijedno nije moje.',
};

// The battle of wits. i: how Đuka (and Draž) say it, j: Jaga's version, d: the Direktor's.
// Every version fits exactly one comeback, r.
const INSULTS = [
    { i: 'Oreš kak da ti krava vodi plug!',
      j: 'Tvoja krava bi bolje orala bez tebe!',
      d: 'Vaša poljoprivreda je ispod svakog plana! I krava bi bolje ispunila normu!',
      r: 'Bar mene krava sluša — tebe ni pas neće.' },
    { i: 'Tvoja hiža je tak kriva da ti kokoši spavaju na zidu!',
      j: 'Kokoši ti bježe iz hiže od sramote!',
      d: 'Vaša hiža ne odgovara nijednom propisu! Ni kokošjem!',
      r: 'Bar imam hižu — ti spavaš v štaglju s kokošima.' },
    { i: 'Smrdiš kak gnojnica v kolovozu!',
      j: 'Ni gnojnica ne smrdi kak ti po nedjeljnoj misi!',
      d: 'Cijeli ovaj kraj smrdi na gnoj, a vi najviše!',
      r: 'To je miris poštenoga rada — tebi nepoznat.' },
    { i: 'Imaš pameti kak makovo zrno!',
      j: 'Makovo zrno ima više pameti od tebe, a i ljepše je!',
      d: 'Vaš intelektualni kapacitet je, statistički, ispod makovog zrna!',
      r: 'Bar mak cvate — tvoja pamet je uvenula pred sto let.' },
    { i: 'Pjevaš kak mačka kojoj su stali na rep!',
      j: 'Kad ti zapjevaš, svim mačkama v selu dlaka se diže!',
      d: 'Vaše narodno pjevanje zvuči kao mačka u mlinu za meso!',
      r: 'To nije bil ja, nego mačka — čula je tebe kak pjevaš.' },
    { i: 'Dok ti dojdeš do birtije, več ju zatvore!',
      j: 'Tak si spor da te puž prestigne do birtije!',
      d: 'Vaša produktivnost je takva da biste zakasnili i u birtiju!',
      r: 'Bar ja v birtiju dojdem na svojim nogama — tebe iz nje nose.' },
    { i: 'Kad plešeš, cijeli Gruntovec misli da je potres!',
      j: 'Kad ti plešeš, zvoni se na uzbunu!',
      d: 'Vaš ples je ugrozio statiku cijelog kotara!',
      r: 'A kad ti misliš, cijelo selo ide na pauzu.' },
    { i: 'Tak si ružen da te i strašilo plaši!',
      j: 'Strašilo je pobjeglo iz polja kad te vidlo!',
      d: 'Vi biste bili odlično strašilo — da i vrane nemaju standarde!',
      r: 'Strašilo me ne plaši — samo me pozdravi, kak i tvoja rodbina.' },
];
const START_INSULTS = [0, 2];
const WEAK_INSULTS = ['Ti si... ovaj... ružen!', 'Kaj? Kaj ti meni?!'];
const WEAK_RETORTS = ['Je? A ti si još gori!', 'Ovaj... ništ. Nemam ništ.'];

const DUEL_OPPONENTS = {
    duka: { name: 'Đuka', key: 'i', trades: true, skill: 0.6,
        mock: ['Ha! To ti je zafrkancija? Moja baba bolje zafrkava.', 'Je, i? Pa kaj?'],
        fumble: ['Ovaj... e pa... i ti si!', 'Hm. Na to nemam odgovora. Još.', 'Čekaj, to sem znal... zaboravil sem.'],
        laugh: ['Hahaha! Ni to ne znaš!', 'Ha! Nauči kaj, pa dojdi.'], hurt: [] },
    jaga: { name: 'Jaga', key: 'j', trades: false, skill: 1,
        mock: [], fumble: [],
        laugh: ['Ha! Balavac!', 'Hihihi! Idi doma k mami!', 'Odgovor ko od Đuke. Slabo, slabo.'],
        hurt: ['Hm! Dobro. Imaš sreće.', 'Grrr. Nemoj se hvaliti.', 'Gle ga, jezičavoga!'] },
    direktor: { name: 'Direktor', key: 'd', trades: false, skill: 1,
        mock: [], fumble: [],
        laugh: ['Ha! Seljačka logika!', 'Neargumentirano, druže!', 'To ću zapisati u zapisnik. Kao vaš poraz.'],
        hurt: ['Ovo... ovo nije bilo u planu!', 'Protestiram! Samo ne znam protiv čega.', 'Moram konzultirati komitet!'] },
};

const STORY = {
    async intro() {
        await G.card('Podravina, sedamdesete.\n\nSelo Gruntovec, negdje između Drave i Koprivnice.', 3200);
        await G.wait(300);
        await G.talk([
            ['draz', 'Zovem se Draž, i hoću postati pravi Gruntovčan!'],
            ['regica', 'Draž, dečec moj, ti si se tu rodil. Pa več jesi Gruntovčan.'],
            ['draz', 'Ne, mislim PRAVI Gruntovčan. Onaj koji ima brke, grunt i poštovanje v birtiji.'],
            ['regica', 'Brke ti ne morem dati. Ali idi v birtiju kod Cinobera.'],
            ['regica', 'Tam sede najvažniji ljudi v selu. Dudek bu ti rekel kaj treba.'],
        ]);
    },

    async readMap() {
        await G.say('draz', 'Na karti piše:');
        await G.say('draz', '„Od strašila hodaj prema Dravi, dok ne najdeš glavu koja ne govori. Kopaj pod bradom.“');
        await G.say('draz', '„Potpisano: Stari Gruntovec.“');
        if (!G.flag('karta_procitana')) { G.set('karta_procitana'); await G.say('draz', 'Glava koja ne govori... S bradom? Kaj to more biti?'); }
    },

    missing() {
        const m = [];
        if (!G.flag('dokaz_jaga')) m.push('nadmudriti Jagu');
        if (!G.flag('dokaz_pita')) m.push('donesti Regičinu bučnicu');
        if (!G.flag('dokaz_lonac')) m.push('najti lonac staroga Gruntovca');
        return m;
    },

    async proofs() {
        let any = false;
        if (G.has('rupec') && !G.flag('dokaz_jaga')) {
            any = true;
            await G.talk([
                ['draz', 'Evo Jagin rupec. Nadmudril sem ju v zafrkanciji!'],
                ['joza', 'Jagu?! Ne vjerujem... Al to je njezin rupec, s cvijećem. Svaka čast, mali.'],
            ]);
            G.set('dokaz_jaga');
        }
        if (G.has('pita') && !G.flag('dokaz_pita')) {
            any = true;
            await G.talk([
                ['draz', 'Evo Regičina bučnica! Ukral sem ju ispod Garove njuške.'],
                ['dudek', 'Još je topla! Joža, nož!'],
            ]);
            G.removeItem('pita');
            G.set('dokaz_pita');
            await G.say('joza', 'Mmm. Kušnja je bila za tebe, a nagrada za nas.');
        }
        if (G.has('lonac') && !G.flag('dokaz_lonac')) {
            any = true;
            await G.talk([
                ['draz', 'Iskopal sem lonac staroga Gruntovca!'],
                ['dudek', 'Dukati! Pravi pravcati! Zadrži ih, Draž. Trebat bu Gruntovcu kad ovo prođe.'],
            ]);
            G.set('dokaz_lonac');
        }
        if (!any) { await G.say('dudek', 'Kaj mi to kažeš? To nije dokaz ni za kaj.'); return; }
        const m = STORY.missing();
        if (m.length) {
            await G.say('dudek', 'Dobro je, Draž. Još moraš ' + m.join(' i ') + '.');
            return;
        }
        Sound.music('slavlje');
        await G.talk([
            ['dudek', 'Draž, sine Gruntovca!'],
            ['dudek', 'Nadmudril si Jagu, prevaril Gara i našel grunt staroga Gruntovca.'],
            ['dudek', 'Od danas si PRAVI Gruntovčan!'],
            ['joza', 'Živio Draž!'],
        ]);
        G.setBase('lojzek', 'sit');
        await G.say('lojzek', 'Kaj?! Ko je umrl?');
        await G.say('joza', 'Nitko, Lojzek. Spavaj.');
        G.setBase('lojzek', 'sleep');
        G.sfx('snore');
        await G.talk([
            ['lojzek', 'Hrrr...'],
            ['dudek', 'A sad idi k Pepeku na Dravu. Vrati nam gruntovnicu prije neg Direktor iskopa adu!'],
        ]);
        G.set('gruntovcan');
        Sound.music('birtija');
    },

    async buyRakija() {
        if (G.has('rakija')) { await G.say('cinober', 'Več imaš rakiju. Kaj, hoćeš se napiti ko Lojzek?'); return; }
        if (!G.has('dinari')) {
            await G.say('cinober', 'Dva dinara, mladi. Cinober ne dela na veresiju. Više.');
            await G.say('joza', 'Od kad mu je Lojzek ostal dužan za cijeli tisuću devetsto šezdeseti.');
            return;
        }
        await G.say('cinober', 'Dva dinara.');
        await G.say('draz', 'Evo.');
        G.removeItem('dinari');
        G.sfx('coin');
        await G.addItem('rakija');
        await G.say('cinober', 'Na. Najbolja šljivovica s ove strane Drave. I s one.');
    },

    async ferry(to) {
        await G.card(to === 'ada' ? 'Pepek vozi Draža preko Drave...' : 'Pepek vozi Draža natrag na obalu...', 1800, true);
        await G.enterRoom(to, to === 'ada' ? 'start' : 'ada');
    },

    async guard() {
        G.setBase('garo', 'bark');
        G.sfx('bark');
        await G.say('garo', 'VAU! VAU! GRRRRR!');
        G.setBase('garo', 'growl');
        await G.say('draz', 'Dobro, dobro! Idem!');
        await G.walkPlayer(G.player.x + 120, 500);
        G.setBase('garo', 'sit');
    },

    async finale() {
        await G.talk([
            ['direktor', 'Ne... To nije moguće... Seljak me nadmudril!'],
            ['direktor', 'Dobro! Ako ne more na lijepo, bude na bager!'],
        ]);
        const d = G.actor('direktor');
        await G.walkSprite(d, 800, 450, 230);
        d.setVisible(false);
        G.sfx('engine');
        await G.say('direktor', 'Kopaj, bageru! Za plan! Za Kombinat!', { ms: 1800 });
        // it rolls backwards off the edge of the ada into the Drava
        const b = G.prop('bager');
        await G.tween({ targets: b, x: b.x + 30, y: b.y - 50, scale: 0.85, duration: 1000, ease: 'Sine.in' });
        G.sfx('engine');
        b.setDepth(200);
        await G.tween({ targets: b, x: b.x + 40, y: b.y - 60, scale: 0.7, angle: -12, duration: 800 });
        G.sfx('splash');
        await G.tween({ targets: b, y: b.y + 90, angle: -20, alpha: 0, duration: 1800, ease: 'Quad.in' });
        for (let i = 0; i < 6; i++) {
            const m = G.add.image(b.x - 60 + Math.random() * 120, 340, 'pr_mjehur').setScale(0.4 + Math.random() * 0.5).setDepth(210);
            G.roomObjs.push(m);
            G.tweens.add({ targets: m, y: 300, alpha: 0, duration: 900 + Math.random() * 600, delay: i * 180 });
        }
        await G.wait(1200);
        await G.talk([
            ['pepek', 'Bager je v Dravi. Ne bu ti on više kopal.'],
            ['direktor', 'Upomoć! Ne znam plivati!'],
            ['direktor', '...A, plitko je. Idem ja nazad v Zagreb. Pješke.'],
            ['pepek', 'Drava je plitka za one koji ne znaju, a duboka za one koji kopaju.'],
            ['draz', 'Pepek, to si sad izmislil.'],
            ['pepek', 'Je. Lijepo zvuči, ne?'],
        ]);
        G.set('direktor_otisel');
        await G.walkPlayer(300, 440);
        G.player.setFlipX(false);
        await G.pose('draz', 'reach', 500);
        await G.addItem('gruntovnica');
        await G.say('draz', 'Gruntovnica! Ada je naša, i Gruntovec je spašen!');
        await G.card('I tak se Draž vratil v Gruntovec, s gruntovnicom pod rukom...', 2600, true);
        G.set('kraj');
        try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* storage blocked */ }
        await G.enterRoom('birtija', 'kraj');
    },

    async celebration() {
        Sound.music('slavlje');
        await G.talk([
            ['dudek', 'Draž! Pravi Gruntovčan i spasitelj Gruntovca!'],
            ['regica', 'I lopov moje bučnice.'],
            ['draz', 'To je bila kušnja!'],
            ['regica', 'Je, je. Spekla sem drugu. Za tebe.'],
            ['jaga', 'Dobro zafrkava, mali. Skoro kak ja.'],
            ['duka', 'Ja sem ga naučil. Mogu sad iti spavati?'],
            ['cinober', 'Rakija za sve! Na račun... Druga Direktora!'],
            ['lojzek', 'Kaj? Rakija? Ja sem budan!'],
            ['joza', 'Živio Draž, pravi Gruntovčan!'],
        ]);
        await G.wait(600);
        await G.fade(1, 900);
        G.ended = true;
        G.scene.start('End');
    },
};

const ROOMS = {
    birtija: {
        name: 'Birtija kod Cinobera', music: 'birtija',
        scale: [400, 0.8, 540, 1.0],
        walk: [[40, 440], [1000, 420], [1020, 542], [6, 542]],
        entries: { start: [880, 470, 'left'], selo: [950, 452, 'left'], kraj: [520, 500, 'right'] },
        props: [
            { id: 'sank', key: 'pr_sank', x: 200, y: 430, depth: 430 },
            { id: 'stol', key: 'pr_stol', x: 740, y: 470, depth: 470 },
            { id: 'tanjur', key: 'pr_tanjur', x: 842, y: 392, depth: 480 },
            { id: 'krvavica', key: 'pr_krvavica', x: 842, y: 386, depth: 481, visible: () => !G.flag('krvavica_uzeta') },
            { id: 'kokos', key: 'pr_kokos', x: 616, y: 180, depth: 10, visible: () => !G.flag('kokos_uzeta') },
        ],
        actors: [
            { id: 'cinober', x: 200, y: 400, face: 'right', scale: 0.82, depth: 400 },
            { id: 'dudek', x: 566, y: 452, base: 'sit', face: 'right', scale: 0.86, headK: 0.82 },
            { id: 'joza', x: 742, y: 420, base: 'sit', face: 'left', scale: 0.8, depth: 410, headK: 0.82 },
            { id: 'lojzek', x: 912, y: 452, base: 'sleep', face: 'left', scale: 0.86, headK: 0.7,
                frame: () => G.flag('kraj') ? 'sit' : 'sleep', talkFrames: ['sleep'] },
            { id: 'regica', x: 330, y: 486, face: 'right', visible: () => G.flag('kraj') },
            { id: 'jaga', x: 420, y: 520, face: 'right', visible: () => G.flag('kraj') },
            { id: 'duka', x: 700, y: 520, face: 'left', visible: () => G.flag('kraj') },
            { id: 'pepek', x: 820, y: 500, face: 'left', visible: () => G.flag('kraj') },
        ],
        enter: async () => {
            if (G.flag('kraj')) { await STORY.celebration(); return; }
            if (!G.flag('birtija_bil')) {
                G.set('birtija_bil');
                await G.say('joza', 'Gle, mladi Draž! Dudek, imaš posjetu.');
            }
        },
        hot: [
            { id: 'vrata', name: N('vrata', 'vrata', 'vrata', 'vratima', 'vratima'), rect: [926, 120, 98, 290], walk: [962, 452],
                exit: { room: 'selo', entry: 'birtija' } },
            { name: N('police s bocama', 'police s bocama', 'polica s bocama', 'policama s bocama', 'policama s bocama'), rect: [50, 100, 300, 180], walk: [300, 450],
                look: 'Rakija, vino, gemišt... i jedna boca za koju nitko ne zna kaj je unutra.', take: 'Cinober bi me ubil. Dvaput.' },
            { name: N('demižon', 'demižon', 'demižona', 'demižonu', 'demižonom'), rect: [346, 206, 70, 96], walk: [380, 450],
                look: 'Cinoberova šljivovica. Kažu da od jedne čašice vidiš Mađarsku.', take: 'Pretežak je. A i Cinober gleda.' },
            { name: N('prozor', 'prozor', 'prozora', 'prozoru', 'prozorom'), rect: [416, 100, 180, 150], walk: [505, 450],
                look: 'Kroz prozor se vidi orah, a ispod oraha Đuka. Ništ se ne miče.', open: 'Bolje ne. Cinober veli da propuh ubija više ljudi neg rakija.' },
            { name: N('tamburica', 'tamburicu', 'tamburice', 'tamburici', 'tamburicom'), rect: [650, 100, 60, 140], walk: [680, 450],
                look: 'Tamburica. Na njoj se svira kad se slavi. Zadnji put se slavilo kad je Lojzek zaspal.', take: 'Ne znam svirati. Još.', use: 'Ne znam svirati. Još.' },
            { name: N('slika Drave', 'sliku Drave', 'slike Drave', 'slici Drave', 'slikom Drave'), rect: [760, 120, 110, 80], walk: [815, 450],
                look: 'Drava, naslikana kak se slika v Hlebinama. Samo su vrbe malo prevelike.' },
            { name: N('lampa', 'lampu', 'lampe', 'lampi', 'lampom'), rect: [478, 44, 70, 70], walk: [512, 450], look: 'Lampa. Svijetli ko da štedi struju za Kombinat.' },
            { name: N('šank', 'šank', 'šanka', 'šanku', 'šankom'), rect: [8, 280, 350, 150], walk: [250, 450],
                look: 'Šank. Najvažnije mjesto v Gruntovcu, odmah iza crkve. Ili prije crkve, ovisi koga pitaš.' },
            { name: N('stol', 'stol', 'stola', 'stolu', 'stolom'), rect: [590, 360, 300, 110],
                look: 'Stol najvažnijih ljudi v Gruntovcu. Ima i stolnjak, samo za nedjelju.' },
            { prop: 'kokos', name: N('gumena kokoš', 'gumenu kokoš', 'gumene kokoši', 'gumenoj kokoši', 'gumenom kokoši'), walk: [616, 450],
                look: 'Gumena kokoš s koloturom na sredini. Kaj god to bilo.',
                take: async () => {
                    await G.pose('draz', 'up', 400);
                    G.set('kokos_uzeta');
                    await G.addItem('kokos');
                    await G.say('cinober', 'Uzmi ju, uzmi. Samo da ju ne gledam više.');
                } },
            { prop: 'krvavica', name: N('krvavica', 'krvavicu', 'krvavice', 'krvavici', 'krvavicom'), walk: [800, 462], face: 'right',
                look: 'Lojzekova krvavica. Leži kraj njega na tanjuru, a on spi.',
                take: async () => {
                    await G.pose('draz', 'reach', 400);
                    G.set('krvavica_uzeta');
                    await G.addItem('krvavica');
                    await G.say('draz', 'Lojzek spi. Nebu ni primijetil.');
                    await G.say('lojzek', 'Hrrr... krvavica... hrrr...');
                    await G.say('draz', '...Mislim.');
                } },
            { actor: 'cinober', name: N('Cinober', 'Cinobera', 'Cinobera', 'Cinoberu', 'Cinoberom'), walk: [300, 452], face: 'left', hk: 0.7,
                look: 'Cinober, birtaš. Ima brke za tri čovjeka i trbuh za četiri.',
                talk: async () => {
                    await G.say('cinober', 'Kaj bu, mladi?');
                    await G.dialog(() => [
                        { t: 'Daj mi rakije.', run: async () => { await STORY.buyRakija(); } },
                        { t: 'Kaj je ona kokoš na zidu?', cond: () => !G.flag('kokos_uzeta') && !G.flag('kokos_pitao'), run: async () => {
                            G.set('kokos_pitao');
                            await G.talk([
                                ['cinober', 'Neki putnik ju je ostavil umjesto plaće. Gumena kokoš s koloturom.'],
                                ['cinober', 'Veli da se s njom more preletjeti preko rijeke.'],
                                ['draz', 'Stvarno?'],
                                ['cinober', 'Ne. Uzmi ju ako hoćeš, samo da ju ne gledam.'],
                            ]);
                        } },
                        { t: 'Kaj ima novoga v selu?', run: async () => {
                            await G.say('cinober', 'Drug Direktor je ukral gruntovnicu, Lojzek spi drugi dan, a Đuka se još nije makel ispod oraha.');
                            await G.say('cinober', 'Znači, ništ novoga.');
                        } },
                        { t: 'Zakaj se birtija zove „Kod Cinobera“?', run: async () => {
                            await G.say('cinober', 'Kak bi se zvala? „Kod Mađara“?');
                        } },
                        { t: 'Ništ, hvala.', run: async () => 'end' },
                    ].map(o => ({ ...o, run: o.run && (async () => (await o.run()) || 'more') })));
                },
                give: { dinari: async () => STORY.buyRakija(), '*': async () => G.say('cinober', 'Kaj ću ja s tim? Ja primam samo dinare.') } },
            { actor: 'dudek', name: N('Dudek', 'Dudeka', 'Dudeka', 'Dudeku', 'Dudekom'), walk: [500, 470], face: 'right', hk: 0.8,
                look: 'Dudek. Najvažniji čovjek v Gruntovcu. To mu je rekla Regica, a Regica ne laže.',
                talk: async () => {
                    await G.say('dudek', G.flag('gruntovcan') ? 'Kaj još tu delaš? Gruntovnica je na adi!' : 'Gle, Draž. Kaj bu?');
                    await G.dialog(() => [
                        { t: 'Hoću postati pravi Gruntovčan!', cond: () => !G.flag('elders_met'), run: async () => {
                            await G.talk([
                                ['joza', 'Ha! Pravi Gruntovčan! Čuješ ga, Dudek?'],
                                ['dudek', 'Čujem. I baš v pravo vrijeme je došel.'],
                                ['dudek', 'Drug Direktor iz grada je ukral gruntovnicu. Knjigu v kojoj piše čiji je koji grunt.'],
                                ['dudek', 'Odnesel ju je na adu. Veli da ada nije ničija, i da bu tam kopal šljunak za svoj Kombinat.'],
                                ['joza', 'A kad iskopa adu, Drava dojde ravno v Gruntovec. Pa bumo svi plivali do birtije.'],
                                ['dudek', 'Na adu ide samo Pepekova skela. A Pepek vozi samo prave Gruntovčane.'],
                                ['draz', 'Pa kak se postane pravi Gruntovčan?'],
                                ['dudek', 'Tri kušnje, Draž. Kak su ih delali naši stari.'],
                            ]);
                            await STORY.trials();
                            await G.say('joza', 'I donesi dokaze! Nebumo ti vjerovali na riječ. Ti si mladi.');
                            G.set('elders_met');
                        } },
                        { t: 'Koje su ono tri kušnje?', cond: () => G.flag('elders_met') && !G.flag('gruntovcan'), run: async () => STORY.trials() },
                        { t: 'Gdje bum našel Jagu?', cond: () => G.flag('elders_met') && !G.flag('dokaz_jaga'), run: async () => {
                            await G.talk([
                                ['dudek', 'Na Dravi. Pere rublje, kak svaki dan od kad pamtim.'],
                                ['joza', 'Pazi se. Jezik joj je oštriji od kose.'],
                                ['dudek', 'Vježbaj prvo s Đukom. On ispod oraha ionak ništ ne dela.'],
                            ]);
                        } },
                        { t: 'Kak bum dobil Regičinu bučnicu?', cond: () => G.flag('elders_met') && !G.flag('dokaz_pita'), run: async () => {
                            await G.talk([
                                ['dudek', 'Hladi se na prozoru. Ali dvorište čuva Garo.'],
                                ['joza', 'Taj pas je gori od komisije. A i ima više zubi.'],
                            ]);
                        } },
                        { t: 'Gdje je zakopani lonac?', cond: () => G.flag('elders_met') && !G.flag('dokaz_lonac'), run: async () => {
                            await G.talk([
                                ['dudek', 'Da znam, ne bi sedel tu.'],
                                ['joza', 'Stari Gruntovec je bil pobožen čovjek. Kartu je skril negdje gdje ju nitko nebi diral.'],
                                ['dudek', 'Kod svetaca, rekel bi ja.'],
                            ]);
                        } },
                        { t: 'Imam dokaze!', cond: () => G.flag('elders_met') && !G.flag('gruntovcan') && ((G.has('rupec') && !G.flag('dokaz_jaga')) || (G.has('pita') && !G.flag('dokaz_pita')) || (G.has('lonac') && !G.flag('dokaz_lonac'))),
                            run: async () => { await STORY.proofs(); return 'end'; } },
                        { t: 'Kaj je s Lojzekom?', run: async () => {
                            await G.talk([
                                ['joza', 'Spi od jučer. Pil je Cinoberovu šljivovicu.'],
                                ['dudek', 'Probudi se samo za krvavicu. Ili za sprovod.'],
                            ]);
                        } },
                        { t: 'Kaj sad?', cond: () => G.flag('gruntovcan'), run: async () => {
                            await G.say('dudek', 'Idi k Pepeku na Dravu. Pepek ne vozi na suho grlo, pa mu nosi kaj za popiti.');
                        } },
                        { t: 'Moram iti.', run: async () => { await G.say('dudek', 'Idi, idi.'); return 'end'; } },
                    ].map(o => ({ ...o, run: o.run && (async () => (await o.run()) || 'more') })));
                },
                give: { '*': async () => { if (G.flag('elders_met')) await STORY.proofs(); else await G.say('dudek', 'Kaj mi to daješ? Reci prvo kaj hoćeš.'); } } },
            { actor: 'joza', name: N('Joža', 'Jožu', 'Jože', 'Joži', 'Jožom'), walk: [742, 470], face: 'right', hk: 0.7,
                look: 'Joža. Smije se svemu kaj Dudek kaže. Zato su prijatelji.',
                talk: async () => {
                    const l = ['Pitaj Dudeka. On je tu glavni. Ja sem samo pametniji.',
                        'Ja sem tu samo da se smijem. Ha. Ha.',
                        'Znaš kaj je najbolje v Gruntovcu? Da je daleko od Zagreba.'];
                    await G.say('joza', l[(G.st.flags.jozaN = ((G.st.flags.jozaN || 0) + 1)) % l.length]);
                },
                give: { '*': async () => G.say('joza', 'Daj to Dudeku. On zna kaj s tim.') } },
            { actor: 'lojzek', name: N('Lojzek', 'Lojzeka', 'Lojzeka', 'Lojzeku', 'Lojzekom'), walk: [960, 470], face: 'left', hk: 0.6,
                look: 'Stari Lojzek. Spi s glavom na stolu. Crveni nos mu svijetli ko lampa.',
                talk: async () => { G.sfx('snore'); await G.say('lojzek', 'Hrrr... gruntovnica... hrrr... krvavica... hrrr...'); },
                pull: 'Neću ga buditi. Mamurni Lojzek je gori od Gara.',
                push: 'Neću ga buditi. Mamurni Lojzek je gori od Gara.',
                give: { krvavica: 'Vratil bi mu ju, ali spi. A meni treba.', rakija: 'To bi ga ubilo. Ili probudilo. Ne znam kaj je gore.', '*': 'Spi. Ne bi primijetil ni da mu dam kravu.' } },
        ],
    },

    selo: {
        name: 'Gruntovec', music: 'selo',
        scale: [400, 0.6, 540, 0.95],
        walk: [[0, 412], [1024, 406], [1024, 542], [0, 542]],
        entries: { start: [540, 470, 'left'], birtija: [852, 424, 'left'], kapelica: [155, 424, 'right'], dvoriste: [30, 470, 'right'], polje: [995, 480, 'left'] },
        actors: [
            { id: 'regica', x: 404, y: 440, face: 'right' },
            { id: 'duka', x: 664, y: 424, base: 'sit', face: 'left', headK: 0.82 },
        ],
        hot: [
            { name: N('kapelica', 'kapelicu', 'kapelice', 'kapelici', 'kapelicom'), rect: [40, 10, 230, 280], walk: [155, 424],
                look: 'Kapelica svetoga Florijana. Čuva selo od požara. Od Direktora baš i ne.' },
            { name: N('vrata kapelice', 'vrata kapelice', 'vrata kapelice', 'vratima kapelice', 'vratima kapelice'), rect: [118, 288, 74, 96], walk: [155, 424],
                exit: { room: 'kapelica', entry: 'start' } },
            { name: N('birtija', 'birtiju', 'birtije', 'birtiji', 'birtijom'), rect: [700, 150, 320, 240], walk: [852, 424],
                look: 'Birtija kod Cinobera. Srce Gruntovca. I jetra.' },
            { name: N('vrata birtije', 'vrata birtije', 'vrata birtije', 'vratima birtije', 'vratima birtije'), rect: [814, 300, 76, 92], walk: [852, 424],
                exit: { room: 'birtija', entry: 'selo' } },
            { name: N('đeram', 'đeram', 'đerma', 'đermu', 'đermom'), rect: [300, 190, 310, 220], walk: [330, 450], face: 'right',
                look: 'Đeram. Najstarija mašina v Gruntovcu. I jedina koja radi.',
                use: 'Izvučem kantu vode... Voda. Kak neobično.', pull: 'Izvučem kantu vode... Voda. Kak neobično.', push: 'Gurnem motku. Gore-dolje. Zabavno ko nedjeljna misa.',
                take: 'Cijeli đeram? Kam bi ga stavil?' },
            { name: N('orah', 'orah', 'oraha', 'orahu', 'orahom'), rect: [520, 40, 240, 300], walk: [600, 440],
                look: 'Stari orah. Đuka veli da mu daje hlad, a orah veli da mu Đuka daje društvo.', take: 'Orahi još nisu zreli.' },
            { name: N('suncokreti', 'suncokrete', 'suncokreta', 'suncokretima', 'suncokretima'), rect: [252, 296, 64, 96], walk: [280, 430],
                look: 'Suncokreti gledaju v sunce. Kak i Đuka, samo oni rade nekaj korisno.', take: 'Nisu moji.' },
            { name: N('Regičino dvorište', 'Regičino dvorište', 'Regičinog dvorišta', 'Regičinom dvorištu', 'Regičinim dvorištem'), rect: [0, 330, 40, 214], walk: [6, 470],
                exit: { room: 'dvoriste', entry: 'start' } },
            { name: N('polje', 'polje', 'polja', 'polju', 'poljem'), rect: [984, 380, 40, 164], walk: [1020, 480],
                exit: { room: 'polje', entry: 'start' } },
            { actor: 'regica', name: N('Regica', 'Regicu', 'Regice', 'Regici', 'Regicom'), walk: [500, 452], face: 'left',
                look: 'Regica, Dudekova žena. Peče najbolju bučnicu v Podravini, i to zna.',
                talk: async () => {
                    await G.say('regica', 'Kaj je, Draž?');
                    await G.dialog(() => [
                        { t: 'Kaj da radim?', cond: () => !G.flag('elders_met'), run: async () => { await G.say('regica', 'Idi v birtiju i pitaj Dudeka. On sedi tam od jutra. Važen je.'); } },
                        { t: 'Mogu dobiti tvoju bučnicu?', cond: () => G.flag('elders_met') && !G.flag('pita_uzeta'), run: async () => {
                            await G.say('regica', 'Bučnica je za nedjelju! I za Dudeka. Ni ne misli na nju.');
                            await G.say('draz', 'Kasno. Več mislim.');
                        } },
                        { t: 'Kaj je s tvojim psom?', cond: () => G.flag('elders_met') && !G.flag('garo_spi'), run: async () => {
                            await G.say('regica', 'Garo? Dobar pas. Samo ne voli nikoga. Osim krvavica.');
                            await G.say('regica', 'Al nije glup. Kaj pojede, to ga ne uspava. Samo ga razveseli.');
                        } },
                        { t: 'Kak zaspati kad ne moreš zaspati?', cond: () => G.flag('elders_met') && !G.flag('garo_spi'), run: async () => {
                            await G.say('regica', 'Moja baka je kuhala čaj od maka. Spavaš ko top.');
                            await G.say('regica', 'Mak raste v polju, kraj puta. Al nemoj to nikom reći.');
                        } },
                        { t: 'Znaš kaj o zakopanom loncu?', cond: () => G.flag('elders_met') && !G.flag('karta_uzeta'), run: async () => {
                            await G.say('regica', 'Pitaj svetoga Florijana, on sve vidi. Visi v kapelici sto let, nakrivo kak i svi mi.');
                        } },
                        { t: 'Ukral sem ti bučnicu. Oprosti.', cond: () => G.flag('pita_uzeta'), run: async () => {
                            await G.say('regica', 'ZNALA sem! Garo spi ko janjec, a bučnice nema.');
                            await G.say('regica', '...Dobro. Kušnja je kušnja. Ali dužen si mi.');
                        } },
                        { t: 'Bok, Regica.', run: async () => { await G.say('regica', 'Bok, dečec.'); return 'end'; } },
                    ].map(o => ({ ...o, run: o.run && (async () => (await o.run()) || 'more') })));
                },
                give: { pita: 'Bolje da joj ju ne vraćam. Treba mi za kušnju.', '*': async () => G.say('regica', 'Hvala, Draž, ali ne treba mi to.') } },
            { actor: 'duka', name: N('Đuka', 'Đuku', 'Đuke', 'Đuki', 'Đukom'), walk: [760, 450], face: 'left', hk: 0.75,
                look: 'Đuka. Najlijeniji čovjek v Podravini. A to je velika konkurencija.',
                talk: async () => {
                    await G.say('duka', 'Aaah... Draž. Kaj hoćeš? Brzo, umoran sem.');
                    await G.dialog(() => [
                        { t: 'Hoćeš se zafrkavati?', run: async () => {
                            await G.say('duka', G.flag('duka_won') ? 'Može. Al dinare več imaš, pa je samo za vježbu.' : 'Zafrkancija? Može. Ako me nadmudriš, dobiš dva dinara.');
                            const won = await G.duel('duka');
                            if (won) {
                                if (!G.flag('duka_won')) {
                                    G.set('duka_won');
                                    await G.say('duka', 'Dobro, dobro. Evo ti dva dinara. Idi sad Jagi, a mene pusti.');
                                    G.sfx('coin');
                                    await G.addItem('dinari');
                                } else await G.say('duka', 'Opet? Pusti me, vrti mi se v glavi od tolike pameti.');
                            } else {
                                await G.say('duka', 'Ha! Dojdi kad naučiš kaj pametnoga.');
                                if (G.st.retorts.length < 4) await G.say('duka', 'I slušaj kaj ti odgovaram. Svaka zafrkancija ima svoj odgovor.');
                            }
                            return 'end';
                        } },
                        { t: 'Kak se postane majstor zafrkancije?', run: async () => {
                            await G.talk([
                                ['duka', 'Slušaj kaj ti drugi vele, pa zapamti. Svaka zafrkancija ima svoj odgovor. Samo jedan.'],
                                ['duka', 'Kad te netko zafrkava, zapamti zafrkanciju. Kad ti netko pametno odgovori, zapamti odgovor.'],
                                ['duka', 'Jaga ti bu rekla iste stvari, samo na svoj način. Odgovori su isti.'],
                            ]);
                        } },
                        { t: 'Kaj delaš?', run: async () => {
                            await G.talk([['duka', 'Odmaram.'], ['draz', 'Od čega?'], ['duka', 'Od odmaranja. Teško je to.']]);
                        } },
                        { t: 'Bok.', run: async () => 'end' },
                    ].map(o => ({ ...o, run: o.run && (async () => (await o.run()) || 'more') })));
                },
                give: { '*': async () => G.say('duka', 'Daj mi to kasnije. Sad mi se ne da držati ništ.') } },
        ],
    },

    kapelica: {
        name: 'Kapelica svetoga Florijana', music: 'kapelica',
        scale: [400, 0.74, 540, 0.98],
        walk: [[130, 408], [894, 408], [1024, 480], [1024, 542], [0, 542], [0, 480]],
        entries: { start: [130, 470, 'right'] },
        props: [
            { id: 'slika', key: 'pr_slika', x: 270, y: 132, origin: [0.5, 0], depth: 5 },
            { id: 'karta', key: 'pr_karta', x: 300, y: 446, depth: 446, visible: () => G.flag('slika_pala') && !G.flag('karta_uzeta') },
        ],
        enter: async () => { G.prop('slika').setAngle(G.flag('slika_pala') ? 9 : 3); },
        hot: [
            { name: N('vrata', 'vrata', 'vrata', 'vratima', 'vratima'), rect: [20, 186, 86, 274], walk: [112, 470],
                exit: { room: 'selo', entry: 'kapelica' } },
            { name: N('oltar', 'oltar', 'oltara', 'oltaru', 'oltarom'), rect: [390, 150, 244, 250], walk: [512, 440],
                look: 'Oltar, sav v crvenom i zlatnom. Regica ga je opeglala za proštenje.', take: 'Ne bum krao v kapelici. Kradem samo v dvorištu.' },
            { name: N('svijeće', 'svijeće', 'svijeća', 'svijećama', 'svijećama'), rect: [196, 300, 112, 100], walk: [252, 440],
                look: 'Svijeće za pokojne. I jedna za Lojzeka, za svaki slučaj.', take: 'Nije lijepo. A i vruće su.' },
            { name: N('milodar', 'milodar', 'milodara', 'milodaru', 'milodarom'), rect: [776, 326, 68, 76], walk: [810, 440],
                look: 'Kutija za milodar. Prazna. Gruntovčani daju Bogu kaj je Božje, a Cinoberu sve ostalo.',
                open: 'Zaključana. I prazna. Dvostruko zaključana, zapravo.',
                useWith: { dinari: 'Sveti Florijan bu razumel. Trebaju mi za nekaj važnoga.' }, give: { dinari: 'Sveti Florijan bu razumel. Trebaju mi za nekaj važnoga.' } },
            { name: N('prozor', 'prozor', 'prozora', 'prozoru', 'prozorom'), rect: [926, 146, 70, 180], walk: [880, 440],
                look: 'Šareni prozor. Kad sunce zasja, cijela kapelica izgleda kak Cinoberove police.' },
            { prop: 'slika', name: N('slika svetoga Florijana', 'sliku svetoga Florijana', 'slike svetoga Florijana', 'slici svetoga Florijana', 'slikom svetoga Florijana'), walk: [300, 430], face: 'left',
                look: async () => {
                    await G.say('draz', 'Sveti Florijan gasi goruću hižu s kanticom vode.');
                    await G.say('draz', G.flag('slika_pala') ? 'Sad visi još više nakrivo. Oprosti, sveti Florijane.' : 'Slika visi malo nakrivo. Ko da je nekaj iza nje.');
                },
                pull: async () => STORY.tiltPicture(), push: async () => STORY.tiltPicture(), take: async () => STORY.tiltPicture(),
                talk: 'Sveti Florijane, čuvaj Gruntovec. I mene, ako stigneš.' },
            { prop: 'karta', name: N('papir', 'papir', 'papira', 'papiru', 'papirom'), walk: [300, 462], face: 'right',
                look: 'Stari, žuti papir. Iz njega viri nekakav crtež.',
                take: async () => {
                    await G.pose('draz', 'reach', 400);
                    G.set('karta_uzeta');
                    await G.addItem('karta');
                    await G.say('draz', 'Karta! Stara karta staroga Gruntovca!');
                } },
        ],
    },

    dvoriste: {
        name: 'Regičino dvorište', music: 'selo',
        scale: [410, 0.62, 540, 0.95],
        walk: [[0, 424], [1024, 424], [1024, 542], [0, 542]],
        entries: { start: [985, 480, 'left'] },
        props: [
            { id: 'pita', key: 'pr_pita', x: 355, y: 330, depth: 330, visible: () => !G.flag('pita_uzeta') },
            { id: 'para', key: 'pr_para', x: 355, y: 312, depth: 331, alpha: 0.8, visible: () => !G.flag('pita_uzeta') },
            { id: 'vrata_z', key: 'pr_vrata_zatv', x: 788, y: 412, depth: 300, visible: () => !G.flag('stagalj_otvoren') },
            { id: 'vrata_o', key: 'pr_vrata_otv', x: 788, y: 412, depth: 300, visible: () => !!G.flag('stagalj_otvoren') },
            { id: 'lopata', key: 'pr_lopata', x: 760, y: 406, depth: 301, visible: () => G.flag('stagalj_otvoren') && !G.flag('lopata_uzeta') },
        ],
        actors: [
            { id: 'garo', x: 590, y: 474, base: 'sit', face: 'left', scale: 0.95, perspective: false, headK: 0.75, noTalk: false,
                frame: () => G.flag('garo_spi') ? 'sleep' : 'sit', talkFrames: ['bark', 'growl'] },
        ],
        enter: async () => {
            const p = G.prop('para');
            if (p && p.visible) G.tweens.add({ targets: p, y: 300, alpha: 0.2, duration: 1600, yoyo: true, repeat: -1 });
        },
        hot: [
            { name: N('selo', 'selo', 'sela', 'selu', 'selom'), rect: [980, 280, 44, 264], walk: [1020, 480],
                exit: { room: 'selo', entry: 'dvoriste' } },
            { name: N('Regičina hiža', 'Regičinu hižu', 'Regičine hiže', 'Regičinoj hiži', 'Regičinom hižom'), rect: [56, 100, 470, 300], walk: [300, 450],
                look: 'Regičina i Dudekova hiža. Bijela ko snijeg, a krov od trstike.' },
            { name: N('vrata hiže', 'vrata hiže', 'vrata hiže', 'vratima hiže', 'vratima hiže'), rect: [120, 296, 82, 112], walk: [160, 440],
                look: 'Vrata Regičine hiže.', open: 'Zaključano. Regica ne vjeruje nikome. Pametna žena.' },
            { name: N('prozor', 'prozor', 'prozora', 'prozoru', 'prozorom'), rect: [294, 244, 124, 64], walk: [355, 440],
                look: 'Kroz prozor se vidi kuhinja. Na stolu brašno, na peći lonac, na zidu Dudekova slika iz vojske.',
                open: 'Več je otvoren. Zato se bučnica hladi.' },
            { name: N('štagalj', 'štagalj', 'štaglja', 'štaglju', 'štagljem'), rect: [600, 90, 380, 160], walk: [788, 440],
                look: 'Štagalj. Tam Dudek drži alat, sijeno, i bocu za koju Regica ne zna.' },
            { name: N('vrata štaglja', 'vrata štaglja', 'vrata štaglja', 'vratima štaglja', 'vratima štaglja'), rect: [712, 256, 152, 156], walk: [800, 440], face: 'right',
                look: () => G.say('draz', G.flag('stagalj_otvoren') ? 'Otvorena. Unutra je mrak i miriše na sijeno.' : 'Velika drvena vrata štaglja.'),
                open: async () => {
                    if (G.flag('stagalj_otvoren')) return G.say('draz', 'Več su otvorena.');
                    if (!G.flag('garo_spi')) return STORY.guard();
                    G.sfx('door'); G.set('stagalj_otvoren');
                },
                pull: async () => {
                    if (G.flag('stagalj_otvoren')) return G.say('draz', 'Več su otvorena.');
                    if (!G.flag('garo_spi')) return STORY.guard();
                    G.sfx('door'); G.set('stagalj_otvoren');
                },
                close: async () => {
                    if (!G.flag('stagalj_otvoren')) return G.say('draz', 'Več su zatvorena.');
                    G.sfx('door'); G.set('stagalj_otvoren', false);
                } },
            { name: N('pasja kućica', 'pasju kućicu', 'pasje kućice', 'pasjoj kućici', 'pasjom kućicom'), rect: [458, 356, 100, 84], walk: [500, 450],
                look: 'Garova kućica. Na njoj piše GARO, za slučaj da Garo zaboravi kak se zove.' },
            { prop: 'lopata', name: N('lopata', 'lopatu', 'lopate', 'lopati', 'lopatom'), walk: [770, 444], face: 'right',
                look: 'Lopata. Dobra za kopanje. A ja baš nekaj moram iskopati.',
                take: async () => {
                    await G.pose('draz', 'reach', 400);
                    G.set('lopata_uzeta');
                    await G.addItem('lopata');
                    await G.say('draz', 'Posudit bum ju. Na neodređeno.');
                } },
            { prop: 'pita', name: N('bučnica', 'bučnicu', 'bučnice', 'bučnici', 'bučnicom'), walk: [355, 440], face: 'right',
                look: 'Regičina bučnica. Hladi se na prozoru. Miriše po buči, cimetu i nevolji.',
                take: async () => {
                    if (!G.flag('garo_spi')) return STORY.guard();
                    await G.pose('draz', 'up', 500);
                    G.set('pita_uzeta');
                    await G.addItem('pita');
                    await G.say('draz', 'Oprosti, Regica. Kušnja je kušnja.');
                } },
            { actor: 'garo', name: N('Garo', 'Gara', 'Gara', 'Garu', 'Garom'), walk: [470, 470], face: 'right', wk: 0.8, hk: 0.8,
                look: () => G.say('draz', G.flag('garo_spi') ? 'Garo spi ko janjec. Hrče ko Lojzek.' : 'Garo. Pas s više zubi neg pameti. Čuva Regičinu bučnicu i štagalj.'),
                talk: async () => {
                    if (G.flag('garo_spi')) return G.say('draz', 'Bolje da ga ne budim.');
                    await G.say('draz', 'Dobar pas... dobar Garo...');
                    G.sfx('bark');
                    await G.say('garo', 'GRRRRR... VAU!');
                },
                take: 'Nebi to bilo pametno. Ni za mene, ni za moje prste.',
                push: async () => G.flag('garo_spi') ? G.say('draz', 'Spi. Neka spi.') : STORY.guard(),
                pull: async () => G.flag('garo_spi') ? G.say('draz', 'Spi. Neka spi.') : STORY.guard(),
                give: {
                    krvavica: async () => {
                        await G.say('draz', 'Ne bum mu ju dal tek tak. Pojel bi ju i dalje lajal.');
                        await G.say('draz', 'Trebal bi ga nekak uspavati.');
                    },
                    krvavica_mak: async () => {
                        G.removeItem('krvavica_mak');
                        await G.say('draz', 'Evo, Garo. Fina krvavica. Samo za tebe.');
                        G.sfx('gulp');
                        await G.pose('garo', 'growl', 500);
                        await G.say('garo', 'Njam! Njam-njam.');
                        await G.wait(500);
                        await G.say('garo', 'Aaaauuuuuhhhh...', { ms: 1500 });
                        G.set('garo_spi');
                        G.sfx('snore');
                        await G.say('draz', 'Spava ko top. Hvala, Regičina bako.');
                    },
                    pita: 'Nikad!',
                    '*': async () => { G.sfx('bark'); await G.say('garo', 'GRRR!'); },
                } },
        ],
    },

    polje: {
        name: 'Polje', music: 'selo',
        scale: [400, 0.58, 540, 0.95],
        walk: [[0, 404], [1024, 404], [1024, 542], [0, 542]],
        entries: { start: [30, 470, 'right'], obala: [990, 470, 'left'] },
        props: [
            { id: 'rupa', key: 'pr_rupa', x: 724, y: 476, depth: 300, visible: () => !!G.flag('iskopano') },
        ],
        hot: [
            { name: N('selo', 'selo', 'sela', 'selu', 'selom'), rect: [0, 320, 40, 224], walk: [6, 470],
                exit: { room: 'selo', entry: 'polje' } },
            { name: N('Drava', 'Dravu', 'Drave', 'Dravi', 'Dravom'), rect: [984, 320, 40, 224], walk: [1020, 470],
                exit: { room: 'obala', entry: 'start' } },
            { name: N('kukuruz', 'kukuruz', 'kukuruza', 'kukuruzu', 'kukuruzom'), rect: [0, 170, 1024, 160], walk: () => [G.player.x, 420],
                look: 'Kukuruz, kukuruz, kukuruz. Podravina v jednoj riječi.', take: 'Nije moj kukuruz. A i ne volim kokice.' },
            { name: N('stog sijena', 'stog sijena', 'stoga sijena', 'stogu sijena', 'stogom sijena'), rect: [816, 250, 128, 136], walk: [880, 430],
                look: 'Stog sijena. Ak je igla v njemu, neka tam i ostane.', take: 'Cijeli stog? Nisam ja Đuka. Mislim, nisam ja konj.' },
            { name: N('strašilo', 'strašilo', 'strašila', 'strašilu', 'strašilom'), rect: [338, 196, 96, 190], walk: [390, 430],
                look: () => G.say('draz', G.flag('karta_procitana')
                    ? 'Strašilo. Od njega prema Dravi... a Drava je desno.'
                    : 'Strašilo. Nosi Dudekov stari kaput. Vrane ga se ne boje, ali Regica bi ga se bojala da vidi kaput.'),
                talk: async () => { await G.say('draz', 'Dober dan.'); await G.wait(600); await G.say('draz', 'Ne odgovara. Barem ne zafrkava.'); },
                take: 'Nek ostane. Bez njega karta ne bi imala smisla.' },
            { name: N('mak', 'mak', 'maka', 'maku', 'makom'), rect: [56, 416, 228, 112], walk: [170, 470],
                look: 'Crveni mak. Regičina baka veli da se od njega spava ko top.',
                take: async () => {
                    if (G.has('mak') || G.has('krvavica_mak') || G.flag('garo_spi')) return G.say('draz', 'Imam dovoljno maka. Ne trebam uspavati cijeli Gruntovec.');
                    await G.pose('draz', 'reach', 400);
                    await G.addItem('mak');
                    await G.say('draz', 'Uberem par makovih glavica.');
                } },
            { name: N('kamen', 'kamen', 'kamena', 'kamenu', 'kamenom'), rect: [655, 362, 116, 92], walk: [650, 480], face: 'right',
                look: () => G.say('draz', G.flag('karta_procitana')
                    ? 'Kamen ima oblik glave! I ne govori! I ima bradu! To je to!'
                    : 'Kamen. Ima lice. Malo sliči na staru Jagu.'),
                talk: async () => {
                    await G.say('draz', 'Bok, kamen.');
                    if (G.flag('karta_procitana')) await G.say('draz', 'Glava koja ne govori. Baš kak piše na karti.');
                },
                take: 'Pretežak je. A i ima bradu, nije pristojno.',
                push: 'Ne miče se. Kamen ko kamen.', pull: 'Ne miče se. Kamen ko kamen.',
                useWith: { lopata: async () => STORY.dig() } },
            { prop: 'rupa', name: N('rupa', 'rupu', 'rupe', 'rupi', 'rupom'), walk: [650, 490], face: 'right',
                look: 'Rupa gdje je bil lonac staroga Gruntovca.',
                useWith: { lopata: 'Več sem iskopal. Ne trebam rupu do Australije.' } },
        ],
    },

    obala: {
        name: 'Obala Drave', music: 'drava',
        scale: [400, 0.6, 540, 0.95],
        walk: [[0, 424], [720, 420], [1024, 446], [1024, 542], [0, 542]],
        entries: { start: [30, 480, 'right'], ada: [860, 470, 'left'] },
        props: [
            { id: 'skela', key: 'pr_skela', x: 870, y: 432, depth: 405 },
        ],
        actors: [
            { id: 'jaga', x: 240, y: 458, face: 'right' },
            { id: 'pepek', x: 890, y: 408, face: 'left', scale: 0.6, perspective: false, depth: 406 },
        ],
        hot: [
            { name: N('polje', 'polje', 'polja', 'polju', 'poljem'), rect: [0, 300, 40, 244], walk: [6, 480],
                exit: { room: 'polje', entry: 'obala' } },
            { name: N('Drava', 'Dravu', 'Drave', 'Dravi', 'Dravom'), rect: [0, 236, 1024, 150], walk: () => [G.player.x, 430],
                look: 'Drava. Lijepa, široka i hladna. Kak Regičin pogled kad joj kradeš bučnicu.',
                use: 'Ne bum se kupal. Voda je hladna, a ja sem gol samo subotom.', take: 'Cijelu Dravu? Ni Kombinat to ne more.' },
            { name: N('ada', 'adu', 'ade', 'adi', 'adom'), rect: [580, 220, 340, 70], walk: [700, 440],
                look: 'Ada nasred Drave. Tam je Drug Direktor sa šatorom i žutim bagerom.' },
            { name: N('košara s rubljem', 'košaru s rubljem', 'košare s rubljem', 'košari s rubljem', 'košarom s rubljem'), rect: [54, 424, 82, 60], walk: [150, 480],
                look: 'Košara s rubljem. Bolje da ne gledam kaj je unutra.', take: 'Jaga bi me oprala zajedno s gaćama.' },
            { prop: 'skela', name: N('skela', 'skelu', 'skele', 'skeli', 'skelom'), walk: [790, 450], face: 'right',
                look: 'Pepekova skela. Drvo, uže i četrdeset godina Pepekove volje.',
                use: async () => STORY.askFerry(), push: 'Nije moja skela. Pitaj Pepeka.' },
            { actor: 'jaga', name: N('Jaga', 'Jagu', 'Jage', 'Jagi', 'Jagom'), walk: [360, 470], face: 'left', hk: 0.85,
                look: 'Stara Jaga. Pere rublje i rukama i jezikom. Jezikom brže.',
                talk: async () => {
                    await G.say('jaga', G.flag('jaga_won') ? 'Kaj buljiš? Več si me nadmudril. Idi se hvali drugima.' : 'Kaj buljiš? Rublje se ne pere samo.');
                    await G.dialog(() => [
                        { t: 'Izazivam te na zafrkanciju!', cond: () => !G.flag('jaga_won'), run: async () => {
                            await G.say('jaga', 'Ti? Mene? Ha! Dobro. Da vidimo kaj znaš, balavče. Tri pametna odgovora i priznajem.');
                            const won = await G.duel('jaga');
                            if (won) {
                                G.set('jaga_won');
                                await G.say('jaga', '...Dobro. Dobro! Nadmudril si me. Prvi put v pedeset let.');
                                await G.say('jaga', 'Na, uzmi moj rupec. Neka znaju v birtiji.');
                                await G.addItem('rupec');
                            } else {
                                await G.say('jaga', 'Ha! Idi se vježbati s Đukom, pa dojdi.');
                                if (G.st.retorts.length < INSULTS.length - 1) await G.say('draz', 'Moram naučiti više odgovora. Đuka ih zna sve, samo je prelijen da ih pametno koristi.');
                            }
                            return 'end';
                        } },
                        { t: 'Kaj pereš?', run: async () => { await G.say('jaga', 'Dudekove gaće. Nemoj pitati dalje.'); } },
                        { t: 'Znaš kaj o adi?', run: async () => {
                            await G.say('jaga', 'Znam da je naša. A taj Direktor bu se tam smrzel, ak ga Drava ne odnese prije.');
                        } },
                        { t: 'Bok.', run: async () => 'end' },
                    ].map(o => ({ ...o, run: o.run && (async () => (await o.run()) || 'more') })));
                },
                give: { '*': async () => G.say('jaga', 'Kaj mi to daješ? Ja nisam Đuka da uzimam svašta.') } },
            { actor: 'pepek', name: N('Pepek', 'Pepeka', 'Pepeka', 'Pepeku', 'Pepekom'), walk: [790, 450], face: 'right', hk: 0.85,
                look: 'Pepek, skelar. Vozi ljude preko Drave četrdeset let. Ali samo prave Gruntovčane.',
                talk: async () => STORY.askFerry(),
                give: { rakija: async () => STORY.askFerry(), '*': async () => G.say('pepek', 'Ne trebam to. Ja trebam nekaj za grlo.') } },
        ],
    },

    ada: {
        name: 'Ada', music: 'direktor',
        scale: [380, 0.6, 540, 0.95],
        walk: [[0, 424], [1024, 424], [1024, 542], [0, 542]],
        entries: { start: [180, 470, 'right'] },
        props: [
            { id: 'skela', key: 'pr_skela', x: 130, y: 440, depth: 405 },
            { id: 'bager', key: 'pr_bager', x: 850, y: 472, depth: 450 },
            { id: 'gruntovnica', key: 'pr_gruntovnica', x: 300, y: 388, depth: 500, visible: () => !G.has('gruntovnica') && !G.flag('kraj') },
        ],
        actors: [
            { id: 'pepek', x: 110, y: 418, face: 'right', scale: 0.6, perspective: false, depth: 406 },
            { id: 'direktor', x: 430, y: 440, face: 'left', visible: () => !G.flag('direktor_otisel') && !G.flag('direktor_u_bageru') },
        ],
        enter: async () => {
            if (G.flag('ada_bil')) return;
            G.set('ada_bil');
            await G.talk([
                ['direktor', 'Stoj! Tko ste vi? Ovo je državni teren!'],
                ['draz', 'Ja sem Draž iz Gruntovca. Došel sem po gruntovnicu.'],
                ['direktor', 'Ha! Seljačić! Gruntovnica je sada vlasništvo Kombinata. Kao i ova ada. I uskoro vaše selo.'],
            ]);
        },
        hot: [
            { name: N('šator', 'šator', 'šatora', 'šatoru', 'šatorom'), rect: [560, 236, 200, 164], walk: [660, 440],
                look: 'Direktorov šator. Unutra je krevet na rasklapanje i sedam primjeraka istog obrasca.',
                open: 'Bolje ne. Direktor bi rekel da je to provala na državni teren.' },
            { name: N('ploča', 'ploču', 'ploče', 'ploči', 'pločom'), rect: [416, 206, 128, 76], walk: [480, 440],
                look: '„Kombinat šljunka. Investitor: Drug Direktor.“ Netko je olovkom dopisal: „i njegova mama“.' },
            { name: N('stol', 'stol', 'stola', 'stolu', 'stolom'), rect: [216, 364, 172, 78], walk: [300, 450],
                look: 'Rasklopni stol s papirima. Na njemu leži gruntovnica!' },
            { name: N('Drava', 'Dravu', 'Drave', 'Dravi', 'Dravom'), rect: [0, 206, 1024, 140], walk: () => [G.player.x, 430],
                look: 'Drava teče oko ade kak da ju grli. Neće ju dati bageru.' },
            { prop: 'bager', name: N('bager', 'bager', 'bagera', 'bageru', 'bagerom'), walk: [720, 460], face: 'right',
                look: 'Žuti bager s natpisom KOMBINAT. Stoji na samom rubu ade. Jedan krivi korak i...',
                push: 'Pretežak je za mene. Al Drava ga bi rado uzela.', open: 'Zaključan. Ključ ima Direktor.', use: 'Ne znam voziti bager. Znam voziti samo kola, i to s konjem.' },
            { prop: 'gruntovnica', name: N('gruntovnica', 'gruntovnicu', 'gruntovnice', 'gruntovnici', 'gruntovnicom'), walk: [300, 450], face: 'right',
                look: 'Gruntovnica Gruntovca! Leži na Direktorovom stolu.',
                take: async () => {
                    if (!G.flag('direktor_otisel')) {
                        await G.say('direktor', 'Ruke dalje! To je državna imovina!');
                        await G.say('draz', 'Moram ga se nekak riješiti.');
                        return;
                    }
                    await G.addItem('gruntovnica');
                } },
            { actor: 'pepek', name: N('Pepek', 'Pepeka', 'Pepeka', 'Pepeku', 'Pepekom'), walk: [220, 460], face: 'left', hk: 0.85,
                look: 'Pepek čeka na skeli. Fućka si nekaj, a to nikad nije dobar znak.',
                talk: async () => {
                    await G.say('pepek', 'Natrag na obalu?');
                    const o = await G.choose([{ t: 'Je, vozi me natrag.', id: 'da' }, { t: 'Ne još.', id: 'ne' }]);
                    await G.say('draz', o.t);
                    if (o.id === 'da') await STORY.ferry('obala');
                } },
            { actor: 'direktor', name: N('Drug Direktor', 'Druga Direktora', 'Druga Direktora', 'Drugu Direktoru', 'Drugom Direktorom'), walk: [330, 450], face: 'right',
                look: 'Drug Direktor. Odijelo iz Zagreba, cipele iz Beča, a manire iz štale.',
                talk: async () => {
                    await G.say('direktor', 'Što je, seljače? Imam sastanak sa samim sobom za pet minuta.');
                    await G.dialog(() => [
                        { t: 'Vrati nam gruntovnicu!', run: async () => {
                            await G.talk([
                                ['direktor', 'Nikada! Sutra kopamo. A vi, seljačiću, ne biste ni dvije pametne rekli.'],
                                ['draz', 'Je? Onda vas izazivam na zafrkanciju!'],
                                ['direktor', 'Zafrkanciju? Ja sam završio tri političke škole! Izvolite!'],
                            ]);
                            const won = await G.duel('direktor');
                            if (won) { await STORY.finale(); return 'end'; }
                            await G.say('direktor', 'Ha! Vidite? Pamet je u gradu. Idite doma.');
                            return 'end';
                        } },
                        { t: 'Kaj je to Kombinat šljunka?', run: async () => {
                            await G.talk([
                                ['direktor', 'Napredak, druže! Šljunak za ceste, ceste za kamione, kamioni za šljunak!'],
                                ['draz', 'A kaj bu s Gruntovcem?'],
                                ['direktor', 'Gruntovec će biti jezero. Jezera su vrlo moderna.'],
                            ]);
                        } },
                        { t: 'Kak ste došli na adu?', run: async () => {
                            await G.say('direktor', 'Helikopterom. Sutra dolazi po mene. Ako ne pada kiša. Ili ako ne zaborave.');
                        } },
                        { t: 'Bok.', run: async () => 'end' },
                    ].map(o => ({ ...o, run: o.run && (async () => (await o.run()) || 'more') })));
                },
                give: {
                    rakija: async () => G.say('direktor', 'Ne pijem s kmetovima. Pijem samo na proslavama plana.'),
                    lonac: async () => { await G.say('draz', 'Nebum mu dal dukate. Bi ih samo zakopal v beton.'); },
                    '*': async () => G.say('direktor', 'Mito? Na državnom terenu? Zapisujem.'),
                } },
        ],
    },
};

STORY.trials = async () => {
    await G.talk([
        ['dudek', 'Prva: moraš nadmudriti staru Jagu v zafrkanciji. Nitko ju još nije nadmudril.'],
        ['dudek', 'Druga: moraš donesti Regičinu bučnicu. A Regica ju čuva bolje neg banka.'],
        ['dudek', 'Treća: moraš najti zakopani lonac staroga Gruntovca. Pravi Gruntovčan zna gdje mu je grunt.'],
    ]);
};

STORY.tiltPicture = async () => {
    if (G.flag('slika_pala')) { await G.say('draz', 'Bolje da ju ne diram više. Sveti Florijan ima kantu vode.'); return; }
    await G.pose('draz', 'up', 300);
    const s = G.prop('slika');
    await G.tween({ targets: s, angle: 9, duration: 300, ease: 'Back.out' });
    G.set('slika_pala');
    const k = G.prop('karta');
    k.setVisible(true).setY(280).setAngle(-30);
    await G.tween({ targets: k, y: 446, angle: 8, duration: 600, ease: 'Bounce.out' });
    await G.say('draz', 'Iza slike je nekaj palo!');
};

STORY.dig = async () => {
    if (G.flag('iskopano')) return G.say('draz', 'Več sem iskopal. Ne trebam rupu do Australije.');
    if (!G.flag('karta_procitana')) return G.say('draz', 'Zakaj bi kopal baš tu? Bez karte bi mogel prekopati cijelu Podravinu.');
    await G.walkPlayer(650, 490);
    G.player.setFlipX(false);
    for (let i = 0; i < 3; i++) {
        G.sfx('dig');
        await G.pose('draz', 'reach', 260);
        await G.pose('draz', 'up', 260);
    }
    G.set('iskopano');
    G.sfx('clunk');
    await G.say('draz', 'Nekaj je zveknulo!');
    await G.pose('draz', 'reach', 400);
    await G.addItem('lonac');
    await G.say('draz', 'Lonac! Pun dukata! Stari Gruntovec je stvarno znal gdje mu je grunt.');
};

STORY.askFerry = async () => {
    if (G.flag('pepek_ok')) {
        await G.say('pepek', 'Na adu?');
        const o = await G.choose([{ t: 'Je, vozi me na adu.', id: 'da' }, { t: 'Ne još.', id: 'ne' }]);
        await G.say('draz', o.t);
        if (o.id === 'da') await STORY.ferry('ada');
        return;
    }
    await G.say('pepek', 'Pepek je na službi. Kaj trebaš?');
    await G.dialog(() => [
        { t: 'Vozi me na adu!', run: async () => {
            if (!G.flag('gruntovcan')) {
                await G.say('pepek', 'Ti? Ti si još dečec. Vozim samo prave Gruntovčane.');
                await G.say('pepek', 'Kad ti stari v birtiji to reknu, onda dojdi.');
                return 'end';
            }
            if (!G.has('rakija')) {
                await G.say('pepek', 'Čul sem da si sad pravi Gruntovčan. Svaka čast.');
                await G.say('pepek', 'Ali skela ne ide na suho grlo. Donesi rakije, pa idemo.');
                return 'end';
            }
            await G.say('draz', 'Evo, Cinoberova šljivovica.');
            G.removeItem('rakija');
            G.sfx('gulp');
            await G.say('pepek', 'Ahhhh. Sad vidim Mađarsku. I adu. Ajmo!');
            G.set('pepek_ok');
            await STORY.ferry('ada');
            return 'end';
        } },
        { t: 'Kaj je s tom adom?', run: async () => {
            await G.say('pepek', 'Ada je bila gruntovečka od kad je Drava Drava. Sad je tam neki Direktor s bagerom. Strašno.');
        } },
        { t: 'Kak je biti skelar?', run: async () => {
            await G.say('pepek', 'Tamo-amo, tamo-amo. Četrdeset let. Ko Đuka, samo se ja mičem.');
        } },
        { t: 'Bok.', run: async () => 'end' },
    ].map(o => ({ ...o, run: o.run && (async () => (await o.run()) || 'more') })));
};
