// The rooms, painted like Hlebine glass paintings: a high horizon, patchwork fields, trees built
// leaf by leaf, a sun with a face. Each room is one 1024 x 544 canvas.
const Backgrounds = (() => {
    const { canvas, rng, shade, poly, oval, rect, line, vgrad, text, flower, INK } = Art;
    const W = VW, H = SH;

    function sunFace(x, cx, cy, r, col = '#f8c830') {
        for (let i = 0; i < 16; i++) {
            const a = i / 16 * Math.PI * 2, a2 = a + 0.12;
            poly(x, [[cx + Math.cos(a - 0.12) * r * 1.05, cy + Math.sin(a - 0.12) * r * 1.05], [cx + Math.cos(a) * r * (i % 2 ? 1.45 : 1.7), cy + Math.sin(a) * r * (i % 2 ? 1.45 : 1.7)],
                [cx + Math.cos(a2) * r * 1.05, cy + Math.sin(a2) * r * 1.05]], i % 2 ? '#f6a020' : col, 1.5);
        }
        oval(x, cx, cy, r, r, col, 2.5);
        oval(x, cx - r * 0.35, cy - r * 0.15, r * 0.1, r * 0.13, INK, 0);
        oval(x, cx + r * 0.35, cy - r * 0.15, r * 0.1, r * 0.13, INK, 0);
        oval(x, cx - r * 0.5, cy + r * 0.2, r * 0.17, r * 0.12, 'rgba(230,80,60,0.5)', 0);
        oval(x, cx + r * 0.5, cy + r * 0.2, r * 0.17, r * 0.12, 'rgba(230,80,60,0.5)', 0);
        x.beginPath(); x.arc(cx, cy + r * 0.12, r * 0.32, 0.25, Math.PI - 0.25); x.lineWidth = 2.2; x.strokeStyle = INK; x.stroke();
    }
    function cloud(x, cx, cy, w) {
        const r = w / 5;
        x.beginPath();
        x.arc(cx - r * 1.6, cy, r * 0.9, Math.PI * 0.5, Math.PI * 1.5);
        x.arc(cx - r * 0.6, cy - r * 0.7, r * 1.1, Math.PI, Math.PI * 1.9);
        x.arc(cx + r * 0.8, cy - r * 0.5, r * 1.0, Math.PI * 1.1, Math.PI * 1.95);
        x.arc(cx + r * 1.7, cy, r * 0.8, Math.PI * 1.5, Math.PI * 0.5);
        x.closePath();
        x.fillStyle = '#ffffff'; x.fill(); x.lineWidth = 2; x.strokeStyle = 'rgba(70,90,130,0.6)'; x.stroke();
    }
    function sky(x, y1, top = '#5aa0e0', bot = '#d8ecf8') {
        x.fillStyle = vgrad(x, 0, y1, [top, bot]); x.fillRect(0, 0, W, y1);
    }
    // a round-crowned tree built from individual leaves
    function tree(x, cx, by, h, r, seed, leaf = '#3a8a3a', fruit = null) {
        const R = rng(seed);
        poly(x, [[cx - 10, by], [cx - 6, by - h * 0.55], [cx - 18, by - h * 0.75], [cx - 4, by - h * 0.65], [cx + 2, by - h * 0.8], [cx + 6, by - h * 0.6], [cx + 18, by - h * 0.72], [cx + 8, by - h * 0.5], [cx + 11, by]], '#6a4428', 2);
        const cy = by - h * 0.8;
        oval(x, cx, cy, r, r * 0.85, shade(leaf, 0.75), 2.5);
        for (let i = 0; i < r * 2.2; i++) {
            const a = R() * Math.PI * 2, d = Math.sqrt(R()) * r * 0.9;
            const lx = cx + Math.cos(a) * d, ly = cy + Math.sin(a) * d * 0.85;
            oval(x, lx, ly, 7, 4, R() < 0.5 ? leaf : shade(leaf, 1.25), 1, INK, a);
        }
        if (fruit) for (let i = 0; i < r / 6; i++) {
            const a = R() * Math.PI * 2, d = Math.sqrt(R()) * r * 0.8;
            oval(x, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.85, 4, 4, fruit, 1);
        }
    }
    function willow(x, cx, by, h, seed) {
        const R = rng(seed);
        poly(x, [[cx - 9, by], [cx - 5, by - h * 0.6], [cx + 5, by - h * 0.6], [cx + 9, by]], '#7a6a4a', 2);
        const cy = by - h * 0.75;
        oval(x, cx, cy, h * 0.32, h * 0.25, '#6a9a4a', 2.5);
        for (let i = 0; i < 40; i++) {
            const sx = cx + (R() - 0.5) * h * 0.6, sy = cy + (R() - 0.5) * h * 0.3;
            line(x, [[sx, sy], [sx + (R() - 0.5) * 8, sy + 20 + R() * 40]], 2.5, R() < 0.5 ? '#8aba5a' : '#5a8a3a');
        }
    }
    function grass(x, y0, y1, seed, col = '#3a8a2a') {
        const R = rng(seed);
        for (let i = 0; i < 260; i++) {
            const gx = R() * W, gy = y0 + R() * (y1 - y0), s = 4 + (gy - y0) / (y1 - y0) * 8;
            line(x, [[gx, gy], [gx - s * 0.3, gy - s]], 1.6, col);
            line(x, [[gx, gy], [gx + s * 0.4, gy - s * 0.9]], 1.6, col);
        }
    }
    function fields(x, y0, y1, seed) {
        // patchwork strips along the horizon
        const R = rng(seed), cols = ['#a8c858', '#d8c858', '#7aa84a', '#c8a050', '#98b850', '#e0d070'];
        let xx = 0;
        while (xx < W) {
            const w = 80 + R() * 160, c = cols[Math.floor(R() * cols.length)];
            poly(x, [[xx, y0], [xx + w, y0], [xx + w + 30, y1], [xx - 20, y1]], c, 1.5);
            for (let k = 1; k < 5; k++) line(x, [[xx + w * k / 5, y0], [xx + w * k / 5 + (k - 2.5) * 10, y1]], 1, shade(c, 0.85));
            xx += w;
        }
    }
    function hiza(x, x0, y0, w, h, opts = {}) {
        // a Podravina house: whitewashed walls, dark beams, a steep thatched roof
        const roof = opts.roof || '#c8a050';
        rect(x, x0, y0, w, h, '#f6efe0', 2.5);
        for (let i = 0; i <= 4; i++) line(x, [[x0 + i * w / 4, y0], [x0 + i * w / 4, y0 + h]], 3, '#5a3418');
        line(x, [[x0, y0 + h - 18], [x0 + w, y0 + h - 18]], 3, '#5a3418');
        rect(x, x0, y0 + h - 16, w, 16, '#d8c8a8', 2);
        poly(x, [[x0 - 18, y0 + 4], [x0 + w / 2, y0 - h * 0.85], [x0 + w + 18, y0 + 4]], roof, 2.5);
        const R = rng(x0 + y0);
        for (let i = 0; i < 40; i++) {
            const t = R(), u = R();
            const px = x0 - 10 + t * (w + 20), py = y0 - u * h * 0.75 * (1 - Math.abs(t - 0.5) * 1.8);
            line(x, [[px, py], [px + 2, py + 10]], 1.2, shade(roof, 0.75));
        }
    }
    function fence(x, x0, x1, by, h = 40, col = '#a87a4a') {
        line(x, [[x0, by - h * 0.7], [x1, by - h * 0.7]], 5, INK); line(x, [[x0, by - h * 0.7], [x1, by - h * 0.7]], 3, col);
        line(x, [[x0, by - h * 0.3], [x1, by - h * 0.3]], 5, INK); line(x, [[x0, by - h * 0.3], [x1, by - h * 0.3]], 3, col);
        for (let px = x0; px <= x1; px += 22) poly(x, [[px - 5, by], [px - 5, by - h + 6], [px, by - h], [px + 5, by - h + 6], [px + 5, by]], col, 1.8);
    }
    function sunflower(x, cx, by, h) {
        line(x, [[cx, by], [cx, by - h]], 5, INK); line(x, [[cx, by], [cx, by - h]], 3, '#4a8a2a');
        oval(x, cx - 10, by - h * 0.5, 10, 5, '#4a8a2a', 1.5, INK, 0.5);
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; oval(x, cx + Math.cos(a) * 12, by - h + Math.sin(a) * 12, 7, 4, '#f8c820', 1, INK, a); }
        oval(x, cx, by - h, 9, 9, '#6a3a18', 1.5);
    }
    function planks(x, x0, y0, w, h, col, step = 26) {
        rect(x, x0, y0, w, h, col);
        for (let yy = y0 + step; yy < y0 + h; yy += step) line(x, [[x0, yy], [x0 + w, yy]], 1.6, shade(col, 0.75));
    }
    function water(x, y0, y1, seed) {
        x.fillStyle = vgrad(x, y0, y1, ['#6aa8c8', '#3a7aa0', '#2a6a90']); x.fillRect(0, y0, W, y1 - y0);
        const R = rng(seed);
        for (let i = 0; i < 90; i++) {
            const wx = R() * W, wy = y0 + 6 + R() * (y1 - y0 - 10), s = 8 + (wy - y0) / (y1 - y0) * 20;
            x.beginPath(); x.arc(wx, wy, s, Math.PI * 1.15, Math.PI * 1.85); x.lineWidth = 2; x.strokeStyle = R() < 0.6 ? 'rgba(255,255,255,0.55)' : 'rgba(20,60,90,0.5)'; x.stroke();
        }
    }

    const ROOMS = {
        birtija(x) {
            // ceiling beams, whitewashed walls, a wooden wainscot and plank floor
            rect(x, 0, 0, W, 380, '#efe3c4');
            rect(x, 0, 0, W, 44, '#5a3418');
            for (let i = 0; i < 8; i++) rect(x, i * 140 - 10, 0, 30, 54, '#3a2210', 2);
            planks(x, 0, 300, W, 80, '#8a5a30', 20);
            line(x, [[0, 300], [W, 300]], 3);
            // a painted border of flowers along the wall
            for (let i = 0; i < 26; i++) flower(x, 20 + i * 40, 70, 5, i % 2 ? '#2a5ab0' : '#d42020', '#f2c030');
            // floor
            rect(x, 0, 380, W, H - 380, '#9a6a3a');
            for (let i = -12; i <= 12; i++) line(x, [[512 + i * 60, 380], [512 + i * 150, H]], 1.6, '#6a4220');
            for (let yy = 400; yy < H; yy += 30) line(x, [[0, yy], [W, yy]], 1, 'rgba(60,30,10,0.35)');
            line(x, [[0, 380], [W, 380]], 3);
            // shelves of bottles behind the bar
            rect(x, 50, 100, 300, 190, '#7a4a26', 2.5);
            const R = rng(5), cols = ['#3a8a3a', '#c02020', '#e8d070', '#6a3418', '#8ac0e0', '#f0f0e0'];
            for (const sy of [160, 220, 280]) {
                rect(x, 50, sy, 300, 8, '#5a3418', 2);
                for (let bx = 64; bx < 340; bx += 22 + R() * 6) {
                    const bh = 28 + R() * 16, c = cols[Math.floor(R() * cols.length)];
                    poly(x, [[bx, sy], [bx, sy - bh * 0.6], [bx + 4, sy - bh * 0.7], [bx + 4, sy - bh], [bx + 10, sy - bh], [bx + 10, sy - bh * 0.7], [bx + 14, sy - bh * 0.6], [bx + 14, sy]], c, 1.6);
                }
            }
            // the big demijohn of šljivovica
            oval(x, 380, 260, 34, 40, 'rgba(200,220,180,0.85)', 2.5);
            rect(x, 370, 206, 20, 20, 'rgba(200,220,180,0.85)', 2);
            text(x, 'ŠLJIVA', 380, 266, 12, '#5a3418');
            // window
            rect(x, 430, 110, 150, 130, '#8ac8f0', 3);
            rect(x, 430, 190, 150, 50, '#7ab84a');
            tree(x, 470, 205, 70, 30, 9);
            line(x, [[505, 110], [505, 240]], 5, '#5a3418'); line(x, [[430, 175], [580, 175]], 5, '#5a3418');
            poly(x, [[418, 100], [460, 100], [440, 250], [414, 250]], '#c42222', 2);
            poly(x, [[592, 100], [550, 100], [570, 250], [596, 250]], '#c42222', 2);
            // a tamburica hanging on the wall
            oval(x, 680, 200, 26, 32, '#c8863a', 2.5); oval(x, 680, 206, 8, 8, '#3a2210', 1.5);
            poly(x, [[674, 168], [686, 168], [684, 104], [676, 104]], '#6a3e20', 2);
            for (let i = 0; i < 3; i++) line(x, [[677 + i * 3, 108], [677 + i * 3, 228]], 0.8, '#f0f0f0');
            // a framed picture of the Drava
            rect(x, 760, 120, 110, 80, '#b8862a', 3); rect(x, 768, 128, 94, 64, '#8ac8f0');
            rect(x, 768, 168, 94, 24, '#3a7aa0'); willow(x, 800, 168, 40, 3);
            // the doorway to the village, on the right
            poly(x, [[930, 140], [1010, 120], [1010, 392], [930, 384]], '#3a2210', 3);
            poly(x, [[936, 148], [1004, 130], [1004, 384], [936, 378]], '#a8d8f8', 2);
            rect(x, 936, 300, 68, 80, '#7ab84a');
            poly(x, [[1004, 130], [1024, 126], [1024, 396], [1004, 384]], '#6a3e20', 2);
            // stools behind the table
            for (const sx of [560, 900]) { rect(x, sx - 22, 400, 44, 10, '#7a4a26', 2); rect(x, sx - 18, 410, 8, 40, '#6a3e20', 1.5); rect(x, sx + 10, 410, 8, 40, '#6a3e20', 1.5); }
            // a hook for the rubber chicken
            line(x, [[612, 120], [620, 120]], 4);
            // hanging lamp
            line(x, [[512, 44], [512, 80]], 2);
            poly(x, [[492, 80], [532, 80], [544, 104], [480, 104]], '#2a5a3a', 2);
            oval(x, 512, 108, 10, 6, '#fff0a0', 1.5);
        },

        selo(x) {
            sky(x, 230);
            sunFace(x, 880, 72, 34);
            cloud(x, 200, 60, 140); cloud(x, 560, 90, 110);
            fields(x, 200, 280, 11);
            // the road through the village
            rect(x, 0, 280, W, H - 280, '#7ab84a');
            grass(x, 290, 400, 4);
            poly(x, [[0, 400], [W, 392], [W, H], [0, H]], '#c8a46a', 0);
            poly(x, [[0, 400], [W, 392], [W, H], [0, H]], null, 2);
            const R = rng(8);
            for (let i = 0; i < 80; i++) oval(x, R() * W, 410 + R() * 130, 4 + R() * 6, 2 + R() * 2, '#a8844a', 0);
            for (let i = 0; i < 16; i++) line(x, [[i * 70 + R() * 30, 420 + R() * 110], [i * 70 + 40 + R() * 30, 420 + R() * 110]], 1.5, '#a07a40');
            // the chapel, left
            poly(x, [[60, 380], [60, 210], [250, 210], [250, 380]], '#f8f4ea', 2.5);
            poly(x, [[40, 214], [155, 130], [270, 214]], '#c8402a', 2.5);
            poly(x, [[130, 210], [130, 90], [180, 90], [180, 210]], '#f8f4ea', 2.5);
            poly(x, [[122, 94], [155, 30], [188, 94]], '#c8402a', 2.5);
            line(x, [[155, 30], [155, 8]], 3); line(x, [[146, 16], [164, 16]], 3);
            poly(x, [[146, 150], [146, 124], [155, 114], [164, 124], [164, 150]], '#3a2a20', 2);
            oval(x, 155, 138, 6, 7, '#e8c040', 1.5);
            poly(x, [[124, 380], [124, 312], [155, 290], [186, 312], [186, 380]], '#6a3e20', 2.5);
            line(x, [[155, 298], [155, 380]], 2);
            poly(x, [[80, 280], [80, 248], [100, 236], [100, 280]], '#8ac8f0', 2);
            poly(x, [[210, 280], [210, 236], [230, 248], [230, 280]], '#8ac8f0', 2);
            // the tavern, right
            hiza(x, 720, 230, 280, 158, { roof: '#b8402a' });
            rect(x, 820, 308, 64, 80, '#6a3e20', 2.5);
            oval(x, 872, 350, 4, 4, '#e8c040', 1);
            rect(x, 744, 290, 50, 44, '#8ac8f0', 2.5); line(x, [[769, 290], [769, 334]], 2.5, '#5a3418');
            rect(x, 916, 290, 50, 44, '#8ac8f0', 2.5); line(x, [[941, 290], [941, 334]], 2.5, '#5a3418');
            for (const fx of [744, 916]) { rect(x, fx - 4, 334, 58, 10, '#7a4a26', 2); for (let i = 0; i < 4; i++) flower(x, fx + 6 + i * 13, 330, 4, '#d42020', '#f2c030'); }
            rect(x, 744, 184, 232, 42, '#f8f2e0', 2.5);
            text(x, 'BIRTIJA KOD CINOBERA', 860, 205, 15, '#c02020');
            // the đeram well in the middle of the village
            line(x, [[470, 400], [470, 230]], 12, INK); line(x, [[470, 400], [470, 230]], 8, '#7a5230');
            poly(x, [[462, 236], [470, 218], [478, 236]], '#7a5230', 2);
            line(x, [[350, 196], [600, 262]], 9, INK); line(x, [[350, 196], [600, 262]], 5, '#a87a4a');
            rect(x, 590, 256, 18, 22, '#5a5a5a', 2);
            line(x, [[352, 197], [352, 340]], 2);
            rect(x, 342, 340, 20, 18, '#8a5a30', 2);
            poly(x, [[310, 360], [400, 360], [404, 410], [306, 410]], '#d8d0c0', 2.5);
            for (let i = 0; i < 4; i++) line(x, [[306, 372 + i * 12], [404, 372 + i * 12]], 1.2, '#9a9080');
            oval(x, 355, 360, 46, 8, '#3a5a7a', 2);
            // the old walnut where Đuka loafs
            tree(x, 640, 394, 280, 120, 21, '#3f8a34');
            rect(x, 636, 374, 46, 42, '#7a5230', 2.5);
            oval(x, 659, 374, 23, 7, '#c8a070', 2.5);
            oval(x, 659, 374, 12, 3.5, null, 1.2, '#8a6a40');
            // fences, sunflowers, a bench under the tree
            fence(x, 260, 330, 396, 40);
            fence(x, 600, 710, 396, 36);
            sunflower(x, 270, 392, 70); sunflower(x, 296, 392, 86); sunflower(x, 700, 392, 64);
            // signposts at the edges
            rect(x, 12, 340, 8, 64, '#6a3e20', 1.5);
            poly(x, [[4, 340], [90, 340], [104, 352], [90, 364], [4, 364]], '#f2e8c8', 2);
            text(x, '← Regica', 52, 352, 12, '#5a3418');
            rect(x, 1000, 400, 8, 64, '#6a3e20', 1.5);
            poly(x, [[1016, 400], [930, 400], [916, 412], [930, 424], [1016, 424]], '#f2e8c8', 2);
            text(x, 'Polje →', 968, 412, 12, '#5a3418');
        },

        kapelica(x) {
            // whitewashed walls under a blue painted vault with gold stars
            rect(x, 0, 0, W, H, '#f6f0e0');
            poly(x, [[0, 0], [W, 0], [W, 80], [512, 140], [0, 80]], '#2a4a8a', 2.5);
            const R = rng(3);
            for (let i = 0; i < 40; i++) {
                const sx = R() * W, sy = R() * 100;
                if (sy < 80 - Math.abs(sx - 512) / 512 * -60) text(x, '★', sx, sy * (0.7 + 0.3 * (1 - Math.abs(sx - 512) / 512)), 12, '#f2c830');
            }
            line(x, [[0, 80], [512, 140], [W, 80]], 3);
            // side walls in perspective
            poly(x, [[0, 80], [130, 120], [130, 400], [0, 470]], '#ebe2cc', 2.5);
            poly(x, [[W, 80], [894, 120], [894, 400], [W, 470]], '#ebe2cc', 2.5);
            // floor of red tiles
            poly(x, [[0, 470], [130, 400], [894, 400], [W, 470], [W, H], [0, H]], '#b8603a', 0);
            for (let i = -8; i <= 8; i++) line(x, [[512 + i * 48, 400], [512 + i * 130, H]], 1.2, '#8a4020');
            for (const yy of [420, 446, 478, 516]) line(x, [[0, yy], [W, yy]], 1.2, '#8a4020');
            line(x, [[0, 470], [130, 400], [894, 400], [W, 470]], 2.5);
            // the altar
            poly(x, [[400, 400], [400, 300], [624, 300], [624, 400]], '#f8f4ea', 2.5);
            rect(x, 390, 292, 244, 14, '#d8c8a0', 2);
            poly(x, [[430, 400], [430, 320], [594, 320], [594, 400]], '#c02020', 1.5);
            for (let i = 0; i < 6; i++) line(x, [[436 + i * 28, 320], [436 + i * 28, 400]], 2, '#f2c830');
            // the cross, the altar picture of the Virgin and the candles
            poly(x, [[470, 280], [470, 150], [554, 150], [554, 280]], '#b8862a', 3);
            rect(x, 478, 158, 68, 114, '#7ab0e0', 2);
            oval(x, 512, 190, 12, 14, '#f4c6a0', 1.5);
            oval(x, 512, 176, 18, 5, '#f2d050', 1.5);
            poly(x, [[496, 204], [528, 204], [540, 270], [484, 270]], '#2a4a9a', 1.5);
            for (const cx of [420, 604]) {
                rect(x, cx - 5, 250, 10, 42, '#f8f4e0', 1.5);
                poly(x, [[cx, 236], [cx - 5, 246], [cx, 252], [cx + 5, 246]], '#f8a020', 1);
            }
            // painted garlands
            for (let i = 0; i < 14; i++) flower(x, 180 + i * 48, 116 - Math.sin(i / 13 * Math.PI) * -10, 5, i % 2 ? '#d42020' : '#2a5ab0', '#f2c030');
            // stained window on the right wall
            poly(x, [[930, 170], [990, 150], [990, 320], [930, 310]], '#3a2210', 2.5);
            const cols = ['#d42020', '#2a5ab0', '#f2c830', '#3a8a3a'];
            for (let i = 0; i < 4; i++) for (let k = 0; k < 2; k++) poly(x, [[934 + k * 28, 176 + i * 34 - k * 8], [962 + k * 26, 168 + i * 34 - k * 8], [962 + k * 26, 200 + i * 34 - k * 8], [934 + k * 28, 208 + i * 34 - k * 8]], cols[(i + k) % 4], 1.2);
            // the door out, on the left wall, standing open to the sunlight
            poly(x, [[24, 220], [100, 190], [100, 420], [24, 458]], '#6a3e20', 3);
            poly(x, [[32, 228], [94, 202], [94, 414], [32, 446]], '#bde4ff', 2);
            poly(x, [[32, 400], [94, 380], [94, 414], [32, 446]], '#7ab84a', 0);
            // a donation box and a stand of candles
            rect(x, 780, 330, 60, 70, '#7a4a26', 2.5); rect(x, 798, 336, 24, 4, INK);
            text(x, 'MILODAR', 810, 366, 9, '#f2c830');
            rect(x, 200, 340, 100, 12, '#5a3418', 2); rect(x, 246, 352, 8, 48, '#5a3418', 1.5);
            for (let i = 0; i < 5; i++) { rect(x, 212 + i * 18, 318, 6, 22, '#f8f4e0', 1); oval(x, 215 + i * 18, 313, 3, 5, '#f8a020', 0.8); }
        },

        dvoriste(x) {
            sky(x, 220, '#6aaee8', '#e0f0f8');
            sunFace(x, 120, 70, 30);
            cloud(x, 420, 70, 120); cloud(x, 800, 50, 90);
            fields(x, 190, 260, 17);
            rect(x, 0, 260, W, H - 260, '#7ab84a');
            grass(x, 270, 420, 9);
            // packed earth of the yard
            poly(x, [[0, 410], [W, 410], [W, H], [0, H]], '#b8945a', 2);
            const R = rng(12);
            for (let i = 0; i < 70; i++) oval(x, R() * W, 420 + R() * 120, 3 + R() * 6, 2 + R() * 2, '#a07a40', 0);
            // Regica's house
            hiza(x, 70, 236, 440, 170, { roof: '#c8a050' });
            rect(x, 300, 250, 110, 76, '#8ac8f0', 3);
            line(x, [[355, 250], [355, 326]], 3, '#5a3418'); line(x, [[300, 288], [410, 288]], 3, '#5a3418');
            poly(x, [[286, 244], [312, 244], [300, 332], [290, 332]], '#d42020', 1.5);
            poly(x, [[424, 244], [398, 244], [410, 332], [420, 332]], '#d42020', 1.5);
            rect(x, 290, 326, 130, 10, '#7a4a26', 2);
            rect(x, 120, 300, 80, 106, '#6a3e20', 2.5);
            oval(x, 186, 352, 4, 4, '#e8c040', 1);
            for (let i = 0; i < 5; i++) flower(x, 228 + i * 14, 396, 5, i % 2 ? '#d42020' : '#f2c030', '#6a3418');
            // the barn
            poly(x, [[620, 410], [620, 200], [960, 200], [960, 410]], '#9a6a3a', 2.5);
            for (let i = 1; i < 14; i++) line(x, [[620 + i * 26, 200], [620 + i * 26, 410]], 1.6, '#6a4220');
            poly(x, [[600, 206], [790, 90], [980, 206]], '#7a5a3a', 2.5);
            for (let i = 0; i < 9; i++) line(x, [[620 + i * 40, 200], [700 + i * 20, 130]], 1.2, '#5a3a20');
            rect(x, 712, 256, 152, 156, '#5a3418', 2.5);
            poly(x, [[756, 170], [824, 170], [824, 196], [756, 196]], '#3a2210', 2);
            rect(x, 770, 176, 40, 14, '#e8c870', 0);
            // Garo's kennel
            poly(x, [[468, 440], [468, 392], [508, 364], [548, 392], [548, 440]], '#a8603a', 2.5);
            poly(x, [[460, 396], [508, 358], [556, 396]], '#6a3a20', 2.5);
            poly(x, [[492, 440], [492, 410], [508, 400], [524, 410], [524, 440]], '#2a1a10', 2);
            text(x, 'GARO', 508, 386, 9, '#f8f0e0');
            // a laundry line and a hay cart
            line(x, [[540, 270], [610, 260]], 1.6);
            poly(x, [[552, 268], [570, 266], [568, 300], [554, 300]], '#f8f8f0', 1.2);
            poly(x, [[580, 264], [598, 262], [598, 292], [580, 294]], '#d42020', 1.2);
            fence(x, 0, 60, 430, 44);
            fence(x, 960, W, 430, 44);
            sunflower(x, 990, 420, 90);
            rect(x, 1000, 300, 8, 64, '#6a3e20', 1.5);
            poly(x, [[1016, 300], [940, 300], [926, 312], [940, 324], [1016, 324]], '#f2e8c8', 2);
            text(x, 'Selo →', 972, 312, 12, '#5a3418');
        },

        polje(x) {
            sky(x, 200, '#5aa0e0', '#e8f4f8');
            sunFace(x, 520, 64, 30);
            cloud(x, 160, 80, 120); cloud(x, 820, 60, 150);
            fields(x, 180, 230, 21);
            // rows of tall maize across the middle
            rect(x, 0, 230, W, H - 230, '#7ab84a');
            const R = rng(31);
            for (let row = 0; row < 3; row++) {
                const by = 280 + row * 34;
                for (let cx = -10 + row * 12; cx < W; cx += 24) {
                    if (row === 2 && cx > 300 && cx < 470) continue;
                    const h = 70 + R() * 20;
                    line(x, [[cx, by], [cx + 2, by - h]], 4, INK); line(x, [[cx, by], [cx + 2, by - h]], 2.4, '#5a9a2a');
                    oval(x, cx - 8, by - h * 0.5, 11, 3.5, '#6aaa3a', 1, INK, 0.5);
                    oval(x, cx + 10, by - h * 0.65, 11, 3.5, '#6aaa3a', 1, INK, -0.5);
                    if (R() < 0.5) oval(x, cx + 5, by - h * 0.45, 4, 9, '#f2d050', 1, INK, 0.3);
                    line(x, [[cx + 2, by - h], [cx - 4, by - h - 10]], 1.6, '#d8b850');
                }
            }
            // the scarecrow in Dudek's old coat
            line(x, [[386, 384], [386, 214]], 7, INK); line(x, [[386, 384], [386, 214]], 4, '#8a6a40');
            line(x, [[338, 262], [434, 258]], 7, INK); line(x, [[338, 262], [434, 258]], 4, '#8a6a40');
            poly(x, [[350, 254], [422, 252], [414, 330], [358, 332]], '#25222c', 2.5);
            poly(x, [[340, 256], [352, 254], [354, 290], [336, 292]], '#25222c', 2);
            poly(x, [[432, 254], [420, 252], [418, 288], [436, 290]], '#25222c', 2);
            for (const [a, b] of [[336, 292], [436, 290]]) for (let i = -1; i <= 1; i++) line(x, [[a, b], [a + i * 5, b + 12]], 2, '#e0c060');
            rect(x, 368, 286, 18, 16, '#c8241c', 1.5);
            oval(x, 386, 232, 20, 22, '#d8c090', 2.5);
            line(x, [[376, 228], [382, 224]], 2); line(x, [[376, 224], [382, 228]], 2);
            line(x, [[392, 228], [398, 224]], 2); line(x, [[392, 224], [398, 228]], 2);
            line(x, [[376, 242], [384, 246], [396, 242]], 2);
            poly(x, [[366, 216], [372, 196], [400, 196], [406, 216]], '#1d1a18', 2);
            oval(x, 386, 216, 30, 5, '#1d1a18', 2);
            for (let i = 0; i < 3; i++) { oval(x, 300 + i * 160, 150 + (i % 2) * 20, 9, 3, INK, 0, INK, 0); line(x, [[290 + i * 160, 146 + (i % 2) * 20], [300 + i * 160, 150 + (i % 2) * 20], [310 + i * 160, 146 + (i % 2) * 20]], 2.5); }
            // the path and the stubble field in front
            poly(x, [[0, 380], [W, 380], [W, H], [0, H]], '#c8b070', 2);
            for (let i = 0; i < 14; i++) line(x, [[0, 396 + i * 11], [W, 396 + i * 11]], 1, 'rgba(120,90,40,0.35)');
            for (let i = 0; i < 200; i++) { const sx = R() * W, sy = 390 + R() * 150; line(x, [[sx, sy], [sx + 1, sy - 6]], 1.4, '#a08040'); }
            // a haystack
            poly(x, [[820, 382], [840, 300], [880, 270], [920, 300], [940, 382]], '#e0c060', 2.5);
            for (let i = 0; i < 18; i++) line(x, [[836 + R() * 90, 300 + R() * 70], [840 + R() * 90, 310 + R() * 70]], 1.2, '#b89030');
            line(x, [[880, 270], [880, 250]], 3);
            // the poppies
            for (let i = 0; i < 26; i++) {
                const px = 70 + R() * 200, py = 430 + R() * 90;
                line(x, [[px, py + 14], [px + 2, py]], 2, '#3a7a2a');
                for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; oval(x, px + Math.cos(a) * 5, py + Math.sin(a) * 5, 5, 5, '#e02020', 0.8); }
                oval(x, px, py, 3, 3, '#1a1a1a', 0);
            }
            // the stone with a face and a beard
            poly(x, [[660, 440], [664, 392], [690, 370], [730, 368], [758, 392], [764, 440]], '#9a9a90', 2.5);
            oval(x, 694, 398, 6, 4, '#5a5a50', 1.5); oval(x, 728, 398, 6, 4, '#5a5a50', 1.5);
            poly(x, [[708, 400], [714, 416], [704, 418]], '#8a8a80', 1.5);
            line(x, [[698, 428], [726, 428]], 2);
            poly(x, [[690, 432], [736, 432], [728, 446], [712, 452], [696, 446]], '#7a7a70', 1.5);
            // signposts
            rect(x, 12, 330, 8, 64, '#6a3e20', 1.5);
            poly(x, [[4, 330], [80, 330], [94, 342], [80, 354], [4, 354]], '#f2e8c8', 2);
            text(x, '← Selo', 46, 342, 12, '#5a3418');
            rect(x, 1000, 330, 8, 64, '#6a3e20', 1.5);
            poly(x, [[1016, 330], [936, 330], [922, 342], [936, 354], [1016, 354]], '#f2e8c8', 2);
            text(x, 'Drava →', 972, 342, 12, '#5a3418');
        },

        obala(x) {
            sky(x, 220, '#5a98d8', '#f0e8d0');
            sunFace(x, 160, 70, 30);
            cloud(x, 480, 60, 130); cloud(x, 860, 90, 100);
            // far bank with willows
            rect(x, 0, 200, W, 40, '#6a9a4a');
            for (let i = 0; i < 14; i++) willow(x, 30 + i * 76, 236, 70 + (i % 3) * 12, 40 + i);
            water(x, 236, 400, 7);
            // the ada, out in the river, with the inspector's tent and the yellow digger
            poly(x, [[580, 270], [620, 252], [860, 250], [920, 270], [880, 282], [600, 284]], '#e0cc90', 2);
            willow(x, 640, 262, 56, 77); willow(x, 690, 258, 48, 78);
            poly(x, [[740, 256], [760, 230], [780, 256]], '#f0f0e0', 1.5);
            rect(x, 810, 240, 30, 16, '#f2c020', 1.5); line(x, [[836, 242], [856, 226], [866, 250]], 3, '#f2c020');
            // the near bank
            poly(x, [[0, 400], [80, 392], [300, 396], [520, 388], [760, 396], [W, 392], [W, H], [0, H]], '#d8c088', 2.5);
            grass(x, 440, 540, 14, '#6a9a3a');
            const R = rng(19);
            for (let i = 0; i < 40; i++) oval(x, R() * W, 410 + R() * 120, 3 + R() * 6, 2 + R() * 2, '#b8a068', 0);
            // reeds
            for (let i = 0; i < 30; i++) {
                const rx = 380 + R() * 300, ry = 400 + R() * 10;
                line(x, [[rx, ry], [rx + (R() - 0.5) * 10, ry - 40 - R() * 30]], 2, '#6a8a3a');
                if (R() < 0.4) oval(x, rx + 1, ry - 50, 3, 9, '#6a4428', 1);
            }
            // Jaga's washing plank and basket
            poly(x, [[150, 400], [330, 400], [336, 412], [146, 412]], '#a87a4a', 2);
            rect(x, 160, 412, 10, 30, '#6a3e20', 1.5); rect(x, 310, 412, 10, 30, '#6a3e20', 1.5);
            poly(x, [[60, 440], [130, 440], [122, 480], [68, 480]], '#c8a050', 2.5);
            for (let i = 0; i < 5; i++) line(x, [[64, 448 + i * 7], [126, 448 + i * 7]], 1.2, '#8a6a20');
            oval(x, 95, 438, 32, 8, '#f8f8f0', 1.5);
            // the ferry rope over the river, posts on our bank
            line(x, [[880, 330], [700, 262]], 2, '#5a4a30');
            rect(x, 980, 340, 14, 70, '#6a3e20', 2);
            line(x, [[987, 344], [880, 330]], 2, '#5a4a30');
            willow(x, 40, 410, 160, 90);
            willow(x, 1000, 400, 120, 91);
            rect(x, 20, 330, 8, 64, '#6a3e20', 1.5);
            poly(x, [[12, 330], [88, 330], [102, 342], [88, 354], [12, 354]], '#f2e8c8', 2);
            text(x, '← Polje', 54, 342, 12, '#5a3418');
        },

        ada(x) {
            sky(x, 200, '#e88a4a', '#f8e0a0');
            sunFace(x, 200, 90, 32, '#f8b830');
            cloud(x, 600, 60, 120);
            rect(x, 0, 180, W, 30, '#6a8a4a');
            for (let i = 0; i < 12; i++) willow(x, 40 + i * 90, 206, 50 + (i % 3) * 10, 60 + i);
            water(x, 206, 360, 13);
            // the island's sand
            poly(x, [[0, 380], [120, 350], [400, 354], [700, 346], [W, 356], [W, H], [0, H]], '#e8d298', 2.5);
            const R = rng(23);
            for (let i = 0; i < 60; i++) oval(x, R() * W, 370 + R() * 170, 2 + R() * 4, 1 + R() * 2, '#c8b070', 0);
            willow(x, 380, 380, 150, 70);
            // the inspector's tent
            poly(x, [[560, 400], [660, 250], [760, 400]], '#e8e0c8', 2.5);
            poly(x, [[660, 250], [700, 400], [760, 400]], '#d0c8a8', 2);
            poly(x, [[636, 400], [660, 320], [684, 400]], '#3a3020', 2);
            line(x, [[660, 250], [660, 230]], 2.5); poly(x, [[660, 230], [690, 236], [660, 244]], '#c02020', 1.5);
            // a sign: the planned gravel works
            rect(x, 474, 260, 8, 120, '#6a3e20', 1.5);
            rect(x, 420, 210, 120, 70, '#f8f8f0', 2.5);
            text(x, 'KOMBINAT', 480, 228, 13, '#c02020');
            text(x, 'ŠLJUNKA', 480, 246, 13, '#c02020');
            text(x, 'Investitor:', 480, 262, 9, '#3a3a3a');
            text(x, 'Drug Direktor', 480, 273, 9, '#3a3a3a');
            // the inspector's folding table
            poly(x, [[226, 380], [376, 380], [384, 394], [218, 394]], '#9aa0a8', 2);
            line(x, [[236, 394], [228, 440]], 3); line(x, [[366, 394], [374, 440]], 3);
            rect(x, 300, 366, 30, 14, '#f8f8f0', 1.2);
            // the ferry post
            rect(x, 30, 330, 14, 70, '#6a3e20', 2);
            line(x, [[37, 334], [300, 280]], 2, '#5a4a30');
        },
    };

    function ensure(scene, id) {
        const key = 'bg_' + id;
        if (scene.textures.exists(key)) return key;
        const [c, x] = canvas(W, H);
        ROOMS[id](x);
        scene.textures.addCanvas(key, c);
        return key;
    }

    return { ensure, ROOMS };
})();
