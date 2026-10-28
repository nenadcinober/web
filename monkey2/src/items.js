'use strict';
// Inventory items. `forms` are the Croatian cases nominative|genitive|dative|accusative|instrumental,
// used to build the sentence line ("Koristi zob s kokoši", "Daj skušu Rexu").
// Only items that make sense on their own (eat, put on, rub in) have a plain `use`; every other item
// goes into "Koristi X s ..." mode and waits for a second target.

const ITEMS = {
    novcanik: {
        forms: 'novčanik|novčanika|novčaniku|novčanik|novčanikom',
        verbs: {
            look: E => E.st.money > 0 ? `Mokri novčanik. Unutra je ${E.st.money} €.` : 'Prazan novčanik. Kao moj trbuh prije doručka.',
            open: E => E.st.money > 0 ? `Brojim... ${E.st.money} eura. Nije puno, ali za početnika je bogatstvo.` : 'Prazno. Stanko je bio temeljit.',
        },
    },
    skusa: {
        forms: 'skuša|skuše|skuši|skušu|skušom',
        verbs: {
            look: 'Skuša. Gleda me. Ne sviđa mi se kako me gleda.',
            open: 'Neću je otvarati. Neke stvari moraju ostati tajna.',
        },
    },
    jaje: {
        forms: 'jaje|jajeta|jajetu|jaje|jajetom',
        verbs: { look: 'Svježe jaje. Još je toplo. Kokoš je bila jako motivirana.' },
    },
    banana: {
        forms: 'banana|banane|banani|bananu|bananom',
        verbs: {
            look: 'Banana. Kalij, šećer i prirodno pakiranje. Savršeno gorivo prije treninga.',
            use: async E => {
                E.take('banana');
                E.f.energy = true;
                E.sfx('gulp');
                await E.say('hero', 'Njam! Kalij i šećer! Osjećam kako mi se mišići pune kao baterije.');
            },
        },
    },
    pojas: {
        forms: 'pojas|pojasa|pojasu|pojas|pojasom',
        verbs: {
            look: 'Kožni pojas za dizanje. Rabljen, ali samo s jedne strane.',
            use: async E => {
                E.take('pojas');
                E.f.beltOn = true;
                E.hero.setBelt(true);
                E.sfx('click');
                await E.say('hero', 'Stavio sam pojas. Kralježnica mi upravo šalje zahvalnicu.');
            },
        },
    },
    zob: {
        forms: 'zob|zobi|zobi|zob|zobi',
        verbs: { look: 'Vreća zobenih pahuljica. Hrana prvaka. I konja.' },
    },
    magnezij: {
        forms: 'magnezij|magnezija|magneziju|magnezij|magnezijem',
        verbs: {
            look: 'Kanta magnezija. Bijeli prah za suhe ruke i čvrst hvat.',
            use: async E => {
                E.take('magnezij');
                E.f.chalked = true;
                E.hero.setChalk(true);
                E.sfx('whoosh');
                await E.say('hero', 'Natrljao sam ruke magnezijem. Sad imam hvat čvršći od Stankovih cijena.');
            },
        },
    },
    kreatin: {
        forms: 'drevni kreatin|drevnog kreatina|drevnom kreatinu|drevni kreatin|drevnim kreatinom',
        verbs: {
            look: 'Kanta kreatina iz 1987. Stvrdnuo se u jednu veliku kocku. Snaga desetljeća!',
            open: 'Poklopac je zahrđao, ali kreatin se ionako vidi kroz rupu. I on vidi mene.',
        },
    },
    mlijeko: {
        forms: 'mlijeko|mlijeka|mlijeku|mlijeko|mlijekom',
        verbs: { look: 'Boca mlijeka. Bruno kaže da je "skoro svježe". To "skoro" me brine.' },
    },
    disk: {
        forms: 'Zlatni disk|Zlatnog diska|Zlatnom disku|Zlatni disk|Zlatnim diskom',
        verbs: { look: 'Zlatni disk s Proklete šipke. Dokaz moje snage. I moje buduće kile.' },
    },
    sejk: {
        forms: 'Legendarni šejk|Legendarnog šejka|Legendarnom šejku|Legendarni šejk|Legendarnim šejkom',
        verbs: { look: 'Legendarni šejk. Boja: neodređena. Miris: herojski. Sastav: stopostotno prirodan!' },
    },
    majica: {
        forms: 'glupa majica|glupe majice|glupoj majici|glupu majicu|glupom majicom',
        verbs: {
            look: 'Na majici piše: "Pobijedio sam Vesnu i dobio samo ovu glupu majicu."',
            use: 'Ne mogu je obući. Preuska je za moje latisimuse.',
        },
    },
};
