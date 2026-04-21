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

/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  registerAllScreens();
  wireTabs();
  go('home');
});
