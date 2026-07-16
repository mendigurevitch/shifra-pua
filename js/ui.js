// ============================================================
//  רכיבי ממשק משותפים
// ============================================================

const UI = {
  // ---------- מודל ----------
  modal(title, bodyHTML, onMount) {
    const overlay = document.getElementById('modal-overlay');
    const container = document.getElementById('modal-container');

    container.innerHTML = `
      <div class="modal-handle"></div>
      <div class="modal-title">${title}</div>
      ${bodyHTML}
    `;

    overlay.classList.remove('hidden');
    container.classList.remove('hidden');
    overlay.onclick = () => UI.closeModal();

    if (onMount) onMount(container);
  },

  closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-container').classList.add('hidden');
    document.getElementById('modal-container').innerHTML = '';
  },

  // ---------- טוסט ----------
  toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.add('hidden'), 2400);
  },

  confirm(title, text, onYes) {
    UI.modal(title, `
      <p style="font-size:14px;line-height:1.6;color:var(--text-muted);margin-bottom:18px">${text}</p>
      <div class="btn-row">
        <button class="btn btn-ghost" id="c-no">ביטול</button>
        <button class="btn btn-danger" id="c-yes">אישור</button>
      </div>
    `, (c) => {
      c.querySelector('#c-no').onclick = () => UI.closeModal();
      c.querySelector('#c-yes').onclick = () => { UI.closeModal(); onYes(); };
    });
  },

  // ---------- שדות טופס ----------
  field(label, name, value, type) {
    return `
      <div class="field">
        <label>${label}</label>
        <input type="${type || 'text'}" name="${name}" value="${escapeAttr(value || '')}">
      </div>`;
  },

  textarea(label, name, value) {
    return `
      <div class="field">
        <label>${label}</label>
        <textarea name="${name}">${escapeHTML(value || '')}</textarea>
      </div>`;
  },

  select(label, name, value, options) {
    const opts = options
      .map((o) => `<option value="${escapeAttr(o.value)}" ${o.value === value ? 'selected' : ''}>${escapeHTML(o.label)}</option>`)
      .join('');
    return `
      <div class="field">
        <label>${label}</label>
        <select name="${name}"><option value="">— בחרי —</option>${opts}</select>
      </div>`;
  },

  // קורא את כל השדות בתוך אלמנט לאובייקט
  readForm(container) {
    const data = {};
    container.querySelectorAll('input, select, textarea').forEach((el) => {
      if (!el.name) return;
      if (el.type === 'checkbox') data[el.name] = el.checked;
      else if (el.type === 'number') data[el.name] = el.value === '' ? null : Number(el.value);
      else data[el.name] = el.value.trim();
    });
    return data;
  },

  empty(iconName, title, sub) {
    return `
      <div class="empty">
        ${icon(iconName)}
        <div class="empty-title">${title}</div>
        <div class="empty-sub">${sub || ''}</div>
      </div>`;
  },

  nbhdBadge(id) {
    if (!id) return '';
    return `<span class="badge" style="background:${nbhdColor(id)}1F;color:${nbhdColor(id)}">
      <span class="nbhd-dot" style="background:${nbhdColor(id)}"></span>${nbhdName(id)}
    </span>`;
  },

  initials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2);
  }
};

// XSS-safe: שמות והערות מוזנים ע"י משתמשות ומוזרקים ל-innerHTML
function escapeHTML(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(s) {
  return escapeHTML(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const e = escapeHTML;
