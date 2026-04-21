/* ==========================================================================
   Recipes screen — saved recipes + preset templates.
   ========================================================================== */

import { createEl } from '../utils.js';
import { greeting } from '../ui.js';
import { getRecipes, deleteRecipe } from '../storage.js';
import { PRESETS } from '../presets.js';
import { go } from '../router.js';
import { openBuilderWith } from './builder.js';

export function renderRecipes(host) {
  host.innerHTML = '';
  host.appendChild(greeting({ eyebrow: 'Library', title: 'Recipes' }));

  // New recipe CTA
  const newBtn = createEl('button', {
    class: 'btn-cta',
    style: { marginBottom: '20px', background: 'var(--coral)' },
    text: '+ New blank recipe',
    onclick: () => {
      go('builder');
      // Force-open blank
      openBuilderWith({});
    },
  });
  host.appendChild(newBtn);

  // User recipes section
  const userRecipes = getRecipes();
  host.appendChild(createEl('div', { class: 'section-head' }, [
    createEl('h2', { text: 'Your recipes' }),
    createEl('span', { class: 'see-all', text: `${userRecipes.length}` }),
  ]));

  if (userRecipes.length === 0) {
    host.appendChild(createEl('p', {
      style: { color: 'var(--ink-soft)', fontSize: '13.5px', padding: '12px 4px 16px' },
      text: 'Your saved recipes will appear here. Try a preset below to get started.',
    }));
  } else {
    userRecipes.forEach(r => host.appendChild(recipeCard(r, false)));
  }

  // Presets section
  host.appendChild(createEl('div', { class: 'section-head' }, [
    createEl('h2', { text: 'Templates' }),
    createEl('span', { class: 'see-all', text: 'From presets' }),
  ]));
  PRESETS.forEach(p => host.appendChild(presetCard(p)));
}

function recipeCard(r, isPreset) {
  const ingCount = (r.ingredients || []).length;
  const card = createEl('div', { class: 'ing-card', style: { cursor: 'pointer' } });
  const circle = createEl('div', { class: 'ing-circle bg-coral', text: r.icon || (r.name || '?')[0].toUpperCase() });
  const body = createEl('div', { class: 'ing-body' }, [
    createEl('div', { class: 'nm', text: r.name || 'Untitled' }),
    createEl('div', { class: 'sub', text: `${ingCount} ingredient${ingCount === 1 ? '' : 's'} · ${r.finalVolume.value} ${r.finalVolume.unit} · ${r.diluent === 'custom' ? (r.customDiluent || 'custom') : r.diluent}` }),
  ]);
  const right = createEl('div', { class: 'ing-amount' }, [
    createEl('div', { style: { fontSize: '11px', color: 'var(--ink-faint)', fontWeight: '700' }, text: fmtDate(r.updatedAt) }),
  ]);
  card.appendChild(circle);
  card.appendChild(body);
  card.appendChild(right);
  card.addEventListener('click', () => {
    go('builder');
    openBuilderWith({ recipeId: r.id });
  });

  if (!isPreset) {
    // Long-press or swipe to delete would be nicer; keep a tiny × for now.
    const del = createEl('button', {
      style: {
        background: 'transparent', border: 'none', color: 'var(--ink-faint)',
        cursor: 'pointer', padding: '6px', fontSize: '16px', fontFamily: 'inherit',
      },
      title: 'Delete',
      text: '×',
      onclick: (e) => {
        e.stopPropagation();
        if (confirm(`Delete "${r.name || 'this recipe'}"?`)) {
          deleteRecipe(r.id);
          renderRecipes(document.getElementById('screen-recipes'));
        }
      },
    });
    card.appendChild(del);
  }
  return card;
}

function presetCard(p) {
  const card = createEl('div', { class: 'ing-card', style: { cursor: 'pointer' } });
  const tint = hashTint(p.name);
  const circle = createEl('div', { class: `ing-circle ${tint}`, text: p.icon || (p.name || '?')[0].toUpperCase() });
  const body = createEl('div', { class: 'ing-body' }, [
    createEl('div', { class: 'nm', text: p.name }),
    createEl('div', { class: 'sub', text: `${(p.ingredients || []).length} ingredient(s) · ${p.finalVolume.value} ${p.finalVolume.unit} · ${p.diluent}` }),
  ]);
  const right = createEl('div', { class: 'ing-amount' }, [
    createEl('div', { style: { fontSize: '11px', color: 'var(--coral-deep)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }, text: 'Preset' }),
  ]);
  card.appendChild(circle);
  card.appendChild(body);
  card.appendChild(right);
  card.addEventListener('click', () => {
    go('builder');
    openBuilderWith({ presetId: p.presetId });
  });
  return card;
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diffH = (now - d) / 36e5;
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${Math.floor(diffH)}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const TINT_CLASSES = ['bg-coral', 'bg-sage', 'bg-sky', 'bg-lavender', 'bg-butter', 'bg-pink', 'bg-mint'];
function hashTint(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return TINT_CLASSES[h % TINT_CLASSES.length];
}
