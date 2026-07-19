// ============================================================
//  מסכי תהליכים: ארוחות · ערכות שבת · מתנות · בוקר ליולדות · דוחות
// ============================================================

// ------------------------------------------------------------
//  שורת ארוחה (משותפת לדשבורד, לפרופיל ולמסך הארוחות)
// ------------------------------------------------------------
function mealRow(meal, showDate) {
  const m = DB.find('mothers', meal.motherId);
  if (!m) return '';

  const cook = meal.cookId ? DB.find('volunteers', meal.cookId) : null;
  const driver = meal.driverId ? DB.find('volunteers', meal.driverId) : null;

  const statusBadge = {
    done: '<span class="badge ok">בוצע</span>',
    cancelled: '<span class="badge muted">בוטל</span>',
    needsSub: '<span class="badge danger">צריך מחליפה</span>',
    pending: ''
  }[meal.status] || '';

  return `
    <div class="row" data-meal="${meal.id}">
      <div class="nbhd-dot" style="background:${nbhdColor(m.neighborhood)};width:10px;height:10px"></div>
      <div class="row-main">
        <div class="row-title">${e(m.motherName)} ${showDate ? `· ${fmtDate(meal.date)}` : ''}</div>
        <div class="row-sub">
          ${cook ? `${icon('utensils', 11)} ${e(cook.name)}` : '<span style="color:var(--danger)">חסרה מכינה</span>'}
          ·
          ${driver ? `${icon('truck', 11)} ${e(driver.name)}` : '<span style="color:var(--danger)">חסרה משנעת</span>'}
          ${meal.deliveryTime ? ` · ${e(meal.deliveryTime)}` : ''}
        </div>
      </div>
      ${statusBadge}
    </div>`;
}

function bindMealRows(root) {
  root.querySelectorAll('[data-meal]').forEach((el) => {
    el.onclick = () => mealForm(el.dataset.meal);
  });
}

// ------------------------------------------------------------
//  מסך ארוחות — לפי יום / לפי שכונה
// ------------------------------------------------------------
let mealView = 'day';

function screenMeals() {
  const today = todayISO();
  const meals = DB.all('meals')
    .filter((m) => m.date >= addDays(today, -1))
    .sort((a, b) => a.date.localeCompare(b.date));

  let body;

  if (mealView === 'nbhd') {
    // קיבוץ לפי שכונה — נוח למתנדבת שמשנעת בשכונה שלה
    body = NEIGHBORHOODS.map((n) => {
      const inN = meals.filter((m) => {
        const mo = DB.find('mothers', m.motherId);
        return mo && mo.neighborhood === n.id;
      });
      if (!inN.length) return '';
      return `
        <div class="section-title">
          <span class="nbhd-dot" style="background:${n.color}"></span> ${e(n.name)} (${inN.length})
        </div>
        ${inN.map((m) => mealRow(m, true)).join('')}`;
    }).join('');
  } else {
    // קיבוץ לפי יום
    const byDate = {};
    meals.forEach((m) => { (byDate[m.date] = byDate[m.date] || []).push(m); });
    body = Object.keys(byDate).sort().map((d) => `
      <div class="section-title">
        ${icon('calendar')} ${fmtDateFull(d)} · ${relativeDay(d)}
      </div>
      ${byDate[d].map((m) => mealRow(m)).join('')}`).join('');
  }

  return `
    <div class="chips">
      <button class="chip ${mealView === 'day' ? 'active' : ''}" data-view="day">לפי יום</button>
      <button class="chip ${mealView === 'nbhd' ? 'active' : ''}" data-view="nbhd">לפי שכונה</button>
    </div>

    ${body || UI.empty('utensils', 'אין ארוחות מתוכננות', 'ארוחות נפתחות אוטומטית בהוספת יולדת חדשה')}

    <button class="btn btn-ghost" id="notify-drivers" style="margin-top:12px">
      ${icon('truck')} שליחת כתובות למשנעות של היום
    </button>
  `;
}

function bindMeals(root) {
  root.querySelectorAll('[data-view]').forEach((el) => {
    el.onclick = () => { mealView = el.dataset.view; render(); };
  });

  bindMealRows(root);

  root.querySelector('#notify-drivers').onclick = () => {
    const today = todayISO();
    const todays = DB.all('meals').filter((m) => m.date === today && m.driverId && m.status === 'pending');
    if (!todays.length) return UI.toast('אין משנעות משובצות להיום');

    UI.modal('כתובות למשנעות של היום', todays.map((meal) => {
      const v = DB.find('volunteers', meal.driverId);
      const mo = DB.find('mothers', meal.motherId);
      return `
        <div class="row" data-send="${meal.id}">
          <div class="icon-btn wa">${icon('whatsapp')}</div>
          <div class="row-main">
            <div class="row-title">${e(v.name)}</div>
            <div class="row-sub">→ ${e(mo.motherName)} · ${e(mo.address || 'אין כתובת')}</div>
          </div>
          ${icon('back')}
        </div>`;
    }).join(''), (c) => {
      c.querySelectorAll('[data-send]').forEach((el) => {
        el.onclick = () => {
          const meal = DB.find('meals', el.dataset.send);
          const v = DB.find('volunteers', meal.driverId);
          const mo = DB.find('mothers', meal.motherId);
          UI.closeModal();
          previewMessage(TEMPLATES.driverAddress.title, buildMessage('driverAddress', {
            volunteerName: v.name,
            motherName: mo.motherName,
            address: mo.address,
            entryCode: mo.entryCode,
            phone: mo.phone,
            deliveryTime: meal.deliveryTime,
            notes: mo.notes
          }), v.phone);
        };
      });
    });
  };
}

function mealForm(id) {
  const meal = DB.find('meals', id);
  const mo = DB.find('mothers', meal.motherId);
  const vols = DB.all('volunteers');
  const cooks = vols.filter((v) => v.roleType === 'cook' || v.roleType === 'both' || !v.roleType);
  const drivers = vols.filter((v) => v.roleType === 'driver' || v.roleType === 'both' || !v.roleType);

  UI.modal(`ארוחה · ${e(mo.motherName)}`, `
    <div id="mlf">
      <div class="card-sub" style="margin-bottom:14px">
        ${icon('mappin', 13)} ${e(mo.address || 'אין כתובת')} · ${e(nbhdName(mo.neighborhood))}
      </div>
      ${UI.field('תאריך', 'date', meal.date, 'date')}
      ${UI.select('מי מכינה', 'cookId', meal.cookId, cooks.map((v) => ({ value: v.id, label: v.name })))}
      ${UI.select('מי משנעת', 'driverId', meal.driverId, drivers.map((v) => ({ value: v.id, label: v.name })))}
      ${UI.field('שעת אספקה', 'deliveryTime', meal.deliveryTime, 'time')}
      ${UI.select('סטטוס', 'status', meal.status, [
        { value: 'pending', label: 'מתוכנן' },
        { value: 'done', label: 'בוצע' },
        { value: 'needsSub', label: 'צריך מחליפה' },
        { value: 'cancelled', label: 'בוטל' }
      ])}
      <button class="btn" id="mlf-save">${icon('check')} שמירה</button>
      <div class="btn-row" style="margin-top:9px">
        <button class="btn btn-wa btn-sm" style="flex:1" id="mlf-cook">${icon('whatsapp')} תזכורת למכינה</button>
        <button class="btn btn-wa btn-sm" style="flex:1" id="mlf-drive">${icon('whatsapp')} כתובת למשנעת</button>
      </div>
    </div>
  `, (c) => {
    c.querySelector('#mlf-save').onclick = () => {
      const data = UI.readForm(c.querySelector('#mlf'));
      data.cookId = data.cookId || null;
      data.driverId = data.driverId || null;

      const wasDone = meal.status === 'done';
      DB.update('meals', id, data);

      if (data.status === 'done' && !wasDone) {
        DB.logEvent(meal.motherId, 'meal', `ארוחת בוקר סופקה (${fmtDate(data.date)})`);
      }
      UI.closeModal();
      UI.toast('נשמר');
      render();
    };

    c.querySelector('#mlf-cook').onclick = () => {
      const v = meal.cookId ? DB.find('volunteers', meal.cookId) : null;
      if (!v) return UI.toast('לא משובצת מכינה');
      UI.closeModal();
      previewMessage(TEMPLATES.mealTomorrow.title, buildMessage('mealTomorrow', {
        volunteerName: v.name,
        dateFull: fmtDateFull(meal.date),
        roleLabel: 'הכנת ארוחת בוקר',
        motherName: mo.motherName,
        deliveryTime: meal.deliveryTime
      }), v.phone);
    };

    c.querySelector('#mlf-drive').onclick = () => {
      const v = meal.driverId ? DB.find('volunteers', meal.driverId) : null;
      if (!v) return UI.toast('לא משובצת משנעת');
      UI.closeModal();
      previewMessage(TEMPLATES.driverAddress.title, buildMessage('driverAddress', {
        volunteerName: v.name,
        motherName: mo.motherName,
        address: mo.address,
        entryCode: mo.entryCode,
        phone: mo.phone,
        deliveryTime: meal.deliveryTime,
        notes: mo.notes
      }), v.phone);
    };
  });
}

// ------------------------------------------------------------
//  ערכות שבת
// ------------------------------------------------------------
function screenKits() {
  const kits = DB.all('kits');
  const accepted = kits.filter((k) => k.accepted === true && !k.deliveredAt);

  // מי שהגיע זמנה לקבל הצעה אבל טרם הוצעה
  const due = DB.all('mothers').filter((m) => {
    if (m.status !== 'active') return false;
    if (kits.find((k) => k.motherId === m.id)) return false;
    const d = DB.kitDueDate(m.id);
    return d && daysBetween(todayISO(), d) <= 0;
  });

  return `
    <div class="card" style="background:var(--gradient-soft)">
      <div class="card-row">
        <div class="avatar" style="background:var(--card)">${icon('gift')}</div>
        <div style="flex:1">
          <div class="card-title">${accepted.length} ערכות להכנה לשבת הקרובה</div>
          <div class="card-sub">ריכוז כמותי עבור המדרשה</div>
        </div>
      </div>
      ${accepted.length ? `<button class="btn btn-sm btn-wa" id="tell-midrasha" style="margin-top:12px;width:100%">
        ${icon('whatsapp')} עדכון כמות לאחראית
      </button>` : ''}
    </div>

    ${due.length ? `
      <div class="section-title">${icon('bell')} ממתינות להצעה</div>
      ${due.map((m) => `
        <div class="row" data-offer="${m.id}">
          <div class="avatar">${e(UI.initials(m.motherName))}</div>
          <div class="row-main">
            <div class="row-title">${e(m.motherName)}</div>
            <div class="row-sub">סיימה ארוחות · הגיע הזמן להציע</div>
          </div>
          <button class="icon-btn wa">${icon('whatsapp')}</button>
        </div>`).join('')}
    ` : ''}

    ${kits.length ? `
      <div class="section-title">${icon('filetext')} כל הערכות</div>
      ${kits.sort((a, b) => (b.offeredAt || '').localeCompare(a.offeredAt || '')).map((k) => {
        const m = DB.find('mothers', k.motherId);
        if (!m) return '';
        return `
          <div class="row" data-kit="${k.motherId}">
            <div class="row-main">
              <div class="row-title">${e(m.motherName)}</div>
              <div class="row-sub">${kitStatusText(k)}</div>
            </div>
            <span class="badge ${k.deliveredAt ? 'ok' : k.accepted === true ? 'warn' : k.accepted === false ? 'muted' : 'info'}">
              ${k.deliveredAt ? 'נמסרה' : k.accepted === true ? 'להכנה' : k.accepted === false ? 'ויתרה' : 'ממתינה'}
            </span>
          </div>`;
      }).join('')}
    ` : ''}

    ${!kits.length && !due.length ? UI.empty('gift', 'אין ערכות שבת', 'ערכה מוצעת אוטומטית שבוע אחרי סיום הארוחות') : ''}
  `;
}

function bindKits(root) {
  root.querySelectorAll('[data-offer]').forEach((el) => {
    el.onclick = () => {
      const m = DB.find('mothers', el.dataset.offer);
      DB.insert('kits', { motherId: m.id, offeredAt: todayISO(), accepted: null, deliveredAt: null });
      DB.logEvent(m.id, 'kit', 'הוצעה ערכת סעודת שבת');
      previewMessage(TEMPLATES.shabbatKitOffer.title,
        buildMessage('shabbatKitOffer', { motherName: m.motherName }), m.phone);
      render();
    };
  });

  root.querySelectorAll('[data-kit]').forEach((el) => {
    el.onclick = () => kitForm(el.dataset.kit);
  });

  const tell = root.querySelector('#tell-midrasha');
  if (tell) tell.onclick = () => {
    const n = DB.all('kits').filter((k) => k.accepted === true && !k.deliveredAt).length;
    const names = DB.all('kits')
      .filter((k) => k.accepted === true && !k.deliveredAt)
      .map((k) => { const m = DB.find('mothers', k.motherId); return m ? `• ${m.motherName}` : ''; })
      .join('\n');
    previewMessage('עדכון למדרשה',
      `שלום! 🕯️\nלשבת הקרובה נדרשות *${n}* ערכות סעודת שבת:\n\n${names}\n\nתודה רבה! 💗`, '');
  };
}

function kitForm(motherId) {
  const m = DB.find('mothers', motherId);
  const kit = DB.all('kits').find((k) => k.motherId === motherId);

  UI.modal(`ערכת שבת · ${e(m.motherName)}`, `
    <div id="kf">
      ${UI.select('תשובת היולדת', 'accepted', kit ? String(kit.accepted) : '', [
        { value: 'true', label: 'כן, מעוניינת' },
        { value: 'false', label: 'לא, ויתרה' }
      ])}
      ${UI.field('תאריך מסירה בפועל', 'deliveredAt', kit ? kit.deliveredAt : '', 'date')}
      <button class="btn" id="kf-save">${icon('check')} שמירה</button>
    </div>
  `, (c) => {
    c.querySelector('#kf-save').onclick = () => {
      const data = UI.readForm(c.querySelector('#kf'));
      const patch = {
        accepted: data.accepted === '' ? null : data.accepted === 'true',
        deliveredAt: data.deliveredAt || null
      };

      if (kit) DB.update('kits', kit.id, patch);
      else DB.insert('kits', Object.assign({ motherId, offeredAt: todayISO() }, patch));

      if (patch.deliveredAt) DB.logEvent(motherId, 'kit', 'ערכת סעודת שבת נמסרה');
      else if (patch.accepted === true) DB.logEvent(motherId, 'kit', 'אישרה קבלת ערכת שבת');

      UI.closeModal();
      render();
    };
  });
}

// ------------------------------------------------------------
//  מתנות (לידה + גיל שנה)
// ------------------------------------------------------------
let giftTab = 'birth';

function screenGifts() {
  const tabs = `
    <div class="chips">
      <button class="chip ${giftTab === 'birth' ? 'active' : ''}" data-gtab="birth">מתנות לידה</button>
      <button class="chip ${giftTab === 'year' ? 'active' : ''}" data-gtab="year">מתנות גיל שנה</button>
    </div>`;

  if (giftTab === 'birth') {
    const gifts = DB.all('birthGifts');
    const pending = gifts.filter((g) => g.status !== 'done');

    return `
      ${tabs}
      <div class="card" style="background:var(--gradient-soft)">
        <div class="card-row">
          <div class="avatar" style="background:var(--card)">${icon('scroll')}</div>
          <div style="flex:1">
            <div class="card-title">אות בספר תורה</div>
            <div class="card-sub">${pending.length} אותיות ממתינות להזמנה</div>
          </div>
        </div>
        <button class="btn btn-sm" id="export-letters" style="margin-top:12px;width:100%">
          ${icon('download')} ייצוא לאקסל להזמנת האותיות
        </button>
      </div>

      ${gifts.length ? gifts.map((g) => {
        const m = DB.find('mothers', g.motherId);
        if (!m) return '';
        return `
          <div class="row" data-bgift="${g.id}">
            <div class="avatar">${e(UI.initials(m.motherName))}</div>
            <div class="row-main">
              <div class="row-title">${e(m.motherName)}</div>
              <div class="row-sub">
                ${g.letterOrdered ? '✓ אות הוזמנה' : '○ אות'} ·
                ${g.accessories ? '✓ אביזרים' : '○ אביזרים'}
                ${g.deliveredAt ? ` · נמסרה ${fmtDate(g.deliveredAt)}` : ''}
              </div>
            </div>
            <span class="badge ${g.status === 'done' ? 'ok' : 'warn'}">${g.status === 'done' ? 'נמסרה' : 'ממתינה'}</span>
          </div>`;
      }).join('') : UI.empty('gift', 'אין מתנות לידה', '')}
    `;
  }

  // מתנות גיל שנה
  const gifts = DB.all('yearGifts').sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));

  return `
    ${tabs}
    ${gifts.length ? gifts.map((g) => {
      const m = DB.find('mothers', g.motherId);
      if (!m) return '';
      const contact = g.contactId ? DB.find('contacts', g.contactId) : null;
      const left = g.dueDate ? daysBetween(todayISO(), g.dueDate) : null;
      const soon = left !== null && left <= CONFIG.YEAR_GIFT_REMINDER_DAYS && left >= 0;

      return `
        <div class="row" data-ygift="${g.id}" ${soon ? 'style="border-right:4px solid var(--warn)"' : ''}>
          <div class="avatar">${e(UI.initials(m.motherName))}</div>
          <div class="row-main">
            <div class="row-title">${e(m.childName || m.motherName)}</div>
            <div class="row-sub">
              ${g.dueDate ? `${fmtDate(g.dueDate)} · ${relativeDay(g.dueDate)}` : ''}
              ${contact ? ` · אצל ${e(contact.name)}` : ' · <span style="color:var(--danger)">לא שובץ איש קשר</span>'}
            </div>
          </div>
          <span class="badge ${g.status === 'done' ? 'ok' : soon ? 'warn' : 'muted'}">
            ${g.status === 'done' ? 'נאספה' : 'ממתינה'}
          </span>
        </div>`;
    }).join('') : UI.empty('cake', 'אין מתנות גיל שנה', '')}
  `;
}

function bindGifts(root) {
  root.querySelectorAll('[data-gtab]').forEach((el) => {
    el.onclick = () => { giftTab = el.dataset.gtab; render(); };
  });

  root.querySelectorAll('[data-bgift]').forEach((el) => {
    el.onclick = () => birthGiftForm(el.dataset.bgift);
  });

  root.querySelectorAll('[data-ygift]').forEach((el) => {
    el.onclick = () => yearGiftForm(el.dataset.ygift);
  });

  const exp = root.querySelector('#export-letters');
  if (exp) exp.onclick = () => exportTorahLetters();
}

function birthGiftForm(id) {
  const g = DB.find('birthGifts', id);
  const m = DB.find('mothers', g.motherId);

  UI.modal(`מתנת לידה · ${e(m.motherName)}`, `
    <div id="bgf">
      <div class="check-row">
        <input type="checkbox" name="letterOrdered" id="c1" ${g.letterOrdered ? 'checked' : ''}>
        <label for="c1">אות בספר תורה הוזמנה</label>
      </div>
      <div class="check-row">
        <input type="checkbox" name="accessories" id="c2" ${g.accessories ? 'checked' : ''}>
        <label for="c2">אביזרים נארזו</label>
      </div>
      ${UI.field('תאריך מסירה', 'deliveredAt', g.deliveredAt, 'date')}
      <button class="btn" id="bgf-save">${icon('check')} שמירה</button>
    </div>
  `, (c) => {
    c.querySelector('#bgf-save').onclick = () => {
      const data = UI.readForm(c.querySelector('#bgf'));
      data.deliveredAt = data.deliveredAt || null;
      data.status = data.deliveredAt ? 'done' : 'pending';

      const wasDone = g.status === 'done';
      DB.update('birthGifts', id, data);
      if (data.status === 'done' && !wasDone) DB.logEvent(g.motherId, 'gift', 'מתנת לידה נמסרה');

      UI.closeModal();
      render();
    };
  });
}

function yearGiftForm(id) {
  const g = DB.find('yearGifts', id);
  const m = DB.find('mothers', g.motherId);
  const contacts = DB.all('contacts');

  // ברירת מחדל: איש הקשר של השכונה של היולדת
  const suggested = contacts.find((c) => c.neighborhood === m.neighborhood);

  UI.modal(`מתנת גיל שנה · ${e(m.childName || m.motherName)}`, `
    <div id="ygf">
      ${UI.field('תאריך יעד', 'dueDate', g.dueDate, 'date')}
      ${UI.select('נקודת איסוף', 'contactId', g.contactId || (suggested ? suggested.id : ''),
        contacts.map((c) => ({ value: c.id, label: `${c.name} · ${nbhdName(c.neighborhood)}` })))}
      ${UI.field('תאריך איסוף בפועל', 'collectedAt', g.collectedAt, 'date')}
      <button class="btn" id="ygf-save">${icon('check')} שמירה</button>
      <button class="btn btn-wa" id="ygf-wa" style="margin-top:9px">
        ${icon('whatsapp')} שליחת הודעה לאמא
      </button>
    </div>
  `, (c) => {
    c.querySelector('#ygf-save').onclick = () => {
      const data = UI.readForm(c.querySelector('#ygf'));
      data.contactId = data.contactId || null;
      data.collectedAt = data.collectedAt || null;
      data.status = data.collectedAt ? 'done' : 'pending';

      const wasDone = g.status === 'done';
      DB.update('yearGifts', id, data);

      if (data.status === 'done' && !wasDone) {
        DB.logEvent(g.motherId, 'gift', 'מתנת גיל שנה נאספה');
        // המתנה ירדה ממלאי איש הקשר
        if (data.contactId) {
          const ct = DB.find('contacts', data.contactId);
          if (ct) DB.update('contacts', ct.id, { giftsInStock: Math.max(0, (ct.giftsInStock || 0) - 1) });
        }
      }
      UI.closeModal();
      render();
    };

    c.querySelector('#ygf-wa').onclick = () => {
      const cid = c.querySelector('[name="contactId"]').value;
      const contact = cid ? DB.find('contacts', cid) : null;
      if (!contact) return UI.toast('יש לבחור נקודת איסוף קודם');

      UI.closeModal();
      previewMessage(TEMPLATES.yearGiftReady.title, buildMessage('yearGiftReady', {
        motherName: m.motherName,
        childName: m.childName,
        contactName: contact.name,
        contactAddress: contact.address,
        contactPhone: contact.phone,
        contactNbhd: nbhdName(contact.neighborhood)
      }), m.phone);
    };
  });
}

// ייצוא רשימת אותיות בספר תורה לאקסל (CSV עם BOM כדי שעברית תיפתח נכון)
function exportTorahLetters() {
  const rows = DB.all('birthGifts')
    .filter((g) => !g.letterOrdered)
    .map((g) => {
      const m = DB.find('mothers', g.motherId);
      if (!m) return null;
      return [m.childName || '', m.motherName || '', m.lastName || '', m.birthDate || '', nbhdName(m.neighborhood), m.phone || ''];
    })
    .filter(Boolean);

  if (!rows.length) return UI.toast('אין אותיות ממתינות להזמנה');

  const header = ['שם הילד/ה', 'שם האמא', 'שם משפחה', 'תאריך לידה', 'שכונה', 'טלפון'];
  const csv = [header, ...rows]
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  // BOM חיוני — בלעדיו אקסל פותח עברית כג'יבריש
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `אותיות-ספר-תורה-${todayISO()}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  UI.toast(`יוצאו ${rows.length} שורות`);
}

// ------------------------------------------------------------
//  בוקר ליולדות
// ------------------------------------------------------------
function screenEvents() {
  const events = DB.all('events').sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return `
    ${events.length ? events.map((ev) => {
      const invited = (ev.invitees || []).length;
      const came = (ev.attendance || []).length;
      const past = ev.date < todayISO();

      return `
        <div class="card" data-event="${ev.id}">
          <div class="card-row">
            <div class="avatar">${icon('coffee')}</div>
            <div style="flex:1">
              <div class="card-title">${fmtDateFull(ev.date)}</div>
              <div class="card-sub">${e(ev.location || '')}${ev.speakers ? ` · ${e(ev.speakers)}` : ''}</div>
            </div>
            <span class="badge ${past ? 'muted' : 'ok'}">${past ? 'הסתיים' : relativeDay(ev.date)}</span>
          </div>
          <div style="display:flex;gap:6px;margin-top:11px;flex-wrap:wrap">
            <span class="badge">${icon('users', 12)} ${invited} הוזמנו</span>
            ${past ? `<span class="badge ok">${icon('check', 12)} ${came} הגיעו</span>` : ''}
            ${ev.chairs ? `<span class="badge muted">${ev.chairs} כיסאות</span>` : ''}
          </div>
        </div>`;
    }).join('') : UI.empty('coffee', 'אין מפגשים', 'לחצי על + ליצירת בוקר ליולדות')}

    <button class="fab" id="add-event">${icon('plus')}</button>
  `;
}

function bindEvents(root) {
  root.querySelectorAll('[data-event]').forEach((el) => {
    el.onclick = () => eventDetail(el.dataset.event);
  });
  root.querySelector('#add-event').onclick = () => eventForm();
}

function eventForm(id, presetDate) {
  const ev = id ? DB.find('events', id) : (presetDate ? { date: presetDate } : {});
  UI.modal(id ? 'עריכת מפגש' : 'בוקר ליולדות חדש', `
    <div id="ef">
      ${UI.field('תאריך *', 'date', ev.date, 'date')}
      ${UI.field('מיקום', 'location', ev.location)}
      ${UI.field('מרצה / מרצות', 'speakers', ev.speakers)}
      <div class="field-row">
        ${UI.field('כמות כיסאות', 'chairs', ev.chairs, 'number')}
        ${UI.field('כמות כיבוד', 'refreshments', ev.refreshments, 'number')}
      </div>
      <button class="btn" id="ef-save">${icon('check')} שמירה</button>
    </div>
  `, (c) => {
    c.querySelector('#ef-save').onclick = () => {
      const data = UI.readForm(c.querySelector('#ef'));
      if (!data.date) return UI.toast('חובה למלא תאריך');
      if (id) DB.update('events', id, data);
      else DB.insert('events', Object.assign({ invitees: [], attendance: [] }, data));
      UI.closeModal();
      render();
    };
  });
}

// מוזמנות = יולדות שהילד/ה שלהן עד גיל שנה
function eligibleForEvent() {
  return DB.all('mothers').filter((m) => m.birthDate && monthsSince(m.birthDate) < 12);
}

function eventDetail(id) {
  const ev = DB.find('events', id);
  const eligible = eligibleForEvent();
  const past = ev.date < todayISO();

  UI.modal(fmtDateFull(ev.date), `
    <div class="card-sub" style="margin-bottom:14px">
      ${icon('mappin', 13)} ${e(ev.location || '—')}
      ${ev.speakers ? `<br>${icon('user', 13)} ${e(ev.speakers)}` : ''}
      ${ev.chairs ? `<br>${ev.chairs} כיסאות · ${ev.refreshments || 0} מנות כיבוד` : ''}
    </div>

    <div class="btn-row" style="margin-bottom:16px">
      <button class="btn btn-ghost btn-sm" style="flex:1" id="ev-edit">${icon('edit')} עריכה</button>
      <button class="btn btn-wa btn-sm" style="flex:1" id="ev-invite">${icon('whatsapp')} ${past ? 'הודעה' : 'הזמנות'}</button>
    </div>

    <div class="section-title">${icon('users')} יולדות עד גיל שנה (${eligible.length})</div>
    ${eligible.map((m) => `
      <div class="check-row">
        <input type="checkbox" data-att="${m.id}" id="a-${m.id}"
          ${(ev.attendance || []).includes(m.id) ? 'checked' : ''}>
        <label for="a-${m.id}">${e(m.motherName)} · ${e(nbhdName(m.neighborhood))}</label>
      </div>`).join('') || '<div class="card-sub">אין יולדות מתאימות</div>'}

    <button class="btn" id="ev-save" style="margin-top:14px">${icon('check')} שמירת נוכחות</button>
    <button class="btn btn-ghost" id="ev-del" style="margin-top:9px;color:var(--danger)">${icon('trash')} מחיקת מפגש</button>
  `, (c) => {
    c.querySelector('#ev-edit').onclick = () => { UI.closeModal(); eventForm(id); };

    c.querySelector('#ev-invite').onclick = () => {
      UI.closeModal();
      inviteList(ev, eligible, past ? 'eventReminder' : 'eventInvite');
    };

    c.querySelector('#ev-save').onclick = () => {
      const attendance = [...c.querySelectorAll('[data-att]:checked')].map((x) => x.dataset.att);
      DB.update('events', id, { attendance });
      attendance.forEach((mid) => {
        const already = DB.timelineFor(mid).some((t) => t.type === 'event' && t.text.includes(fmtDate(ev.date)));
        if (!already) DB.logEvent(mid, 'event', `השתתפה בבוקר ליולדות (${fmtDate(ev.date)})`);
      });
      UI.closeModal();
      UI.toast(`נשמרה נוכחות של ${attendance.length}`);
      render();
    };

    c.querySelector('#ev-del').onclick = () => {
      UI.closeModal();
      UI.confirm('מחיקת מפגש', 'למחוק את המפגש?', () => { DB.remove('events', id); render(); });
    };
  });
}

function inviteList(ev, eligible, tplKey) {
  UI.modal(TEMPLATES[tplKey].title, eligible.length ? eligible.map((m) => `
    <div class="row" data-inv="${m.id}">
      <div class="icon-btn wa">${icon('whatsapp')}</div>
      <div class="row-main">
        <div class="row-title">${e(m.motherName)}</div>
        <div class="row-sub">${e(m.phone || 'אין טלפון')}</div>
      </div>
      ${icon('back')}
    </div>`).join('') : '<div class="card-sub">אין יולדות מתאימות</div>',
  (c) => {
    c.querySelectorAll('[data-inv]').forEach((el) => {
      el.onclick = () => {
        const m = DB.find('mothers', el.dataset.inv);
        const invitees = ev.invitees || [];
        if (!invitees.includes(m.id)) DB.update('events', ev.id, { invitees: [...invitees, m.id] });

        previewMessage(TEMPLATES[tplKey].title, buildMessage(tplKey, {
          motherName: m.motherName,
          dateFull: fmtDateFull(ev.date),
          location: ev.location,
          speakers: ev.speakers
        }), m.phone);
      };
    });
  });
}

// ------------------------------------------------------------
//  דוחות
// ------------------------------------------------------------
function screenReports() {
  const mothers = DB.all('mothers');
  const thisMonth = new Date().toISOString().slice(0, 7);
  const newThisMonth = mothers.filter((m) => (m.createdAt || '').slice(0, 7) === thisMonth).length;

  const byNbhd = NEIGHBORHOODS.map((n) => ({
    name: n.name,
    color: n.color,
    count: mothers.filter((m) => m.neighborhood === n.id).length
  }));
  const maxN = Math.max(1, ...byNbhd.map((x) => x.count));

  const mealsDone = DB.all('meals').filter((m) => m.status === 'done').length;
  const birthDone = DB.all('birthGifts').filter((g) => g.status === 'done').length;
  const yearDone = DB.all('yearGifts').filter((g) => g.status === 'done').length;
  const kitsDone = DB.all('kits').filter((k) => k.deliveredAt).length;

  const events = DB.all('events').filter((ev) => ev.date < todayISO());
  const totalInvited = events.reduce((a, ev) => a + (ev.invitees || []).length, 0);
  const totalCame = events.reduce((a, ev) => a + (ev.attendance || []).length, 0);
  const attendPct = totalInvited ? Math.round((totalCame / totalInvited) * 100) : 0;

  return `
    <div class="stat-grid">
      <div class="stat">
        <div class="stat-num" style="color:var(--primary)">${newThisMonth}</div>
        <div class="stat-label">יולדות נרשמו החודש</div>
      </div>
      <div class="stat">
        <div class="stat-num" style="color:var(--ok)">${mothers.length}</div>
        <div class="stat-label">סה"כ יולדות</div>
      </div>
      <div class="stat">
        <div class="stat-num" style="color:var(--info)">${mealsDone}</div>
        <div class="stat-label">ארוחות סופקו</div>
      </div>
      <div class="stat">
        <div class="stat-num" style="color:var(--accent)">${birthDone + yearDone}</div>
        <div class="stat-label">מתנות חולקו</div>
      </div>
    </div>

    <div class="section-title">${icon('mappin')} יולדות לפי שכונה</div>
    <div class="card">
      ${byNbhd.map((n) => `
        <div style="margin-bottom:13px">
          <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;margin-bottom:5px">
            <span>${e(n.name)}</span><span>${n.count}</span>
          </div>
          <div style="height:8px;background:var(--bg);border-radius:999px;overflow:hidden">
            <div style="height:100%;width:${(n.count / maxN) * 100}%;background:${n.color};border-radius:999px"></div>
          </div>
        </div>`).join('')}
    </div>

    <div class="section-title">${icon('gift')} פירוט חלוקה</div>
    <div class="row"><div class="row-main"><div class="row-title">מתנות לידה</div></div><span class="badge ok">${birthDone}</span></div>
    <div class="row"><div class="row-main"><div class="row-title">מתנות גיל שנה</div></div><span class="badge ok">${yearDone}</span></div>
    <div class="row"><div class="row-main"><div class="row-title">ערכות שבת</div></div><span class="badge ok">${kitsDone}</span></div>

    <div class="section-title">${icon('coffee')} בוקר ליולדות</div>
    <div class="card">
      <div class="card-row">
        <div class="stat-num" style="color:var(--primary)">${attendPct}%</div>
        <div style="flex:1">
          <div class="card-title">אחוז השתתפות</div>
          <div class="card-sub">${totalCame} הגיעו מתוך ${totalInvited} שהוזמנו · ${events.length} מפגשים</div>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
//  לוח שנה עברי
// ============================================================
let calOffset = 0; // חודשים מהיום

// המרת מספר לגימטריה עברית (למשל 786 -> תשפ״ו, 5 -> ה׳)
function gematria(num) {
  if (!num) return '';
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
  const hundreds = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק'];
  let n = num % 1000; // מורידים את האלפים (5786 -> 786)
  let s = hundreds[Math.floor(n / 100)];
  n %= 100;
  if (n === 15) s += 'טו';
  else if (n === 16) s += 'טז';
  else { s += tens[Math.floor(n / 10)]; s += ones[n % 10]; }
  // גרשיים/גרש
  if (s.length > 1) s = s.slice(0, -1) + '״' + s.slice(-1);
  else s += '׳';
  return s;
}

function hebParts(date) {
  // ממיר לתאריך עברי באמצעות לוח השנה המובנה של הדפדפן
  const fmt = new Intl.DateTimeFormat('he-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' });
  const parts = fmt.formatToParts(date);
  const get = (t) => (parts.find((p) => p.type === t) || {}).value || '';
  const dayNum = parseInt(get('day'), 10);
  const yearNum = parseInt(get('year'), 10);
  return {
    day: gematria(dayNum),
    dayNum: dayNum,
    month: get('month'),
    year: gematria(yearNum),
    yearNum: yearNum
  };
}

// רשימת חודשי השנה העברית (לפי השנה — מטפל בשנה מעוברת)
function hebMonthsOfYear(hy) {
  const months = [];
  let d = new Date(hy - 3761, 7, 1); // אוגוסט של השנה הלועזית המשוערת
  let g = 0;
  while (hebParts(d).yearNum < hy && g < 420) { d.setDate(d.getDate() + 1); g++; }
  g = 0;
  while (hebParts(d).yearNum === hy && g < 420) {
    const mn = hebParts(d).month;
    if (!months.includes(mn)) months.push(mn);
    d.setDate(d.getDate() + 1); g++;
  }
  return months;
}

// המרת תאריך עברי (שנה, שם-חודש, יום) לתאריך לועזי — עם מטמון
const __h2g = {};
function hebrewToGregorian(hy, hMonth, hDay) {
  const key = hy + '|' + hMonth + '|' + hDay;
  if (__h2g[key]) return new Date(__h2g[key]);
  let d = new Date(hy - 3762, 7, 1);
  d.setHours(12, 0, 0, 0); // צהריים — עקבי עם שאר החישובים
  for (let i = 0; i < 800; i++) {
    const p = hebParts(d);
    if (p.yearNum === hy && p.month === hMonth && p.dayNum === hDay) { __h2g[key] = d.toISOString(); return new Date(d); }
    d.setDate(d.getDate() + 1);
  }
  return null;
}

// מוצא את התאריך הלועזי של א' בחודש העברי שמכיל את התאריך הנתון
function hebMonthStart(ref) {
  const d = new Date(ref);
  d.setHours(12, 0, 0, 0);
  const day = hebParts(d).dayNum;
  d.setDate(d.getDate() - (day - 1));
  return d;
}

// תאריך רפרנס נוכחי ללוח (ISO)
let calRefISO = todayISO();

function screenCalendar() {
  const ref = new Date(calRefISO + 'T12:00:00');
  const start = hebMonthStart(ref); // א' בחודש העברי (תאריך לועזי)

  // אורך החודש העברי: סופרים ימים עד שהחודש משתנה
  const startHeb = hebParts(start);
  const days = [];
  let d = new Date(start);
  while (hebParts(d).month === startHeb.month && hebParts(d).yearNum === startHeb.yearNum) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
    if (days.length > 31) break;
  }

  const todayStr = todayISO();
  const dayNames = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
  const startWeekday = start.getDay();

  // טווח החודשים הלועזיים
  const g0 = days[0].toLocaleDateString('he-IL', { month: 'long' });
  const gN = days[days.length - 1].toLocaleDateString('he-IL', { month: 'long' });
  const gYear = days[days.length - 1].getFullYear();
  const gregLabel = g0 === gN ? `${g0} ${gYear}` : `${g0}–${gN} ${gYear}`;

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  days.forEach((dt) => cells.push(dt));

  const eventsByDate = {};
  DB.all('events').forEach((ev) => { (eventsByDate[ev.date] = eventsByDate[ev.date] || []).push(ev); });

  return `
    <div class="screen-head">
      <div>
        <h2 class="screen-title">${icon('calendar')} לוח שנה עברי</h2>
        <div class="screen-sub">היום: ${hebParts(new Date()).day} ${hebParts(new Date()).month} ${hebParts(new Date()).year}</div>
      </div>
    </div>

    <div class="cal">
      <div class="cal-nav">
        <button id="cal-prev">${icon('back', 18)}</button>
        <div class="cal-title">
          <div class="cal-heb">${e(startHeb.month)} ${e(startHeb.year)}</div>
          <div class="cal-greg">${e(gregLabel)}</div>
        </div>
        <button id="cal-next" style="transform:scaleX(-1)">${icon('back', 18)}</button>
      </div>

      <div class="cal-grid cal-head">
        ${dayNames.map((dn) => `<div class="cal-dayname">${dn}</div>`).join('')}
      </div>

      <div class="cal-grid">
        ${cells.map((dt) => {
          if (!dt) return '<div class="cal-cell empty"></div>';
          const iso = dt.toISOString().slice(0, 10);
          const heb = hebParts(dt);
          const isToday = iso === todayStr;
          const hasEvent = eventsByDate[iso];
          return `
            <button class="cal-cell ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}" data-cal-date="${iso}">
              <span class="cal-greg-num">${dt.getDate()}/${dt.getMonth() + 1}</span>
              <span class="cal-heb-num">${heb.day}</span>
              ${hasEvent ? '<span class="cal-dot"></span>' : ''}
            </button>`;
        }).join('')}
      </div>
    </div>
  `;
}

function bindCalendar(root) {
  root.querySelector('#cal-prev').onclick = () => {
    const start = hebMonthStart(new Date(calRefISO + 'T12:00:00'));
    start.setDate(start.getDate() - 1); // יום לפני א' = החודש הקודם
    calRefISO = start.toISOString().slice(0, 10);
    render();
  };
  root.querySelector('#cal-next').onclick = () => {
    const ref = new Date(calRefISO + 'T12:00:00');
    const start = hebMonthStart(ref);
    let d = new Date(start);
    const sh = hebParts(start);
    while (hebParts(d).month === sh.month && hebParts(d).yearNum === sh.yearNum) { d.setDate(d.getDate() + 1); }
    calRefISO = d.toISOString().slice(0, 10);
    render();
  };
  root.querySelectorAll('[data-cal-date]').forEach((el) => {
    el.onclick = () => calDateActions(el.dataset.calDate);
  });
}

// לחיצה על תאריך בלוח — הצגת אירועים + הוספת אירוע
function calDateActions(iso) {
  const evs = DB.all('events').filter((ev) => ev.date === iso);
  const heb = hebParts(new Date(iso + 'T12:00:00'));
  UI.modal(`${heb.day} ${heb.month} · ${fmtDateFull(iso)}`, `
    ${evs.length ? evs.map((ev) => `
      <div class="row" data-cal-event="${ev.id}">
        <div class="icon-btn">${icon('coffee')}</div>
        <div class="row-main"><div class="row-title">${e(ev.location || 'אירוע')}</div><div class="row-sub">${e(ev.speakers || '')}</div></div>
      </div>`).join('') : '<div class="empty-inline" style="margin-bottom:10px">אין אירועים ביום זה</div>'}
    <button class="btn" id="cal-add-event">${icon('plus')} הוספת אירוע ליום זה</button>
  `, (c) => {
    c.querySelector('#cal-add-event').onclick = () => { UI.closeModal(); eventForm(null, iso); };
    c.querySelectorAll('[data-cal-event]').forEach((el) => {
      el.onclick = () => { UI.closeModal(); eventDetail(el.dataset.calEvent); };
    });
  });
}

// ============================================================
//  אותיות בספר תורה
// ============================================================
function screenTorah() {
  const gifts = DB.all('birthGifts');
  const pending = gifts.filter((g) => !g.letterOrdered);
  const ordered = gifts.filter((g) => g.letterOrdered);

  const rowFor = (g) => {
    const m = DB.find('mothers', g.motherId);
    if (!m) return '';
    return `
      <div class="row" data-torah="${g.id}">
        <div class="avatar">${e(UI.initials(m.motherName))}</div>
        <div class="row-main">
          <div class="row-title">${e(m.childName || m.motherName)} ${e(m.lastName || '')}</div>
          <div class="row-sub">${e(nbhdName(m.neighborhood))}${m.birthDate ? ` · ${fmtDate(m.birthDate)}` : ''}</div>
        </div>
        <span class="badge ${g.letterOrdered ? 'ok' : 'warn'}">${g.letterOrdered ? 'הוזמנה' : 'ממתינה'}</span>
      </div>`;
  };

  return `
    <div class="screen-head">
      <div>
        <h2 class="screen-title">${icon('scroll')} אותיות בספר תורה</h2>
        <div class="screen-sub">${pending.length} ממתינות להזמנה</div>
      </div>
      <button class="btn btn-sm" id="torah-export" style="width:auto">${icon('download')} ייצוא לאקסל</button>
    </div>

    ${pending.length ? `<div class="section-title">${icon('clock')} ממתינות (${pending.length})</div>
      ${pending.map(rowFor).join('')}` : ''}
    ${ordered.length ? `<div class="section-title">${icon('check')} הוזמנו (${ordered.length})</div>
      ${ordered.map(rowFor).join('')}` : ''}
    ${!gifts.length ? UI.empty('scroll', 'אין רשומות', 'אותיות נפתחות אוטומטית עם הוספת יולדת') : ''}
  `;
}

function bindTorah(root) {
  const exp = root.querySelector('#torah-export');
  if (exp) exp.onclick = () => exportTorahLetters();

  root.querySelectorAll('[data-torah]').forEach((el) => {
    el.onclick = () => {
      const g = DB.find('birthGifts', el.dataset.torah);
      const m = DB.find('mothers', g.motherId);
      UI.confirm('אות בספר תורה',
        g.letterOrdered ? `לסמן את האות של ${e(m.childName || m.motherName)} כלא הוזמנה?` : `לסמן שהאות של ${e(m.childName || m.motherName)} הוזמנה?`,
        () => { DB.update('birthGifts', g.id, { letterOrdered: !g.letterOrdered }); render(); });
    };
  });
}

// ============================================================
//  שכונות — יולדות מקובצות לפי אזור
// ============================================================
let openNbhd = ''; // שכונה פתוחה כרגע (ריק = כולן סגורות)

function screenNeighborhoods() {
  const active = DB.all('mothers').filter((m) => m.status === 'active');
  return `
    <div class="screen-head">
      <div>
        <h2 class="screen-title">${icon('mappin')} שכונות</h2>
        <div class="screen-sub">לחצי על שכונה לצפייה ביולדות</div>
      </div>
    </div>

    ${NEIGHBORHOODS.map((n) => {
      const inN = active.filter((m) => m.neighborhood === n.id);
      const isOpen = openNbhd === n.id;
      return `
        <div class="nbhd-block">
          <button class="nbhd-header ${isOpen ? 'open' : ''}" data-nbhd-toggle="${n.id}" style="border-inline-start:5px solid ${n.color}">
            <span class="nbhd-header-name"><span class="nbhd-dot" style="background:${n.color}"></span> ${e(n.name)}</span>
            <span class="nbhd-count">${inN.length} ${icon(isOpen ? 'minus' : 'plus', 15)}</span>
          </button>
          ${isOpen ? `<div class="nbhd-body">
            ${inN.length ? inN.map((m) => `
              <div class="row" data-mother="${m.id}">
                <div class="avatar">${e(UI.initials(m.motherName))}</div>
                <div class="row-main">
                  <div class="row-title">${e(m.motherName)} ${e(m.lastName || '')}</div>
                  <div class="row-sub">${e(m.address || '')}</div>
                </div>
                ${m.phone ? `<a class="icon-btn wa" href="tel:${escapeAttr(m.phone)}">${icon('phone')}</a>` : ''}
              </div>`).join('') : '<div class="empty-inline">אין יולדות באזור זה</div>'}
          </div>` : ''}
        </div>`;
    }).join('')}
  `;
}

function bindNeighborhoods(root) {
  root.querySelectorAll('[data-nbhd-toggle]').forEach((el) => {
    el.onclick = () => { openNbhd = (openNbhd === el.dataset.nbhdToggle) ? '' : el.dataset.nbhdToggle; render(); };
  });
  root.querySelectorAll('[data-mother]').forEach((el) => {
    el.onclick = () => go('mother-profile', el.dataset.mother);
  });
}

// ============================================================
//  הודעות מהמנהלת המשנית
// ============================================================
function screenMessages() {
  const me = DB.me;
  const notes = DB.all('notes').sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  return `
    <div class="screen-head">
      <div>
        <h2 class="screen-title">${icon('message')} הודעות</h2>
        <div class="screen-sub">הודעות בין המנהלות</div>
      </div>
      ${me.role !== 'admin' ? `<button class="btn btn-sm" id="msg-new" style="width:auto">${icon('plus')} הודעה</button>` : ''}
    </div>

    ${notes.length ? notes.map((n) => {
      const from = DB.find('users', n.fromUserId);
      return `
        <div class="card">
          <div class="row-title">${e(n.text)}</div>
          <div class="row-sub" style="margin-top:6px">${e(from ? from.name : 'מנהלת')} · ${relativeDay(n.date)} ${n.read ? '· נקראה' : ''}</div>
          ${!n.read && me.role === 'admin' ? `<button class="btn btn-ghost btn-sm" data-read="${n.id}" style="margin-top:10px">${icon('check')} סימון כנקראה</button>` : ''}
        </div>`;
    }).join('') : UI.empty('message', 'אין הודעות', '')}
  `;
}

function bindMessages(root) {
  root.querySelectorAll('[data-read]').forEach((el) => {
    el.onclick = () => { DB.update('notes', el.dataset.read, { read: true }); render(); };
  });
  const nw = root.querySelector('#msg-new');
  if (nw) nw.onclick = () => {
    UI.modal('הודעה למנהלת הראשית', `
      <div id="nf3">${UI.textarea('תוכן', 'text', '')}
      <button class="btn" id="nf3-save">${icon('check')} שליחה</button></div>
    `, (c) => {
      c.querySelector('#nf3-save').onclick = () => {
        const { text } = UI.readForm(c.querySelector('#nf3'));
        if (!text) return UI.toast('חובה למלא תוכן');
        DB.insert('notes', { fromUserId: DB.me.id, text, date: todayISO(), read: false });
        UI.closeModal();
        UI.toast('נשלח');
        render();
      };
    });
  };
}

// ============================================================
//  תמונות (Supabase Storage)
// ============================================================
function screenImages() {
  return `
    <div class="screen-head">
      <div>
        <h2 class="screen-title">${icon('filetext')} תמונות</h2>
        <div class="screen-sub">קבצים ותמונות של הארגון</div>
      </div>
      <button class="btn btn-sm" id="img-upload" style="width:auto">${icon('download')} העלאה</button>
    </div>
    <div class="card" id="img-list">
      <div class="empty-inline" style="padding:30px 0">טוען...</div>
    </div>
  `;
}

function bindImages(root) {
  loadImages(root);
  const up = root.querySelector('#img-upload');
  if (up) up.onclick = () => {
    if (!window.__sb) return UI.toast('העלאת תמונות זמינה רק במצב מחובר');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const f = input.files[0];
      if (!f) return;
      UI.toast('מעלה...');
      // תיקיית private תואמת לתבנית ההרשאות הסטנדרטית של Supabase
      const path = 'private/' + Date.now() + '-' + f.name.replace(/[^\w.\-]/g, '_');
      const { error } = await window.__sb.storage.from('images').upload(path, f);
      if (error) return UI.toast('שגיאה: ' + error.message);
      UI.toast('הועלה');
      loadImages(root);
    };
    input.click();
  };
}

async function loadImages(root) {
  const list = root.querySelector('#img-list');
  if (!list) return;
  if (!window.__sb) {
    list.innerHTML = '<div class="empty-inline" style="padding:20px 0">תמונות זמינות רק במצב מחובר לענן</div>';
    return;
  }
  const res = await window.__sb.storage.from('images').list('private', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
  if (res.error) {
    list.innerHTML = '<div class="empty-inline" style="padding:20px 0">' + e(res.error.message) + '</div>';
    return;
  }
  const files = (res.data || []).filter((f) => f.name && !f.name.startsWith('.'));
  if (!files.length) {
    list.innerHTML = '<div class="empty-inline" style="padding:20px 0">אין תמונות עדיין</div>';
    return;
  }
  list.innerHTML = '<div class="img-grid">' + files.map((f) => {
    const url = window.__sb.storage.from('images').getPublicUrl('private/' + f.name).data.publicUrl;
    return '<a href="' + url + '" target="_blank" class="img-thumb"><img src="' + url + '" loading="lazy"></a>';
  }).join('') + '</div>';
}
