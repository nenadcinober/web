'use strict';
// Dvoboj poziranja: the insult sword fighting of Monkey Island, with flexing instead of swords.
// Each pair has the insult the beach bodybuilders use, the comeback that beats it, and Vesna's
// master version, which is worded differently but is beaten by the same comeback.

const POSE = [
    {
        ins: 'Dižeš utege kao moja baka!',
        com: 'Kako prikladno. Ti poziraš kao njezin štap.',
        mas: 'Tvoj trening izgleda kao bakina rekreacija u toplicama!',
    },
    {
        ins: 'Nikad nisam vidio nešto tako mlohavo kao tvoje tijelo!',
        com: 'Čudno. Mislio sam da se svako jutro gledaš u ogledalo.',
        mas: 'Ti si najmlohavije stvorenje na cijelom otoku!',
    },
    {
        ins: 'Tvoj znoj smrdi kao pokvareni sir!',
        com: 'Barem se ja znojim. Ti samo stojiš i mirišeš na parfem.',
        mas: 'Od tvog smrada još mi suze oči!',
    },
    {
        ins: 'Moji mišići veći su od tvoje glave!',
        com: 'Šteta što ti mozak nije išao na isti trening.',
        mas: 'Moj triceps ima više pameti od tebe!',
    },
    {
        ins: 'Kad završim s tobom, zvat ćeš mamu da te nosi kući!',
        com: 'Bolje mama nego tvoj trener. On je davno odustao od tebe.',
        mas: 'Nakon ovog dvoboja trebat će ti mama da ti obriše suze!',
    },
    {
        ins: 'Za zagrijavanje pojedem trojicu poput tebe!',
        com: 'Vidi se. Izgledaš kao da te već zagrijavanje izmorilo.',
        mas: 'Ljudi poput tebe za mene su samo zagrijavanje!',
    },
];

const POSE_FAIL = [
    'Ah da? E pa... ti si glup!',
    'Gle! Iza tebe! Troglavi majmun!',
    'Ja... ovaj... imam lijepe tenisice?',
    'Moj tata je jači od tvog tate!',
];

function learnInsult(E, i) {
    if (E.st.ins.includes(i)) return false;
    E.st.ins.push(i);
    return true;
}

function learnComeback(E, i) {
    if (E.st.com.includes(i)) return false;
    E.st.com.push(i);
    return true;
}

// Returns true when the hero wins. First to three points takes it. Against beach bodybuilders the
// hero opens and the turns alternate, so even a beginner gets to attack and hear comebacks;
// Vesna never lets the hero attack.
async function poseOff(E, opp, master) {
    const st = E.st;
    const name = E.nameOf(opp);
    let me = 0, op = 0, heroTurn = !master;
    const bag = [];
    const score = E.add.text(512, 18, '', {
        fontFamily: FONT, fontSize: '28px', color: '#ffe070', stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5, 0).setDepth(5500);
    const upd = () => score.setText(`GAJBRUŠ  ${me} : ${op}  ${name.toUpperCase()}`);
    upd();

    const flexSay = async (who, line) => {
        E.pose(who, Math.random() < 0.5 ? 'flex' : 'crab');
        await E.say(who, line);
        E.pose(who, null);
    };

    while (me < 3 && op < 3) {
        if (!heroTurn) {
            let idx;
            if (master) {
                if (!bag.length) bag.push(...Phaser.Utils.Array.Shuffle([0, 1, 2, 3, 4, 5]));
                idx = bag.pop();
            } else {
                idx = Math.floor(Math.random() * POSE.length);
            }
            await flexSay(opp, master ? POSE[idx].mas : POSE[idx].ins);
            if (!master && learnInsult(E, idx)) E.toast('Naučio si novu uvredu!');
            const known = POSE.map((p, i) => i).filter(i => st.com.includes(i));
            const lines = known.map(i => POSE[i].com);
            lines.push(pick(POSE_FAIL));
            const k = await E.choose(lines);
            await flexSay('hero', lines[k]);
            if (known[k] === idx) {
                me++; upd();
                E.sfx('cheer');
                await E.say(opp, pick(['Grrr!', 'Ups.', 'Hm. Nije loše.', 'Au. To je boljelo.']));
            } else {
                op++; upd();
                E.sfx('laugh');
                await E.say(opp, pick(['Hahaha! Jadno!', 'To ti je odgovor?', 'Ha! Idi kući, repiću!']));
            }
            if (!master) heroTurn = true;
        } else {
            const known = st.ins.slice();
            const lines = known.map(i => POSE[i].ins);
            lines.push('Ovaj... lijepo vrijeme danas, ha?');
            const k = await E.choose(lines);
            await flexSay('hero', lines[k]);
            const i = known[k];
            if (i === undefined) {
                op++; upd();
                await E.say(opp, 'Ha! I to ti je uvreda?');
                heroTurn = false;
            } else if (Math.random() < 0.65) {
                await flexSay(opp, POSE[i].com);
                if (learnComeback(E, i)) E.toast('Naučio si novi odgovor!');
                op++; upd();
                heroTurn = false;
            } else {
                await E.say(opp, pick(['Ovaj... ehm... tvoja mama!', 'Ja... ovaj... nemam odgovor.', 'Ma... pusti me na miru!']));
                me++; upd();
                E.sfx('cheer');
                heroTurn = false;
            }
        }
    }
    await E.wait(300);
    score.destroy();
    return me >= 3;
}
