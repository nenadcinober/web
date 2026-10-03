// Unified controls: keyboard layouts + gamepads + on-screen touch pad, read as one Controller per
// player with held directions and edge-triggered buttons.
const TouchPad = { state: { up: false, down: false, left: false, right: false, punch: false, kick: false, jump: false, start: false } };

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
    root.addEventListener('pointerdown', e => { e.preventDefault(); pointers.set(e.pointerId, target(e)); refresh(); if (window.Sound) Sound.init(); });
    window.addEventListener('pointermove', e => { if (pointers.has(e.pointerId)) { pointers.set(e.pointerId, target(e)); refresh(); } });
    const up = e => { if (pointers.delete(e.pointerId)) refresh(); };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
})();

const LAYOUTS = {
    solo: { up: ['W', 'UP'], down: ['S', 'DOWN'], left: ['A', 'LEFT'], right: ['D', 'RIGHT'],
            punch: ['J', 'Z'], kick: ['K', 'X'], jump: ['L', 'C', 'SPACE'], start: ['ENTER'] },
    p1:   { up: ['W'], down: ['S'], left: ['A'], right: ['D'], punch: ['J'], kick: ['K'], jump: ['L', 'SPACE'], start: ['ENTER'] },
    p2:   { up: ['UP'], down: ['DOWN'], left: ['LEFT'], right: ['RIGHT'],
            punch: ['NUMPAD_ONE', 'COMMA'], kick: ['NUMPAD_TWO', 'PERIOD'], jump: ['NUMPAD_THREE', 'FORWARD_SLASH'], start: ['NUMPAD_ZERO'] },
};
const BUTTONS = ['punch', 'kick', 'jump', 'start'];

class Controller {
    constructor(scene, index, layoutName) {
        this.scene = scene;
        this.index = index;
        this.keys = {};
        const layout = LAYOUTS[layoutName];
        for (const action in layout) {
            this.keys[action] = layout[action].map(k => scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[k], true, false));
        }
        this.held = {}; this.prev = {}; this.pressed = {};
        this.touch = index === 0;
    }

    update() {
        const pad = this.scene.input.gamepad && this.scene.input.gamepad.total ? this.scene.input.gamepad.getPad(this.index) : null;
        const now = {};
        for (const action in this.keys) now[action] = this.keys[action].some(k => k.isDown);
        if (pad && pad.connected) {
            const ax = pad.axes.length ? pad.axes[0].getValue() : 0, ay = pad.axes.length > 1 ? pad.axes[1].getValue() : 0;
            now.left = now.left || pad.left || ax < -0.4;
            now.right = now.right || pad.right || ax > 0.4;
            now.up = now.up || pad.up || ay < -0.4;
            now.down = now.down || pad.down || ay > 0.4;
            const b = i => pad.buttons[i] && pad.buttons[i].pressed;
            now.punch = now.punch || b(2) || b(4);
            now.kick = now.kick || b(1) || b(5);
            now.jump = now.jump || b(0) || b(3);
            now.start = now.start || b(9);
        }
        if (this.touch) for (const k in TouchPad.state) now[k] = now[k] || TouchPad.state[k];
        for (const k of ['up', 'down', 'left', 'right', ...BUTTONS]) {
            this.pressed[k] = !!now[k] && !this.prev[k];
            this.held[k] = !!now[k];
            this.prev[k] = !!now[k];
        }
        this.mx = (this.held.right ? 1 : 0) - (this.held.left ? 1 : 0);
        this.mz = (this.held.down ? 1 : 0) - (this.held.up ? 1 : 0);
    }

    anyPressed() { return BUTTONS.some(b => this.pressed[b]); }
}
