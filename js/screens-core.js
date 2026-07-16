// ============================================================
//  מסכי ליבה: דשבורד · יולדות · מתנדבות · אנשי קשר · מלאי
// ============================================================

// ------------------------------------------------------------
//  דשבורד
// ------------------------------------------------------------
function screenDashboard() {
  const me = DB.me;
  const mothers = DB.all('mothers').filter((m) => m.status === 'active');
  const today = todayISO();
  const todayMeals = DB.all('meals').filter((m) => m.date === today && m.status !== 'cancelled');
  const weekEnd = addDays(today, 7);
  const weekMeals = DB.all('meals').filter((m) => m.date >= today && m.date <= weekEnd && m.status !== 'cancelled');
  const pendingGifts = DB.all('birthGifts').filter((g) => g.status === 'pending').length
    + DB.all('yearGifts').filter((g) => g.status === 'pending').length;

  const alerts = DB.alerts();
  const birthdays = DB.upcomingBirthdays();

  // הערות מהמנהלת המשנית — באנר עליון אצל המנהלת הראשית
  const notes = me.role === 'admin'
    ? DB.all('notes').filter((n) => !n.read)
    : [];

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'בוקר טוב' : hour < 18 ? 'צהריים טובים' : 'ערב טוב';

  return `
    <div class="hero">
      <div class="hero-greet">${greet},</div>
      <div class="hero-name">${e(me.name)}</div>
    </div>

    ${notes.map((n) => {
      const from = DB.find('users', n.fromUserId);
      return `
        <div class="banner" data-note="${n.id}">
          ${icon('message')}
          <div style="flex:1">
            <div class="banner-text">${e(n.text)}</div>
            <div class="banner-meta">${e(from ? from.name : 'מנהלת משנית')} · ${relativeDay(n.date)}</div>
          </div>
          <button class="icon-btn" data-read="${n.id}">${icon('check')}</button>
        </div>`;
    }).join('')}

    <div class="stat-grid">
      <div class="stat" data-go="mothers">
        <div class="stat-num" style="color:var(--primary)">${mothers.length}</div>
        <div class="stat-label">יולדות פעילות</div>
      </div>
      <div class="stat" data-go="meals">
        <div class="stat-num" style="color:var(--ok)">${todayMeals.length}</div>
        <div class="stat-label">ארוחות היום</div>
      </div>
      <div class="stat" data-go="meals">
        <div class="stat-num" style="color:var(--info)">${weekMeals.length}</div>
        <div class="stat-label">ארוחות השבוע</div>
      </div>
      <div class="stat" data-go="gifts">
        <div class="stat-num" style="color:var(--accent)">${pendingGifts}</div>
        <div class="stat-label">מתנות ממתינות</div>
      </div>
    </div>

    ${alerts.length ? `
      <div class="section-title">${icon('alert')} התראות</div>
      ${alerts.map((a) => `
        <div class="alert ${a.level === 'danger' ? '' : a.level}">
          ${icon('alert')}
          <div class="alert-text">${e(a.text)}</div>
        </div>`).join('')}
    ` : ''}

    ${todayMeals.length ? `
      <div class="section-title">${icon('utensils')} ארוחות היום</div>
      ${todayMeals.map((m) => mealRow(m)).join('')}
    ` : ''}

    ${birthdays.length ? `
      <div class="section-title">${icon('cake')} ימי הולדת קרובים</div>
      ${birthdays.map(({ v, days }) => `
        <div class="row">
          <div class="avatar">${e(UI.initials(v.name))}</div>
          <div class="row-main">
            <div class="row-title">${e(v.name)}</div>
            <div class="row-sub">${days === 0 ? 'היום! 🎉' : `בעוד ${days} ימים`}</div>
          </div>
          <button class="icon-btn wa" data-bday="${v.id}">${icon('whatsapp')}</button>
        </div>`).join('')}
    ` : ''}

    ${!mothers.length && !alerts.length ? UI.empty('heart', 'ברוכה הבאה!', 'התחילי בהוספת יולדת ראשונה מהמסך "יולדות"') : ''}
  `;
}

function bindDashboard(root) {
  root.querySelectorAll('[data-go]').forEach((el) => {
    el.onclick = () => go(el.dataset.go);
  });

  root.querySelectorAll('[data-read]').forEach((el) => {
    el.onclick = (ev) => {
      ev.stopPropagation();
      DB.update('notes', el.dataset.read, { read: true });
      render();
    };
  });

  root.querySelectorAll('[data-bday]').forEach((el) => {
    el.onclick = () => {
      const v = DB.find('volunteers', el.dataset.bday);
      const text = `יום הולדת שמח ${v.name}! 🎂💗\nכל צוות ${CONFIG.ORG_NAME} מאחל לך שנה מלאה בבריאות, שמחה ונחת.\nתודה על כל הנתינה שלך!`;
      previewMessage('ברכת יום הולדת', text, v.phone);
    };
  });
}

// ------------------------------------------------------------
//  יולדות
// ------------------------------------------------------------
let mothersFilter = { q: '', nbhd: '', status: 'active' };

function screenMothers() {
  let list = DB.all('mothers');

  if (mothersFilter.status) list = list.filter((m) => m.status === mothersFilter.status);
  if (mothersFilter.nbhd) list = list.filter((m) => m.neighborhood === mothersFilter.nbhd);
  if (mothersFilter.q) {
    const q = mothersFilter.q.toLowerCase();
    list = list.filter((m) =>
      (m.motherName || '').toLowerCase().includes(q) ||
      (m.lastName || '').toLowerCase().includes(q) ||
      (m.childName || '').toLowerCase().includes(q) ||
      (m.phone || '').includes(q)
    );
  }

  list.sort((a, b) => (b.birthDate || '').localeCompare(a.birthDate || ''));

  return `
    <div class="search-box">
      ${icon('search')}
      <input id="m-search" placeholder="חיפוש לפי שם או טלפון..." value="${escapeAttr(mothersFilter.q)}">
    </div>

    <div class="chips">
      <button class="chip ${mothersFilter.status === 'active' ? 'active' : ''}" data-status="active">פעילות</button>
      <button class="chip ${mothersFilter.status === 'done' ? 'active' : ''}" data-status="done">סיימו מסלול</button>
      <button class="chip ${mothersFilter.status === '' ? 'active' : ''}" data-status="">הכל</button>
    </div>

    <div class="chips">
      <button class="chip ${!mothersFilter.nbhd ? 'active' : ''}" data-nbhd="">כל השכונות</button>
      ${NEIGHBORHOODS.map((n) => `
        <button class="chip ${mothersFilter.nbhd === n.id ? 'active' : ''}" data-nbhd="${n.id}">${e(n.name)}</button>
      `).join('')}
    </div>

    ${list.length ? list.map((m) => {
      const meals = DB.mealsFor(m.id);
      const done = meals.filter((x) => x.status === 'done').length;
      return `
        <div class="card" data-mother="${m.id}">
          <div class="card-row">
            <div class="avatar">${e(UI.initials(m.motherName))}</div>
            <div style="flex:1;min-width:0">
              <div class="card-title">${e(m.motherName)} ${e(m.lastName || '')}</div>
              <div class="card-sub">${e(m.childName || '')}${m.birthDate ? ` · נולד/ה ${fmtDate(m.birthDate)}` : ''}</div>
            </div>
            ${UI.nbhdBadge(m.neighborhood)}
          </div>
          <div style="display:flex;gap:6px;margin-top:11px;flex-wrap:wrap">
            <span class="badge ${done === meals.length && meals.length ? 'ok' : 'muted'}">
              ${icon('utensils', 12)} ארוחות ${done}/${meals.length}
            </span>
            ${giftBadge(m.id)}
          </div>
        </div>`;
    }).join('') : UI.empty('baby', 'אין יולדות להצגה', 'לחצי על + כדי להוסיף יולדת חדשה')}

    <button class="fab" id="add-mother">${icon('plus')}</button>
  `;
}

function giftBadge(motherId) {
  const bg = DB.all('birthGifts').find((g) => g.motherId === motherId);
  if (!bg) return '';
  return bg.status === 'done'
    ? `<span class="badge ok">${icon('gift', 12)} מתנת לידה נמסרה</span>`
    : `<span class="badge warn">${icon('gift', 12)} מתנת לידה ממתינה</span>`;
}

function bindMothers(root) {
  const search = root.querySelector('#m-search');
  if (search) {
    search.oninput = () => {
      mothersFilter.q = search.value;
      const pos = search.selectionStart;
      render();
      const s2 = document.querySelector('#m-search');
      s2.focus();
      s2.setSelectionRange(pos, pos);
    };
  }

  root.querySelectorAll('[data-status]').forEach((el) => {
    el.onclick = () => { mothersFilter.status = el.dataset.status; render(); };
  });

  root.querySelectorAll('[data-nbhd]').forEach((el) => {
    el.onclick = () => { mothersFilter.nbhd = el.dataset.nbhd; render(); };
  });

  root.querySelectorAll('[data-mother]').forEach((el) => {
    el.onclick = () => go('mother-profile', el.dataset.mother);
  });

  const add = root.querySelector('#add-mother');
  if (add) add.onclick = () => motherForm();
}

function motherForm(id) {
  const m = id ? DB.find('mothers', id) : {};
  UI.modal(id ? 'עריכת יולדת' : 'יולדת חדשה', `
    <div id="mf">
      <div class="field-row">
        ${UI.field('שם האמא *', 'motherName', m.motherName)}
        ${UI.field('שם משפחה', 'lastName', m.lastName)}
      </div>
      <div class="field-row">
        ${UI.field('שם הילד/ה', 'childName', m.childName)}
        ${UI.field('תאריך לידה', 'birthDate', m.birthDate, 'date')}
      </div>
      ${UI.field('טלפון', 'phone', m.phone, 'tel')}
      ${UI.select('שכונה', 'neighborhood', m.neighborhood, NEIGHBORHOODS.map((n) => ({ value: n.id, label: n.name })))}
      ${UI.field('כתובת מדויקת', 'address', m.address)}
      ${UI.field('קוד כניסה / הערות הגעה', 'entryCode', m.entryCode)}
      ${UI.field('מקור ההיכרות', 'source', m.source)}
      ${UI.textarea('הערות', 'notes', m.notes)}
      ${id ? UI.select('סטטוס', 'status', m.status, [
        { value: 'active', label: 'פעילה' },
        { value: 'done', label: 'סיימה מסלול' }
      ]) : ''}
      <button class="btn" id="mf-save">${icon('check')} שמירה</button>
    </div>
  `, (c) => {
    c.querySelector('#mf-save').onclick = () => {
      const data = UI.readForm(c.querySelector('#mf'));
      if (!data.motherName) return UI.toast('חובה למלא שם אמא');

      if (id) {
        DB.update('mothers', id, data);
        UI.toast('היולדת עודכנה');
      } else {
        DB.addMother(data);
        UI.toast(`נוספה יולדת · נפתחו ${CONFIG.MEAL_DAYS} ימי ארוחות`);
      }
      UI.closeModal();
      render();
    };
  });
}

// ------------------------------------------------------------
//  פרופיל יולדת + ציר זמן
// ------------------------------------------------------------
function screenMotherProfile(id) {
  const m = DB.find('mothers', id);
  if (!m) return UI.empty('x', 'לא נמצאה', '');

  const meals = DB.mealsFor(id);
  const tl = DB.timelineFor(id);
  const kit = DB.all('kits').find((k) => k.motherId === id);
  const bg = DB.all('birthGifts').find((g) => g.motherId === id);
  const yg = DB.all('yearGifts').find((g) => g.motherId === id);

  return `
    <div class="card">
      <div class="card-row">
        <div class="avatar" style="width:54px;height:54px;font-size:19px">${e(UI.initials(m.motherName))}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:19px;font-weight:800">${e(m.motherName)} ${e(m.lastName || '')}</div>
          <div class="card-sub">${e(m.childName || '')}${m.birthDate ? ` · ${fmtDateFull(m.birthDate)}` : ''}</div>
          <div style="margin-top:6px">${UI.nbhdBadge(m.neighborhood)}</div>
        </div>
      </div>

      ${m.address ? `<div class="card-sub" style="margin-top:12px">${icon('mappin', 13)} ${e(m.address)}</div>` : ''}
      ${m.entryCode ? `<div class="card-sub">🔑 ${e(m.entryCode)}</div>` : ''}
      ${m.source ? `<div class="card-sub">מקור ההיכרות: ${e(m.source)}</div>` : ''}
      ${m.notes ? `<div class="card-sub" style="margin-top:8px;line-height:1.5">${e(m.notes)}</div>` : ''}

      <div class="btn-row" style="margin-top:14px">
        ${m.phone ? `<button class="btn btn-wa btn-sm" style="flex:1" id="p-wa">${icon('whatsapp')} וואטסאפ</button>` : ''}
        <button class="btn btn-ghost btn-sm" style="flex:1" id="p-edit">${icon('edit')} עריכה</button>
        <button class="icon-btn danger" id="p-del">${icon('trash')}</button>
      </div>
    </div>

    <div class="section-title">${icon('utensils')} ארוחות בוקר</div>
    ${meals.map((meal) => mealRow(meal, true)).join('') || UI.empty('utensils', 'אין ארוחות', '')}

    <div class="section-title">${icon('gift')} מתנות וערכות</div>
    <div class="row">
      <div class="row-main">
        <div class="row-title">מתנת לידה</div>
        <div class="row-sub">${bg && bg.deliveredAt ? `נמסרה ${fmtDate(bg.deliveredAt)}` : 'טרם נמסרה'}</div>
      </div>
      <span class="badge ${bg && bg.status === 'done' ? 'ok' : 'warn'}">${bg && bg.status === 'done' ? 'נמסרה' : 'ממתינה'}</span>
    </div>
    <div class="row">
      <div class="row-main">
        <div class="row-title">ערכת שבת</div>
        <div class="row-sub">${kit ? kitStatusText(kit) : `תוצע ב-${fmtDate(DB.kitDueDate(id)) || '—'}`}</div>
      </div>
      <button class="btn btn-ghost btn-sm" id="p-kit">${kit ? 'עדכון' : 'הצעה'}</button>
    </div>
    <div class="row">
      <div class="row-main">
        <div class="row-title">מתנת גיל שנה</div>
        <div class="row-sub">${yg ? (yg.collectedAt ? `נאספה ${fmtDate(yg.collectedAt)}` : `${fmtDate(yg.dueDate)} · ${relativeDay(yg.dueDate)}`) : '—'}</div>
      </div>
      <span class="badge ${yg && yg.status === 'done' ? 'ok' : 'muted'}">${yg && yg.status === 'done' ? 'נאספה' : 'ממתינה'}</span>
    </div>

    <div class="section-title">${icon('clock')} ציר זמן</div>
    <div class="card">
      ${tl.length ? `<div class="timeline">
        ${tl.map((t) => `
          <div class="tl-item">
            <div class="tl-date">${fmtDateFull(t.date)}</div>
            <div class="tl-text">${e(t.text)}</div>
          </div>`).join('')}
      </div>` : '<div class="card-sub">אין אירועים עדיין</div>'}
    </div>

    <button class="btn btn-ghost" id="p-note" style="margin-top:4px">${icon('plus')} הוספת רישום לציר הזמן</button>
  `;
}

function kitStatusText(kit) {
  if (kit.deliveredAt) return `נמסרה ${fmtDate(kit.deliveredAt)}`;
  if (kit.accepted === true) return 'אישרה — ממתינה להכנה';
  if (kit.accepted === false) return 'ויתרה';
  return `הוצעה ${fmtDate(kit.offeredAt)} — ממתינה לתשובה`;
}

function bindMotherProfile(root, id) {
  const m = DB.find('mothers', id);
  if (!m) return;

  const wa = root.querySelector('#p-wa');
  if (wa) wa.onclick = () => messagePicker(m);

  root.querySelector('#p-edit').onclick = () => motherForm(id);

  root.querySelector('#p-del').onclick = () => {
    UI.confirm('מחיקת יולדת', `למחוק את ${e(m.motherName)} וכל הנתונים הקשורים אליה? הפעולה אינה הפיכה.`, () => {
      ['meals', 'kits', 'birthGifts', 'yearGifts', 'timeline'].forEach((col) => {
        DB.all(col).filter((x) => x.motherId === id).forEach((x) => DB.remove(col, x.id));
      });
      DB.remove('mothers', id);
      UI.toast('נמחקה');
      go('mothers');
    });
  };

  root.querySelector('#p-kit').onclick = () => kitForm(id);

  root.querySelector('#p-note').onclick = () => {
    UI.modal('רישום לציר הזמן', `
      <div id="nf">${UI.textarea('מה קרה?', 'text', '')}
      <button class="btn" id="nf-save">${icon('check')} שמירה</button></div>
    `, (c) => {
      c.querySelector('#nf-save').onclick = () => {
        const { text } = UI.readForm(c.querySelector('#nf'));
        if (!text) return UI.toast('חובה למלא טקסט');
        DB.logEvent(id, 'note', text);
        UI.closeModal();
        render();
      };
    });
  };

  bindMealRows(root);
}

// בורר תבנית הודעה ליולדת
function messagePicker(m) {
  const keys = ['newMotherDetails', 'shabbatKitOffer', 'yearGiftReady', 'eventInvite'];
  UI.modal(`הודעה ל${e(m.motherName)}`, `
    ${keys.map((k) => `
      <div class="row" data-tpl="${k}">
        <div class="icon-btn wa">${icon(TEMPLATES[k].icon)}</div>
        <div class="row-main"><div class="row-title">${e(TEMPLATES[k].title)}</div></div>
        ${icon('back')}
      </div>`).join('')}
    <div class="row" data-tpl="free">
      <div class="icon-btn">${icon('edit')}</div>
      <div class="row-main"><div class="row-title">הודעה חופשית</div></div>
      ${icon('back')}
    </div>
  `, (c) => {
    c.querySelectorAll('[data-tpl]').forEach((el) => {
      el.onclick = () => {
        const k = el.dataset.tpl;
        UI.closeModal();
        if (k === 'free') return sendWhatsApp(m.phone, '');

        const yg = DB.all('yearGifts').find((g) => g.motherId === m.id);
        const contact = yg && yg.contactId ? DB.find('contacts', yg.contactId) : null;
        const ev = DB.all('events').filter((x) => x.date >= todayISO()).sort((a, b) => a.date.localeCompare(b.date))[0];

        const text = buildMessage(k, {
          motherName: m.motherName,
          childName: m.childName,
          contactName: contact ? contact.name : '[יש לשבץ איש קשר]',
          contactAddress: contact ? contact.address : '',
          contactPhone: contact ? contact.phone : '',
          contactNbhd: contact ? nbhdName(contact.neighborhood) : '',
          dateFull: ev ? fmtDateFull(ev.date) : '',
          location: ev ? ev.location : '',
          speakers: ev ? ev.speakers : ''
        });
        previewMessage(TEMPLATES[k].title, text, m.phone);
      };
    });
  });
}

// ------------------------------------------------------------
//  מתנדבות
// ------------------------------------------------------------
function screenVolunteers() {
  const list = DB.all('volunteers');

  return `
    ${list.length ? list.map((v) => `
      <div class="card" data-vol="${v.id}">
        <div class="card-row">
          <div class="avatar">${e(UI.initials(v.name))}</div>
          <div style="flex:1;min-width:0">
            <div class="card-title">${e(v.name)}</div>
            <div class="card-sub">${e(VOLUNTEER_TYPES[v.roleType] || '')}${v.availability ? ` · ${e(v.availability)}` : ''}</div>
          </div>
          ${v.phone ? `<button class="icon-btn wa" data-vwa="${v.id}">${icon('whatsapp')}</button>` : ''}
          <button class="icon-btn" data-vedit="${v.id}">${icon('edit')}</button>
        </div>
      </div>`).join('') : UI.empty('users', 'אין מתנדבות', 'לחצי על + להוספת מתנדבת')}

    <button class="btn btn-ghost" id="ask-avail" style="margin-top:10px">
      ${icon('message')} בקשת זמינות שבועית מהמכינות
    </button>

    <button class="fab" id="add-vol">${icon('plus')}</button>
  `;
}

function bindVolunteers(root) {
  root.querySelectorAll('[data-vedit]').forEach((el) => {
    el.onclick = (ev) => { ev.stopPropagation(); volunteerForm(el.dataset.vedit); };
  });

  root.querySelectorAll('[data-vwa]').forEach((el) => {
    el.onclick = (ev) => {
      ev.stopPropagation();
      const v = DB.find('volunteers', el.dataset.vwa);
      sendWhatsApp(v.phone, '');
    };
  });

  root.querySelector('#add-vol').onclick = () => volunteerForm();

  root.querySelector('#ask-avail').onclick = () => {
    previewMessage(TEMPLATES.cookAvailability.title, buildMessage('cookAvailability', {}), '');
  };
}

function volunteerForm(id) {
  const v = id ? DB.find('volunteers', id) : {};
  UI.modal(id ? 'עריכת מתנדבת' : 'מתנדבת חדשה', `
    <div id="vf">
      ${UI.field('שם *', 'name', v.name)}
      ${UI.field('טלפון', 'phone', v.phone, 'tel')}
      ${UI.field('כתובת', 'address', v.address)}
      ${UI.field('יום הולדת', 'birthday', v.birthday, 'date')}
      ${UI.select('סוג תפקיד', 'roleType', v.roleType,
        Object.entries(VOLUNTEER_TYPES).map(([k, l]) => ({ value: k, label: l })))}
      ${UI.field('זמינות (ימים מועדפים)', 'availability', v.availability)}
      <button class="btn" id="vf-save">${icon('check')} שמירה</button>
      ${id ? `<button class="btn btn-ghost" id="vf-del" style="margin-top:9px;color:var(--danger)">${icon('trash')} מחיקה</button>` : ''}
    </div>
  `, (c) => {
    c.querySelector('#vf-save').onclick = () => {
      const data = UI.readForm(c.querySelector('#vf'));
      if (!data.name) return UI.toast('חובה למלא שם');
      if (id) DB.update('volunteers', id, data);
      else DB.insert('volunteers', data);
      UI.closeModal();
      UI.toast('נשמר');
      render();
    };

    const del = c.querySelector('#vf-del');
    if (del) del.onclick = () => {
      UI.closeModal();
      UI.confirm('מחיקת מתנדבת', `למחוק את ${e(v.name)}?`, () => {
        DB.remove('volunteers', id);
        render();
      });
    };
  });
}

// ------------------------------------------------------------
//  אנשי קשר (מתנות גיל שנה)
// ------------------------------------------------------------
function screenContacts() {
  const list = DB.all('contacts');

  return `
    <div class="section-title">${icon('mappin')} נקודות איסוף למתנות גיל שנה</div>
    ${list.length ? list.map((c) => `
      <div class="card" data-contact="${c.id}">
        <div class="card-row">
          <div class="avatar">${e(UI.initials(c.name))}</div>
          <div style="flex:1;min-width:0">
            <div class="card-title">${e(c.name)}</div>
            <div class="card-sub">${e(c.address || '')}</div>
            <div style="margin-top:5px">${UI.nbhdBadge(c.neighborhood)}</div>
          </div>
          <div class="qty-badge ${(c.giftsInStock || 0) <= 2 ? 'low' : ''}">${c.giftsInStock || 0}</div>
        </div>
      </div>`).join('') : UI.empty('mappin', 'אין אנשי קשר', 'הוסיפי איש קשר לכל שכונה')}

    <button class="fab" id="add-contact">${icon('plus')}</button>
  `;
}

function bindContacts(root) {
  root.querySelectorAll('[data-contact]').forEach((el) => {
    el.onclick = () => contactForm(el.dataset.contact);
  });
  root.querySelector('#add-contact').onclick = () => contactForm();
}

function contactForm(id) {
  const c0 = id ? DB.find('contacts', id) : {};
  UI.modal(id ? 'עריכת איש קשר' : 'איש קשר חדש', `
    <div id="cf">
      ${UI.field('שם *', 'name', c0.name)}
      ${UI.field('טלפון', 'phone', c0.phone, 'tel')}
      ${UI.select('שכונה', 'neighborhood', c0.neighborhood, NEIGHBORHOODS.map((n) => ({ value: n.id, label: n.name })))}
      ${UI.field('כתובת (מיקום איסוף)', 'address', c0.address)}
      ${UI.field('כמות מתנות במלאי', 'giftsInStock', c0.giftsInStock, 'number')}
      <button class="btn" id="cf-save">${icon('check')} שמירה</button>
      ${id ? `<button class="btn btn-ghost" id="cf-del" style="margin-top:9px;color:var(--danger)">${icon('trash')} מחיקה</button>` : ''}
    </div>
  `, (c) => {
    c.querySelector('#cf-save').onclick = () => {
      const data = UI.readForm(c.querySelector('#cf'));
      if (!data.name) return UI.toast('חובה למלא שם');
      if (id) DB.update('contacts', id, data);
      else DB.insert('contacts', data);
      UI.closeModal();
      render();
    };

    const del = c.querySelector('#cf-del');
    if (del) del.onclick = () => {
      UI.closeModal();
      UI.confirm('מחיקה', `למחוק את ${e(c0.name)}?`, () => { DB.remove('contacts', id); render(); });
    };
  });
}

// ------------------------------------------------------------
//  מלאי
// ------------------------------------------------------------
function screenInventory() {
  const list = DB.all('inventory');
  const low = DB.lowStock();

  return `
    ${low.length ? `
      <div class="alert warn">
        ${icon('alert')}
        <div class="alert-text">${low.length} פריטים הגיעו לסף המינימום</div>
      </div>` : ''}

    ${list.map((i) => `
      <div class="row">
        <div class="row-main">
          <div class="row-title">${e(i.name)}</div>
          <div class="row-sub">סף התראה: ${i.minQty}</div>
        </div>
        <div class="qty-badge ${i.qty <= i.minQty ? 'low' : ''}">${i.qty}</div>
        <button class="icon-btn" data-inv="${i.id}">${icon('edit')}</button>
      </div>`).join('')}

    <button class="btn btn-ghost" id="view-orders" style="margin-top:10px">
      ${icon('filetext')} היסטוריית הזמנות מתנדבות
    </button>

    <button class="fab" id="add-inv">${icon('plus')}</button>
  `;
}

function bindInventory(root) {
  root.querySelectorAll('[data-inv]').forEach((el) => {
    el.onclick = () => inventoryForm(el.dataset.inv);
  });

  root.querySelector('#add-inv').onclick = () => inventoryForm();

  root.querySelector('#view-orders').onclick = () => {
    const orders = DB.all('orders').sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    UI.modal('הזמנות אחרונות', orders.length ? orders.map((o) => {
      const v = DB.find('volunteers', o.volunteerId);
      const items = o.items.map((it) => {
        const item = DB.find('inventory', it.itemId);
        return `${item ? e(item.name) : '?'} ×${it.qty}`;
      }).join(', ');
      return `
        <div class="row">
          <div class="row-main">
            <div class="row-title">${e(v ? v.name : 'מתנדבת')}</div>
            <div class="row-sub">${items}</div>
          </div>
          <span class="badge muted">${fmtDate(o.date)}</span>
        </div>`;
    }).join('') : '<div class="card-sub">אין הזמנות עדיין</div>');
  };
}

function inventoryForm(id) {
  const i = id ? DB.find('inventory', id) : { qty: 0, minQty: 10 };
  UI.modal(id ? 'עריכת פריט' : 'פריט חדש', `
    <div id="if">
      ${UI.field('שם הפריט *', 'name', i.name)}
      <div class="field-row">
        ${UI.field('כמות נוכחית', 'qty', i.qty, 'number')}
        ${UI.field('סף מינימום', 'minQty', i.minQty, 'number')}
      </div>
      <button class="btn" id="if-save">${icon('check')} שמירה</button>
      ${id ? `<button class="btn btn-ghost" id="if-del" style="margin-top:9px;color:var(--danger)">${icon('trash')} מחיקה</button>` : ''}
    </div>
  `, (c) => {
    c.querySelector('#if-save').onclick = () => {
      const data = UI.readForm(c.querySelector('#if'));
      if (!data.name) return UI.toast('חובה למלא שם');
      data.qty = data.qty || 0;
      data.minQty = data.minQty || 0;
      if (id) DB.update('inventory', id, data);
      else DB.insert('inventory', data);
      UI.closeModal();
      render();
    };

    const del = c.querySelector('#if-del');
    if (del) del.onclick = () => {
      UI.closeModal();
      UI.confirm('מחיקה', `למחוק את ${e(i.name)}?`, () => { DB.remove('inventory', id); render(); });
    };
  });
}

// ------------------------------------------------------------
//  מסך הזמנת ציוד למתנדבת — פשוט ונעים, בלי שאר נתוני המערכת
// ------------------------------------------------------------
let orderCart = {};

function screenOrder() {
  const list = DB.all('inventory');
  const total = Object.values(orderCart).reduce((a, b) => a + b, 0);

  return `
    <div class="hero">
      <div class="hero-greet">היי ${e(DB.me.name)},</div>
      <div class="hero-name">מה חסר לך?</div>
      <div style="font-size:12.5px;opacity:0.85;margin-top:8px;font-weight:500;line-height:1.5">
        בחרי כמויות ושלחי — נדאג שיחכה לך.
      </div>
    </div>

    ${list.map((i) => `
      <div class="order-item">
        <div style="flex:1">
          <div class="row-title">${e(i.name)}</div>
        </div>
        <div class="stepper">
          <button data-dec="${i.id}" ${!orderCart[i.id] ? 'disabled' : ''}>−</button>
          <div class="val">${orderCart[i.id] || 0}</div>
          <button data-inc="${i.id}">+</button>
        </div>
      </div>`).join('')}

    ${total ? `<button class="btn" id="send-order" style="margin-top:14px">
      ${icon('check')} שליחת הזמנה (${total} פריטים)
    </button>` : ''}
  `;
}

function bindOrder(root) {
  root.querySelectorAll('[data-inc]').forEach((el) => {
    el.onclick = () => {
      const id = el.dataset.inc;
      orderCart[id] = (orderCart[id] || 0) + 1;
      render();
    };
  });

  root.querySelectorAll('[data-dec]').forEach((el) => {
    el.onclick = () => {
      const id = el.dataset.dec;
      orderCart[id] = Math.max(0, (orderCart[id] || 0) - 1);
      if (!orderCart[id]) delete orderCart[id];
      render();
    };
  });

  const send = root.querySelector('#send-order');
  if (send) send.onclick = () => {
    const items = Object.entries(orderCart).map(([itemId, qty]) => ({ itemId, qty }));
    DB.placeOrder(DB.me.volunteerId || DB.me.id, items);
    orderCart = {};
    UI.toast('ההזמנה נשלחה, תודה! 💗');
    render();
  };
}
