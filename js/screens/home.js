/* ==========================================================================
   Home screen — tile grid of 6 calculators + Recipe Builder, plus an
   optional "Continue last recipe" hero card at the top.
   ========================================================================== */

import { createEl } from '../utils.js';
import { go } from '../router.js';
import { getLastRecipe } from '../storage.js';

const TILES = [
  { id: 'dilution',       icon: '💧',  tint: 'bg-coral',    title: 'Dilution',      sub: 'C₁V₁ = C₂V₂' },
  { id: 'concentration',  icon: '⚖️',  tint: 'bg-sage',     title: 'Concentration', sub: 'Solve mass · vol · conc' },
  { id: 'reconstitution', icon: '🧴',  tint: 'bg-sky',      title: 'Reconstitution',sub: 'Lyophilized powder' },
  { id: 'seeding',        icon: '🦠',  tint: 'bg-butter',   title: 'Seeding',       sub: 'Cells + plates' },
  { id: 'serial',         icon: '💉',  tint: 'bg-pink',     title: 'Serial Dosing', sub: 'Step-down dilutions' },
  { id: 'builder',        icon: '✨',  tint: 'recipe',      title: 'Recipe Builder',sub: 'Multi-ingredient mix' },
];

export function renderHome(host) {
  host.innerHTML = '';

  const greet = createEl('div', { class: 'greeting fade-in' }, [
    createEl('div', { class: 'eyebrow', text: greetingEyebrow() }),
    createEl('h1', { text: 'What are you making today?' }),
  ]);
  host.appendChild(greet);

  // Continue-last-recipe hero
  const last = getLastRecipe();
  if (last) {
    const ing = last.ingredients || [];
    const ingCount = ing.length;
    const vol = last.finalVolume && last.finalVolume.value != null
      ? `${last.finalVolume.value} ${last.finalVolume.unit || ''}`.trim()
      : '';
    const dil = last.diluent === 'custom' ? (last.customDiluent || 'custom') : (last.diluent || '');
    const hero = createEl('button', {
      class: 'continue-card fade-in',
      onclick: () => go('builder', { recipeId: last.id }),
    }, [
      createEl('div', { class: 'label', text: 'Continue recipe' }),
      createEl('h3', { text: last.name || 'Untitled' }),
      createEl('div', { class: 'meta' }, [
        createEl('span', { text: `${ingCount} ingredient${ingCount === 1 ? '' : 's'}` }),
        vol ? createEl('span', { text: vol }) : null,
        dil ? createEl('span', { text: dil }) : null,
      ]),
      createEl('div', { class: 'cta', text: 'Resume →' }),
    ]);
    host.appendChild(hero);
  }

  const head = createEl('div', { class: 'section-head' }, [
    createEl('h2', { text: 'Calculators' }),
  ]);
  host.appendChild(head);

  const grid = createEl('div', { class: 'tile-grid fade-in' });
  for (const t of TILES) {
    const tile = createEl('button', {
      class: 'tile' + (t.tint === 'recipe' ? ' tile-recipe' : ''),
      onclick: () => go(t.id),
    }, [
      createEl('div', { class: 'tile-icon ' + (t.tint === 'recipe' ? '' : t.tint), text: t.icon }),
      createEl('h3', { text: t.title }),
      createEl('p', { text: t.sub }),
    ]);
    grid.appendChild(tile);
  }
  host.appendChild(grid);
}

function greetingEyebrow() {
  const h = new Date().getHours();
  if (h < 5 || h >= 22) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
