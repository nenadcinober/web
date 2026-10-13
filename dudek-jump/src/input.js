// One controller for keyboard, gamepad and the on-screen touch pad: held directions plus
// edge-triggered buttons.
const TouchPad = { state: { left: false, right: false, throw: false, start: false } };

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
    root.addEventListener('pointerdown', e => { e.preventDefault(); pointers.set(e.pointerId, target(e)); refresh(); wakeAudio(); });
    window.addEventListener('pointermove', e => { if (pointers.has(e.pointerId)) { pointers.set(e.pointerId, target(e)); refresh(); } });
    const up = e => { if (pointers.delete(e.pointerId)) refresh(); };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
})();

// Browsers only let audio start from a user gesture; the first key or tap starts whatever
// tune the current scene asked for.
let wantedMusic = null;
function playMusic(name) { wantedMusic = name; if (Sound.ready) Sound.music(name); }
function wakeAudio() {
    if (Sound.ready) return;
    Sound.init();
    if (wantedMusic) Sound.music(wantedMusic);
}
window.addEventListener('keydown', wakeAudio);
window.addEventListener('pointerdown', wakeAudio);

const KEYMAP = {
    left: ['LEFT', 'A'], right: ['RIGHT', 'D'],
    throw: ['UP', 'W', 'SPACE', 'X', 'K'], start: ['ENTER', 'P', 'ESC'], mute: ['M'],
};

class Controller {
    constructor(scene) {
        this.scene = scene;
        this.keys = {};
        // a tap that goes down and up between two frames is still a press
        this.latch = {};
        for (const a in KEYMAP) this.keys[a] = KEYMAP[a].map(k => {
            const key = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[k], true, false);
            key.on('down', () => { this.latch[a] = true; });
            return key;
        });
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
            now.left = now.left || pad.left || ax < -0.3;
            now.right = now.right || pad.right || ax > 0.3;
            now.throw = now.throw || b(0) || b(1) || b(2) || b(3);
            now.start = now.start || b(9);
            this.analog = Math.abs(ax) > 0.3 ? ax : 0;
        } else this.analog = 0;
        for (const k in TouchPad.state) now[k] = now[k] || TouchPad.state[k];
        for (const a in KEYMAP) {
            this.pressed[a] = (!!now[a] && !this.prev[a]) || !!this.latch[a];
            this.latch[a] = false;
            this.held[a] = !!now[a];
            this.prev[a] = !!now[a];
        }
        this.mx = this.analog || ((this.held.right ? 1 : 0) - (this.held.left ? 1 : 0));
        if (this.pressed.mute) Sound.toggleMute();
    }

    anyPressed() { return this.pressed.throw || this.pressed.start; }
}
