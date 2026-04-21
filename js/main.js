/* ==========================================================================
   main.js — entry point. Registers screens, wires the tab bar, boots home.
   ========================================================================== */

import { getEl, querySelAll } from './utils.js';
import { getSettings, setSetting } from './storage.js';
import { registerScreen, registerTab, go } from './router.js';

import { renderHome } from './screens/home.js';
import { renderRecipes } from './screens/recipes.js';
import { renderHistory } from './screens/history.js';
import { renderSettings } from './screens/settings.js';

import { renderDilution } from './screens/dilution.js';
import { renderConcentration } from './screens/concentration.js';
import { renderReconstitution } from './screens/reconstitution.js';
import { renderSeeding } from './screens/seeding.js';
import { renderSerial } from './screens/serial.js';
import { renderBuilder } from './screens/builder.js';

/* ---------- Theme ---------- */
function applyTheme(theme) {
  const wantsDark = theme === 'dark' ||
    (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', wantsDark);
  getEl('icon-sun').style.display  = wantsDark ? 'none'  : 'block';
  getEl('icon-moon').style.display = wantsDark ? 'block' : 'none';
}

function initTheme() {
  const { theme } = getSettings();
  applyTheme(theme);

  getEl('theme-toggle').addEventListener('click', () => {
    const cur = getSettings().theme;
    // Cycle: auto → light → dark → auto
    const next = cur === 'auto' ? 'light' : cur === 'light' ? 'dark' : 'auto';
    setSetting('theme', next);
    applyTheme(next);
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getSettings().theme === 'auto') applyTheme('auto');
  });
}

/* ---------- Screens ---------- */
function registerAllScreens() {
  registerScreen('home',           { el: getEl('screen-home'),           render: () => renderHome(getEl('screen-home')),                       onEnter: () => renderHome(getEl('screen-home')) });
  registerScreen('recipes',        { el: getEl('screen-recipes'),        render: () => renderRecipes(getEl('screen-recipes')),                 onEnter: () => renderRecipes(getEl('screen-recipes')) });
  registerScreen('history',        { el: getEl('screen-history'),        render: () => renderHistory(getEl('screen-history')),                 onEnter: () => renderHistory(getEl('screen-history')) });
  registerScreen('settings',       { el: getEl('screen-settings'),       render: () => renderSettings(getEl('screen-settings')) });

  registerScreen('dilution',       { el: getEl('screen-dilution'),       render: () => renderDilution(getEl('screen-dilution')) });
  registerScreen('concentration',  { el: getEl('screen-concentration'),  render: () => renderConcentration(getEl('screen-concentration')) });
  registerScreen('reconstitution', { el: getEl('screen-reconstitution'), render: () => renderReconstitution(getEl('screen-reconstitution')) });
  registerScreen('seeding',        { el: getEl('screen-seeding'),        render: () => renderSeeding(getEl('screen-seeding')) });
  registerScreen('serial',         { el: getEl('screen-serial'),         render: () => renderSerial(getEl('screen-serial')) });
  registerScreen('builder',        { el: getEl('screen-builder'),        render: (ctx) => renderBuilder(getEl('screen-builder'), ctx),           onEnter: () => renderBuilder(getEl('screen-builder')) });
}

/* ---------- Tab bar ---------- */
function wireTabs() {
  querySelAll('.tab').forEach(btn => {
    registerTab(btn.dataset.target, btn);
    btn.addEventListener('click', () => go(btn.dataset.target));
  });
}

/* ---------- Horizontal swipe between top-level tabs ----------
   Swipe left → next tab; swipe right → previous tab. Only active when the
   currently-visible screen is one of the 4 top-level tabs (not a calculator
   screen — swipe there would collide with horizontally-scrolling content). */
const TAB_ORDER = ['home', 'recipes', 'history', 'settings'];

function wireSwipes() {
  const el = document.getElementById('screens');
  let startX = 0, startY = 0, startT = 0, tracking = false;

  el.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    startT = Date.now();
    tracking = true;
  }, { passive: true });

  el.addEventListener('touchend', (e) => {
    if (!tracking) return;
    tracking = false;
    const t = (e.changedTouches && e.changedTouches[0]) || null;
    if (!t) return;
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    const dt = Date.now() - startT;

    // Must be a decisive horizontal swipe — bigger than 60px, mostly horizontal,
    // under 600ms.
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.7 || dt > 600) return;

    // Only swipe between top-level tabs — otherwise calculator screens with
    // horizontal carousels (preset chips) would misfire.
    const cur = currentTopTabId();
    if (cur === null) return;

    const nextIx = dx < 0 ? cur + 1 : cur - 1;
    if (nextIx < 0 || nextIx >= TAB_ORDER.length) return;
    go(TAB_ORDER[nextIx]);
  }, { passive: true });
}

function currentTopTabId() {
  const active = document.querySelector('.screen.active');
  if (!active) return null;
  const id = active.dataset.screen;
  const ix = TAB_ORDER.indexOf(id);
  return ix >= 0 ? ix : null;
}

/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  registerAllScreens();
  wireTabs();
  wireSwipes();
  go('home');
});
