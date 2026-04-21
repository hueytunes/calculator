/* ==========================================================================
   Settings screen — theme, default units, default diluent, about.
   ========================================================================== */

import { createEl } from '../utils.js';
import { greeting, selectGroup } from '../ui.js';
import { getSettings, setSetting } from '../storage.js';
import { DILUENT_OPTIONS } from '../recipe.js';

export function renderSettings(host) {
  host.innerHTML = '';
  host.appendChild(greeting({ eyebrow: 'You', title: 'Settings' }));

  const s = getSettings();

  // Theme
  const themeCard = createEl('div', { class: 'protocol', style: { marginBottom: '14px' } });
  themeCard.appendChild(createEl('h4', { text: 'Appearance' }));
  themeCard.appendChild(renderThemeRow(s.theme));
  host.appendChild(themeCard);

  // Defaults
  const defaults = createEl('div', { class: 'protocol', style: { marginBottom: '14px' } });
  defaults.appendChild(createEl('h4', { text: 'Defaults' }));

  const volSel = selectGroup({
    label: 'Default volume unit',
    options: ['L','mL','µL','nL'].map(u => ({ value: u, label: u })),
    value: s.defaultVolumeUnit,
  });
  volSel.select.addEventListener('change', () => setSetting('defaultVolumeUnit', volSel.select.value));
  defaults.appendChild(volSel.wrap);

  const dilSel = selectGroup({
    label: 'Default diluent',
    options: DILUENT_OPTIONS.filter(o => o.value !== 'custom'),
    value: s.defaultDiluent,
  });
  dilSel.select.addEventListener('change', () => setSetting('defaultDiluent', dilSel.select.value));
  defaults.appendChild(dilSel.wrap);

  host.appendChild(defaults);

  // About
  const about = createEl('div', { class: 'protocol' });
  about.appendChild(createEl('h4', { text: 'About' }));
  about.appendChild(createEl('p', {
    style: { fontSize: '13px', color: 'var(--ink-soft)', margin: '4px 0 0', lineHeight: '1.55' },
    html: 'Lab Calculator Suite · v2.0<br/>Soft Lab redesign with Recipe Builder.<br/>© 2026 · Built by Huey',
  }));
  host.appendChild(about);
}

function renderThemeRow(current) {
  const row = createEl('div', {
    style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' },
  });
  row.appendChild(createEl('span', {
    style: { fontSize: '14.5px', fontWeight: '600', color: 'var(--ink)' },
    text: 'Theme',
  }));

  const seg = createEl('div', {
    style: {
      display: 'flex', gap: '2px', background: 'var(--cream-deep)',
      padding: '3px', borderRadius: '999px',
    },
  });
  const opts = [
    { value: 'light', label: 'Light' },
    { value: 'dark',  label: 'Dark' },
    { value: 'auto',  label: 'Auto' },
  ];
  const btns = [];
  for (const o of opts) {
    const b = createEl('button', {
      style: {
        padding: '6px 12px', border: 'none', cursor: 'pointer',
        borderRadius: '999px', fontSize: '12px', fontWeight: '600',
        color: o.value === current ? 'var(--cream)' : 'var(--ink-soft)',
        background: o.value === current ? 'var(--ink)' : 'transparent',
        fontFamily: 'inherit', transition: 'all 180ms',
      },
      text: o.label,
      onclick: () => {
        setSetting('theme', o.value);
        btns.forEach((x, i) => {
          const isActive = opts[i].value === o.value;
          x.style.color = isActive ? 'var(--cream)' : 'var(--ink-soft)';
          x.style.background = isActive ? 'var(--ink)' : 'transparent';
        });
        // Apply immediately
        const wantsDark = o.value === 'dark' ||
          (o.value === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.classList.toggle('dark', wantsDark);
        document.getElementById('icon-sun').style.display  = wantsDark ? 'none'  : 'block';
        document.getElementById('icon-moon').style.display = wantsDark ? 'block' : 'none';
      },
    });
    btns.push(b);
    seg.appendChild(b);
  }
  row.appendChild(seg);
  return row;
}
