/**
 * Database of Podravina ingredients and dishes.
 * Calories are per 100g.
 */
const podravinaData = [
    {
        id: 'cvarci',
        name: 'Čvarci',
        calories: 524,
        description: 'Tradicionalni podravski čvarci, dobiveni topljenjem svinjske masti. Hrskavi i slani.',
        image: 'images/cvarci.png'
    },
    {
        id: 'krvavice',
        name: 'Krvavice',
        calories: 300,
        description: 'Kobasice punjene svinjskom krvlju, heljdom ili ječmom i začinima. Često se poslužuju s kiselim zeljem.',
        image: 'images/krvavice.png'
    },
    {
        id: 'sir-vrhnje',
        name: 'Sir i vrhnje',
        calories: 250,
        description: 'Svježi kravlji sir pomiješan s domaćim vrhnjem. Klasik podravskog doručka.',
        image: 'images/sir-vrhnje.png'
    },
    {
        id: 'zganci',
        name: 'Žganci',
        calories: 85,
        description: 'Kukuruzna krupica kuhana u vodi. Često se prelijeva s mlijekom, vrhnjem ili otopljenom masti (zabelom).',
        image: 'https://image.pollinations.ai/prompt/cornmeal%20mush%20zganci%20with%20bacon%20rustic%20food'
    },
    {
        id: 'prge',
        name: 'Prge',
        calories: 200,
        description: 'Sušeni sir s paprikom i češnjakom, specifičan za podravsku regiju.',
        image: 'https://image.pollinations.ai/prompt/dried%20cheese%20cones%20prge%20croatian%20food'
    },
    {
        id: 'orehnjaca',
        name: 'Orehnjača',
        calories: 350,
        description: 'Dizano tijesto punjeno nadjevom od oraha. Nezaobilazna na blagdanskom stolu.',
        image: 'images/orehnjaca.png'
    },
    {
        id: 'makovnjaca',
        name: 'Makovnjača',
        calories: 360,
        description: 'Sestra orehnjače, dizano tijesto bogato punjeno makom.',
        image: 'https://image.pollinations.ai/prompt/poppy%20seed%20roll%20makovnjaca%20sliced'
    },
    {
        id: 'buce',
        name: 'Buče',
        calories: 26,
        description: 'Naribane buče, često se koriste za variva ili bučnicu.',
        image: 'https://image.pollinations.ai/prompt/shredded%20pumpkin%20buce%20vegetable'
    },
    {
        id: 'bucino-ulje',
        name: 'Bučino ulje',
        calories: 896,
        description: 'Crno zlato Podravine. Ulje dobiveno od koštica buče, bogato okusom.',
        image: 'images/bucino-ulje.png'
    },
    {
        id: 'mlinci',
        name: 'Mlinci',
        calories: 320,
        description: 'Tjestenina od pečenog tijesta, prelivena vrelom vodom i masnoćom od pečenja. Savršeni uz puricu.',
        image: 'images/mlinci.png'
    },
    {
        id: 'purica',
        name: 'Purica s mlincima',
        calories: 180,
        description: 'Pečena purica, tradicionalno jelo za posebne prigode u Podravini.',
        image: 'images/purica.png'
    },
    {
        id: 'grah-salata',
        name: 'Grah salata',
        calories: 110,
        description: 'Salata od graha s bučinim uljem i lukom. Osvježavajuća i hranjiva.',
        image: 'https://image.pollinations.ai/prompt/bean%20salad%20pumpkin%20seed%20oil%20onion'
    },
    {
        id: 'kukuruzni-kruh',
        name: 'Kukuruzni kruh',
        calories: 240,
        description: 'Domaći kruh od kukuruznog brašna, težak i zasitan, odličan uz variva.',
        image: 'https://image.pollinations.ai/prompt/cornbread%20loaf%20rustic%20bread'
    },
    {
        id: 'prezgana-juha',
        name: 'Prežgana juha',
        calories: 60,
        description: 'Juha od preprženog brašna i vode, često s dodatkom jaja ili kruha. "Lijek" za želudac.',
        image: 'https://image.pollinations.ai/prompt/brown%20roux%20soup%20prezgana%20juha'
    },
    {
        id: 'salenjaci',
        name: 'Salenjaci',
        calories: 450,
        description: 'Lisnato tijesto s domaćim svinjskim salom, punjeno pekmezom.',
        image: 'https://image.pollinations.ai/prompt/puff%20pastry%20jam%20salenjaci'
    },
    {
        id: 'fis-paprikas',
        name: 'Fiš paprikaš',
        calories: 120,
        description: 'Ljući paprikaš od riječne ribe (šaran, som), popularan uz Dravu.',
        image: 'https://image.pollinations.ai/prompt/river%20fish%20stew%20paprika%20kettle'
    },
    {
        id: 'piletina-vrhnje',
        name: 'Piletina u vrhnju',
        calories: 210,
        description: 'Piletina dinstana u umaku od vrhnja i crvene paprike.',
        image: 'https://image.pollinations.ai/prompt/chicken%20paprikash%20cream%20sauce'
    },
    {
        id: 'mazanica',
        name: 'Mazanica',
        calories: 310,
        description: 'Vrsta gibanice, tanko tijesto premazano mašću i nadjevom.',
        image: 'https://image.pollinations.ai/prompt/thin%20pastry%20pie%20mazanica%20golden'
    },
    {
        id: 'kuglof',
        name: 'Kuglof',
        calories: 340,
        description: 'Kolač pečen u karakterističnom kalupu, često s grožđicama i kakaom.',
        image: 'https://image.pollinations.ai/prompt/bundt%20cake%20kuglof%20chocolate%20marble'
    },
    {
        id: 'rakija',
        name: 'Domaća rakija',
        calories: 230,
        description: 'Šljivovica ili lozovača, aperitiv koji otvara apetit.',
        image: 'https://image.pollinations.ai/prompt/shot%20glass%20brandy%20rakija%20bottle'
    }
];

// Export for usage in script.js (if using modules) or global scope
if (typeof module !== 'undefined' && module.exports) {
    module.exports = podravinaData;
}
