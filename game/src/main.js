// WOK & WONDER: NIGHT MARKET RUSH — entry point.
// Boots the world on the title screen, runs a fixed-step simulation so the
// market behaves identically on every machine, translates world events
// into sounds, and draws every frame. A ?shot=<name> address freezes one
// staged scene instead — that is how the packaged screenshots are taken.

import { STEP, VIEW } from './config.js';
import { EVENT_BURNT, EVENT_DAY_OVER, EVENT_LOST, EVENT_READY, EVENT_RUSH, SCREEN_DAY_END, World } from './world.js';
import { drawFrame } from './render.js';
import { attachInput } from './input.js';
import { stageShot } from './shots.js';
import { soundBurnt, soundDayClear, soundLose, soundReady, soundRush } from './audio.js';

const canvas = document.getElementById('game');
canvas.width = VIEW.width;
canvas.height = VIEW.height;
const ctx = canvas.getContext('2d');

const world = new World(20261125);
attachInput(canvas, world);

const shotName = new URLSearchParams(window.location.search).get('shot');
const isShot = shotName !== null && stageShot(world, shotName);

let last = performance.now();
let accumulator = 0;

function frame(now) {
  const t = now / 1000;
  if (!isShot) {
    accumulator += Math.min(0.25, (now - last) / 1000);
    while (accumulator >= STEP) {
      const events = world.step(STEP);
      if (events & EVENT_READY) soundReady();
      if (events & EVENT_BURNT) soundBurnt();
      if (events & EVENT_LOST) soundLose();
      if (events & EVENT_RUSH) soundRush();
      if (events & EVENT_DAY_OVER) {
        if (world.screen === SCREEN_DAY_END) soundDayClear();
        else soundLose();
      }
      accumulator -= STEP;
    }
  }
  last = now;
  drawFrame(ctx, world, t);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
