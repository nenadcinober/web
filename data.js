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
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Polenta_con_salsiccia.jpg/640px-Polenta_con_salsiccia.jpg'
    },
    {
        id: 'prge',
        name: 'Prge',
        calories: 200,
        description: 'Sušeni sir s paprikom i češnjakom, specifičan za podravsku regiju.',
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Prga_sir.jpg/640px-Prga_sir.jpg'
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
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Makovnjača.jpg/640px-Makovnjača.jpg'
    },
    {
        id: 'buce',
        name: 'Buče',
        calories: 26,
        description: 'Naribane buče, često se koriste za variva ili bučnicu.',
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Cucurbita_pepo_var._styriaca.jpg/640px-Cucurbita_pepo_var._styriaca.jpg'
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
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Bean_salad.jpg/640px-Bean_salad.jpg'
    },
    {
        id: 'kukuruzni-kruh',
        name: 'Kukuruzni kruh',
        calories: 240,
        description: 'Domaći kruh od kukuruznog brašna, težak i zasitan, odličan uz variva.',
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Cornbread.jpg/640px-Cornbread.jpg'
    },
    {
        id: 'prezgana-juha',
        name: 'Prežgana juha',
        calories: 60,
        description: 'Juha od preprženog brašna i vode, često s dodatkom jaja ili kruha. "Lijek" za želudac.',
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Soup.jpg/640px-Soup.jpg' // Generic soup placeholder
    },
    {
        id: 'salenjaci',
        name: 'Salenjaci',
        calories: 450,
        description: 'Lisnato tijesto s domaćim svinjskim salom, punjeno pekmezom.',
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Salenjaci.jpg/640px-Salenjaci.jpg'
    },
    {
        id: 'fis-paprikas',
        name: 'Fiš paprikaš',
        calories: 120,
        description: 'Ljući paprikaš od riječne ribe (šaran, som), popularan uz Dravu.',
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Halászlé.jpg/640px-Halászlé.jpg'
    },
    {
        id: 'piletina-vrhnje',
        name: 'Piletina u vrhnju',
        calories: 210,
        description: 'Piletina dinstana u umaku od vrhnja i crvene paprike.',
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Chicken_paprikash.jpg/640px-Chicken_paprikash.jpg'
    },
    {
        id: 'mazanica',
        name: 'Mazanica',
        calories: 310,
        description: 'Vrsta gibanice, tanko tijesto premazano mašću i nadjevom.',
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Burek_sa_sirom.jpg/640px-Burek_sa_sirom.jpg' // Visual approximation
    },
    {
        id: 'kuglof',
        name: 'Kuglof',
        calories: 340,
        description: 'Kolač pečen u karakterističnom kalupu, često s grožđicama i kakaom.',
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Gugelhupf.jpg/640px-Gugelhupf.jpg'
    },
    {
        id: 'rakija',
        name: 'Domaća rakija',
        calories: 230,
        description: 'Šljivovica ili lozovača, aperitiv koji otvara apetit.',
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Rakija.jpg/640px-Rakija.jpg'
    }
];

// Export for usage in script.js (if using modules) or global scope
if (typeof module !== 'undefined' && module.exports) {
    module.exports = podravinaData;
}
