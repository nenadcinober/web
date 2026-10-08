// One controller for keyboard, gamepad and the on-screen touch pad: held directions plus
// edge-triggered buttons.
const TouchPad = { state: { left: false, right: false, jump: false, run: false, start: false }, tapped: false };

(function setupTouch() {
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches);
    if (!isTouch) return;
    document.body.classList.add('touch');
    const pointers = new Map();
    const refresh = () => {
        for (const k in TouchPad.state) TouchPad.state[k] = false;
        document.querySelectorAll('#touch button').forEach(b => b.classList.remove('on'));
        for (const el of pointers.values()) {
            if (!el || !el.dataset.k) continue;
            TouchPad.state[el.dataset.k] = true;
            el.classList.add('on');
        }
    };
    const target = e => {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        return el && el.closest ? el.closest('#touch button') : null;
    };
    const root = document.getElementById('touch');
    root.addEventListener('pointerdown', e => { e.preventDefault(); pointers.set(e.pointerId, target(e)); refresh(); Sound.init(); });
    window.addEventListener('pointermove', e => { if (pointers.has(e.pointerId)) { pointers.set(e.pointerId, target(e)); refresh(); } });
    const up = e => { if (pointers.delete(e.pointerId)) refresh(); };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
})();

const KEYMAP = {
    left: ['LEFT', 'A'], right: ['RIGHT', 'D'], up: ['UP', 'W'], down: ['DOWN', 'S'],
    jump: ['SPACE', 'Z', 'K', 'UP', 'W'], run: ['X', 'J', 'SHIFT'], start: ['ENTER', 'P', 'ESC'], mute: ['M'],
};

class Controller {
    constructor(scene) {
        this.scene = scene;
        this.keys = {};
        for (const a in KEYMAP) this.keys[a] = KEYMAP[a].map(k => scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[k], true, false));
        this.held = {}; this.prev = {}; this.pressed = {};
        // the first press in a new scene must be a fresh one, not the key that left the last scene
        for (const a in KEYMAP) this.prev[a] = true;
        this.mx = 0;
    }

    update() {
        const now = {};
        for (const a in this.keys) now[a] = this.keys[a].some(k => k.isDown);
        const gp = this.scene.input.gamepad;
        const pad = gp && gp.total ? gp.getPad(0) : null;
        if (pad && pad.connected) {
            const ax = pad.axes.length ? pad.axes[0].getValue() : 0;
            const b = i => pad.buttons[i] && pad.buttons[i].pressed;
            now.left = now.left || pad.left || ax < -0.4;
            now.right = now.right || pad.right || ax > 0.4;
            now.down = now.down || pad.down;
            now.jump = now.jump || b(0) || b(1);
            now.run = now.run || b(2) || b(3);
            now.start = now.start || b(9);
        }
        for (const k in TouchPad.state) now[k] = now[k] || TouchPad.state[k];
        for (const a in KEYMAP) {
            this.pressed[a] = !!now[a] && !this.prev[a];
            this.held[a] = !!now[a];
            this.prev[a] = !!now[a];
        }
        this.mx = (this.held.right ? 1 : 0) - (this.held.left ? 1 : 0);
        if (this.pressed.mute) Sound.toggleMute();
    }

    anyPressed() { return this.pressed.jump || this.pressed.start || this.pressed.run; }
}
