# Minutka

A silly timer for lightning talks. Open `index.html` and pick 1, 3 or 10 minutes, or type a custom time as `MM:SS` (plain minutes and `.` / `,` as the separator work too). You get one of 20 random animations that shows progress without any numbers. When time is up, the animation plays its finale and a matching sound. After 10 seconds a silent "over budget" clock takes over and gets more alarming the longer you run over.

Plain HTML/CSS/JS, no build step, works from `file://`. three.js r128 is loaded from cdnjs for the 3D scenes. If it doesn't load, those three animations are skipped.

Keys: `1` / `3` / `0` start 1 / 3 / 10 minutes · `F` fullscreen · `Esc` back to the menu.

## Testing an animation

Query parameters:

| param | meaning |
| --- | --- |
| `anim=<id>` | force one animation |
| `dur=<seconds>` | override the duration of every button |
| `at=<fraction>` | start part-way through (`0.9` = near the end, `1` = finale now) |
| `autostart=1` | start without a click (sound stays muted) |

Example: `index.html?anim=disco&dur=20&at=0.8`, then click any button.

Animation ids: `train bomb balloon shark chomper blocks sunset snail ufo cat popcorn penguin egg domino pizza duck rocket coaster disco volcano`. The 3D ones are `rocket`, `coaster` and `disco`.

## Adding an animation

Create `js/anims/<id>.js`, add a `<script>` tag to `index.html`, and register it:

```js
Minutka.register({
  id, name, emoji, needs3d,
  create(stage, sfx) {
    return { update(p, t, dt, ft) {}, finale() {}, destroy() {} };
  },
});
```

- `p` is progress from 0 to 1.
- `t` is wall-clock seconds, for idle motion.
- `ft` is seconds since time-up, or `-1` before that.
- Use `Minutka.canvas(stage)` or `Minutka.three(stage)` for drawing, and the `sfx` helpers for synthesized sound.
- `js/anims/train.js` is the reference implementation.
