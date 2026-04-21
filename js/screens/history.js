/* ==========================================================================
   History screen — auto-logged recent calculations.
   ========================================================================== */

import { createEl } from '../utils.js';
import { greeting } from '../ui.js';
import { getHistory, clearHistory } from '../storage.js';
import { go } from '../router.js';

const TOOL_META = {
  'dilution':        { icon: '💧', tint: 'bg-coral',    target: 'dilution' },
  'concentration':   { icon: '⚖️', tint: 'bg-sage',     target: 'concentration' },
  'reconstitution':  { icon: '🧴', tint: 'bg-sky',      target: 'reconstitution' },
  'seeding-single':  { icon: '🦠', tint: 'bg-butter',   target: 'seeding' },
  'seeding-plate':   { icon: '🟢', tint: 'bg-mint',     target: 'seeding' },
  'serial':          { icon: '💉', tint: 'bg-pink',     target: 'serial' },
  'recipe':          { icon: '✨', tint: 'bg-lavender', target: 'builder' },
};

export function renderHistory(host) {
  host.innerHTML = '';

  const header = createEl('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '14px' } }, [
    greeting({ eyebrow: 'Activity', title: 'History' }),
  ]);
  host.appendChild(header);

  const entries = getHistory();
  if (entries.length === 0) {
    host.appendChild(createEl('p', {
      style: { color: 'var(--ink-soft)', fontSize: '13.5px', padding: '24px 12px', textAlign: 'center' },
      text: 'No calculations yet. Your recent calcs will appear here automatically.',
    }));
    return;
  }

  for (const e of entries) {
    const meta = TOOL_META[e.tool] || { icon: '🧮', tint: 'bg-sage', target: 'home' };
    const card = createEl('div', { class: 'ing-card', style: { cursor: 'pointer' } });
    card.appendChild(createEl('div', { class: `ing-circle ${meta.tint}`, text: meta.icon }));
    card.appendChild(createEl('div', { class: 'ing-body' }, [
      createEl('div', { class: 'nm', text: e.toolLabel || e.tool }),
      createEl('div', { class: 'sub', text: e.summary || '' }),
    ]));
    card.appendChild(createEl('div', { class: 'ing-amount' }, [
      createEl('div', { style: { fontSize: '11px', color: 'var(--ink-faint)', fontWeight: '700' }, text: fmtRel(e.timestamp) }),
    ]));
    card.addEventListener('click', () => go(meta.target));
    host.appendChild(card);
  }

  const clearBtn = createEl('button', {
    class: 'btn-secondary',
    style: { marginTop: '20px', width: '100%' },
    text: 'Clear history',
    onclick: () => {
      if (confirm('Clear all history? This cannot be undone.')) {
        clearHistory();
        renderHistory(document.getElementById('screen-history'));
      }
    },
  });
  host.appendChild(clearBtn);
}

function fmtRel(iso) {
  if (!iso) return '';
  const now = Date.now();
  const t = new Date(iso).getTime();
  const mins = Math.round((now - t) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
