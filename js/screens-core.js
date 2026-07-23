// ============================================================
//  מסכי ליבה: דשבורד · יולדות · מתנדבות · אנשי קשר · מלאי
// ============================================================

// ------------------------------------------------------------
//  דשבורד
// ------------------------------------------------------------
function screenDashboard() {
  const me = DB.me;
  const mothers = DB.all('mothers').filter((m) => m.status === 'active');
  const lowStock = DB.lowStock();
  const notes = me.role === 'admin' ? DB.all('notes').filter((n) => !n.read) : [];
  const yearDue = DB.yearGiftDueSoon();
  const delivery = DB.weeklyList('meal');
  const shabbat = DB.weeklyList('shabbat');
  const birthdays = DB.upcomingBirthdays();

  const quickActions = [
    { id: 'tasks', label: 'משימות', icon: 'filetext' },
    { id: 'torah', label: 'אות בס״ת', icon: 'scroll' },
    { id: 'gifts', label: 'מתנות', icon: 'gift' },
    { id: 'inventory', label: 'מלאי', icon: 'package' },
    { id: 'neighborhoods', label: 'שכונות', icon: 'mappin' },
    { id: 'volunteers', label: 'מתנדבות', icon: 'users' },
    { id: 'events', label: 'בוקר ליולדות', icon: 'coffee' },
    { id: 'mothers', label: 'יולדות', icon: 'heart' }
  ];

  const weeklyBox = (title, iconName, list, kind) => `
    <div class="card">
      <div class="wk-head">
        <div class="card-title" style="display:flex;align-items:center;gap:7px">${icon(iconName, 16)} ${title} (${list.length})</div>
        ${list.length && canSendDriver() ? `<button class="btn btn-wa btn-sm" style="width:auto" data-send-week="${kind}">${icon('whatsapp')} למשנעת</button>` : ''}
      </div>
      ${list.length ? list.map((w) => {
        const m = DB.find('mothers', w.motherId);
        if (!m) return '';
        return `
          <div class="task-row" data-mother="${w.motherId}">
            <div>
              <div class="row-title">${w.done ? '✓ ' : ''}${e(m.motherName)} ${e(m.lastName || '')}</div>
              <div class="row-sub">${e(m.address || '')} · ${e(nbhdName(m.neighborhood))}</div>
            </div>
            <button class="icon-btn" data-week-remove="${w.id}">${icon('x', 15)}</button>
          </div>`;
      }).join('') : '<div class="empty-inline">הרשימה ריקה — מתאפסת כל שישי 12:00</div>'}
    </div>`;

  return `
    <div class="screen-head">
      <div>
        <h2 class="screen-title">${icon('home')} מסך הבית</h2>
        <div class="screen-sub">סקירה מהירה של הפעילות בארגון</div>
      </div>
      <div class="head-icons">
        ${lowStock.length ? `<button class="head-ico warn" id="go-low" title="מלאי נמוך">${icon('alert', 18)}<span class="head-badge">${lowStock.length}</span></button>` : ''}
        <button class="head-ico ${notes.length ? 'has' : ''}" id="go-msg" title="הודעות">${icon('message', 18)}${notes.length ? `<span class="head-badge">${notes.length}</span>` : ''}</button>
        <button class="head-ico" id="go-cal" title="לוח שנה">${icon('calendar', 18)}</button>
      </div>
    </div>

    ${yearDue.length ? `
      <div class="task-card-green">
        <div class="task-card-title">${icon('cake', 16)} להכין מתנת גיל שנה (${yearDue.length})</div>
        ${yearDue.slice(0, 4).map((g) => {
          const m = DB.find('mothers', g.motherId);
          if (!m) return '';
          return `
            <div class="task-row" data-mother="${g.motherId}">
              <div>
                <div class="row-title">${e(m.childName || m.motherName)} ${e(m.lastName || '')}</div>
                <div class="row-sub">יום הולדת ${relativeDay(g.dueDate)}</div>
              </div>
              <span class="badge ${g.contactId ? 'warn' : 'danger'}">${g.contactId ? 'ממתין' : 'ללא איש קשר'}</span>
            </div>`;
        }).join('')}
      </div>` : ''}

    ${birthdays.length ? `
      <div class="task-card-pink">
        <div class="task-card-title pink">${icon('cake', 16)} ימי הולדת למתנדבות</div>
        ${birthdays.slice(0, 4).map(({ v, days }) => `
          <div class="task-row">
            <div>
              <div class="row-title">${e(v.name)}</div>
              <div class="row-sub">${days === 0 ? 'היום! 🎉' : days === 1 ? 'מחר' : `בעוד ${days} ימים`}</div>
            </div>
            <button class="icon-btn wa" data-bday="${v.id}">${icon('whatsapp', 15)}</button>
          </div>`).join('')}
      </div>` : ''}

    ${weeklyBox('שינוע שבועי', 'truck', delivery, 'meal')}
    ${weeklyBox('ערכת שבת', 'gift', shabbat, 'shabbat')}

    <div class="quick-actions">
      ${quickActions.map((a) => `
        <button class="quick-action" data-qa="${a.id}">
          <div class="quick-action-ico">${icon(a.icon, 20)}</div>
          <span>${e(a.label)}</span>
        </button>`).join('')}
    </div>
  `;
}

function bindDashboard(root) {
  root.querySelectorAll('[data-go]').forEach((el) => {
    el.onclick = () => go(el.dataset.go);
  });

  root.querySelectorAll('[data-qa]').forEach((el) => {
    el.onclick = () => go(el.dataset.qa);
  });

  root.querySelectorAll('[data-mother]').forEach((el) => {
    el.onclick = () => go('mother-profile', el.dataset.mother);
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

  // אייקוני כותרת
  const low = root.querySelector('#go-low');
  if (low) low.onclick = () => go('inventory');
  const msg = root.querySelector('#go-msg');
  if (msg) msg.onclick = () => go('messages');
  const cal = root.querySelector('#go-cal');
  if (cal) cal.onclick = () => go('calendar');

  // הסרת יולדת מהרשימה השבועית
  root.querySelectorAll('[data-week-remove]').forEach((el) => {
    el.onclick = (ev) => { ev.stopPropagation(); DB.remove('weekly', el.dataset.weekRemove); render(); };
  });

  // שליחת הרשימה השבועית למשנעת
  root.querySelectorAll('[data-send-week]').forEach((el) => {
    el.onclick = (ev) => { ev.stopPropagation(); sendWeeklyToDriver(el.dataset.sendWeek); };
  });
}

// שליחת רשימת שינוע/ערכות שבת למשנעת אחת (wa.me עם כתובות + Waze)
function sendWeeklyToDriver(kind) {
  const list = DB.weeklyList(kind);
  if (!list.length) return UI.toast('הרשימה ריקה');
  const drivers = DB.all('volunteers').filter((v) => v.roleType === 'driver' || v.roleType === 'both' || !v.roleType);

  UI.modal('שליחה למשנעת', `
    <div class="card-sub" style="margin-bottom:12px">בחרי משנעת — היא תקבל את כל הרשימה (${list.length}) עם כתובות וקישורי Waze.</div>
    ${drivers.length ? drivers.map((v) => `
      <div class="row" data-driver="${v.id}">
        <div class="avatar">${e(UI.initials(v.name))}</div>
        <div class="row-main"><div class="row-title">${e(v.name)}</div><div class="row-sub">${e(v.phone || '')}</div></div>
        ${icon('whatsapp')}
      </div>`).join('') : '<div class="empty-inline">אין מתנדבות משנעות. הוסיפי במסך מתנדבות.</div>'}
  `, (c) => {
    c.querySelectorAll('[data-driver]').forEach((el) => {
      el.onclick = () => {
        const v = DB.find('volunteers', el.dataset.driver);
        // משייך את כל הרשומות למשנעת (כדי שתראה אותן בכניסה שלה)
        list.forEach((w) => DB.update('weekly', w.id, { driverId: v.id }));
        const lines = list.map((w, i) => {
          const m = DB.find('mothers', w.motherId);
          if (!m) return '';
          return `${i + 1}. ${m.motherName} ${m.lastName || ''}\n📍 ${m.address || ''}${m.entryCode ? ' · קוד ' + m.entryCode : ''}\n🗺️ ${wazeLink(m.address)}`;
        }).filter(Boolean).join('\n\n');
        const label = kind === 'meal' ? 'ארוחות בוקר' : 'ערכות שבת';
        const text = `היי ${v.name}! 🚗\nרשימת ${label} לשבוע:\n\n${lines}\n\nתסמני V באפליקציה כשחילקת. תודה! 💗`;
        UI.closeModal();
        previewMessage('רשימת שינוע', text, v.phone);
      };
    });
  });
}

// ------------------------------------------------------------
//  משימות פתוחות (קנבן)
// ------------------------------------------------------------
function screenTasks() {
  const today = todayISO();
  const activeMothers = DB.all('mothers').filter((m) => m.status === 'active');

  // עמודה 1: להזמין אות בס"ת
  const torah = DB.all('birthGifts').filter((g) => !g.letterOrdered).map((g) => DB.find('mothers', g.motherId)).filter(Boolean);

  // עמודה 2: ערכות שבת שהגיע זמן להציע
  const kits = activeMothers.filter((m) => {
    const due = DB.kitDueDate(m.id);
    return due && daysBetween(today, due) <= 0 && !DB.all('kits').find((k) => k.motherId === m.id && k.deliveredAt);
  });

  // עמודה 3: לשבץ ארוחות (ארוחות עתידיות בלי מכינה/משנעת)
  const mealMothers = {};
  DB.all('meals').filter((m) => m.date >= today && m.status === 'pending' && (!m.cookId || !m.driverId))
    .forEach((m) => { mealMothers[m.motherId] = true; });
  const meals = Object.keys(mealMothers).map((id) => DB.find('mothers', id)).filter(Boolean);

  // עמודה 4: מתנת גיל שנה
  const yearG = DB.all('yearGifts').filter((g) => g.status !== 'done').map((g) => DB.find('mothers', g.motherId)).filter(Boolean);

  // עמודה 5: מתנה אחרי לידה
  const afterBirth = DB.all('birthGifts').filter((g) => g.status !== 'done').map((g) => DB.find('mothers', g.motherId)).filter(Boolean);

  const cols = [
    { title: 'להזמין אות בס״ת', icon: 'scroll', list: torah },
    { title: 'ערכות שבת', icon: 'gift', list: kits },
    { title: 'לשבץ ארוחות', icon: 'utensils', list: meals },
    { title: 'מתנת גיל שנה', icon: 'cake', list: yearG },
    { title: 'מתנה אחרי לידה', icon: 'gift', list: afterBirth }
  ];

  return `
    <div class="screen-head">
      <div>
        <h2 class="screen-title">${icon('filetext')} משימות פתוחות</h2>
        <div class="screen-sub">יולדות שממתינות לטיפול לפי סוג משימה</div>
      </div>
    </div>

    <div class="kanban">
      ${cols.map((col, i) => `
        <div class="kanban-col c${i}">
          <div class="kanban-head">
            <span>${icon(col.icon, 15)} ${e(col.title)}</span>
            <span class="count">${col.list.length}</span>
          </div>
          <div class="kanban-body">
            ${col.list.length ? col.list.map((m) => `
              <div class="kanban-item" data-mother="${m.id}">
                <div>
                  <div class="ki-name">${e(m.motherName)} ${e(m.lastName || '')}</div>
                  <div class="ki-sub">${e(nbhdName(m.neighborhood))}</div>
                </div>
                ${icon('check', 16)}
              </div>`).join('')
              : '<div class="kanban-empty">אין</div>'}
          </div>
        </div>`).join('')}
    </div>
  `;
}

function bindTasks(root) {
  root.querySelectorAll('[data-mother]').forEach((el) => {
    el.onclick = () => go('mother-profile', el.dataset.mother);
  });
}

// ------------------------------------------------------------
//  יולדות
// ------------------------------------------------------------
let mothersFilter = { q: '', nbhd: '', status: 'active', stage: '' };

function screenMothers() {
  let list = DB.all('mothers');

  if (mothersFilter.status) list = list.filter((m) => m.status === mothersFilter.status);
  if (mothersFilter.nbhd) list = list.filter((m) => m.neighborhood === mothersFilter.nbhd);
  if (mothersFilter.stage) list = list.filter((m) => currentStage(m) === mothersFilter.stage);
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

  const total = DB.all('mothers').length;

  return `
    <div class="screen-head">
      <div>
        <h2 class="screen-title">${icon('heart')} יולדות</h2>
        <div class="screen-sub">ניהול יולדות במערכת (${total})</div>
      </div>
    </div>

    ${canAddMothers() ? `
      <div class="btn-row" style="margin-bottom:12px">
        <button class="btn btn-sm" id="add-mother">${icon('plus')} הוספת יולדת</button>
        <button class="btn btn-ghost btn-sm" id="import-xls">${icon('filetext')} ייבוא אקסל</button>
        <button class="btn btn-ghost btn-sm" id="add-ai">${icon('message')} מהודעה</button>
      </div>` : ''}

    <div class="chips">
      <button class="chip ${mothersFilter.status === 'active' ? 'active' : ''}" data-status="active">פעילות</button>
      <button class="chip ${mothersFilter.status === 'archived' ? 'active' : ''}" data-status="archived">ארכיון ${icon('package', 12)}</button>
      <button class="chip ${mothersFilter.status === '' ? 'active' : ''}" data-status="">הכל</button>
    </div>

    <div class="chips">
      <button class="chip ${mothersFilter.stage === '' || !mothersFilter.stage ? 'active' : ''}" data-stage="">כל היולדות</button>
      <button class="chip ${mothersFilter.stage === 'meals' ? 'active' : ''}" data-stage="meals">ארוחות</button>
      <button class="chip ${mothersFilter.stage === 'shabbat' ? 'active' : ''}" data-stage="shabbat">שבת</button>
      <button class="chip ${mothersFilter.stage === 'torah' ? 'active' : ''}" data-stage="torah">אות</button>
      <button class="chip ${mothersFilter.stage === 'birthGift' ? 'active' : ''}" data-stage="birthGift">מתנה</button>
      <button class="chip ${mothersFilter.stage === 'yearGift' ? 'active' : ''}" data-stage="yearGift">גיל שנה</button>
    </div>

    <div class="search-box">
      ${icon('search')}
      <input id="m-search" placeholder="חיפוש לפי שם..." value="${escapeAttr(mothersFilter.q)}">
    </div>

    <div class="chips">
      <button class="chip ${!mothersFilter.nbhd ? 'active' : ''}" data-nbhd="">כל השכונות</button>
      ${NEIGHBORHOODS.map((n) => `
        <button class="chip ${mothersFilter.nbhd === n.id ? 'active' : ''}" data-nbhd="${n.id}">${e(n.name)}</button>
      `).join('')}
    </div>

    <div class="mother-grid">
      ${list.length ? list.map((m) => motherCard(m)).join('')
        : UI.empty('baby', 'אין יולדות להצגה', 'לחצי על "הוספת יולדת"')}
    </div>
  `;
}

// מד התקדמות בכרטיס — מימין (ארוחות, ההתחלה) לשמאל (גיל שנה, הסוף).
// ב-RTL הפריט הראשון במערך מופיע מימין, ולכן ארוחות ראשון.
function stageIcons(m) {
  const stages = [
    { id: 'meals', icon: 'coffee', label: 'ארוחות' },
    { id: 'shabbat', icon: 'utensils', label: 'שבת' },
    { id: 'torah', icon: 'scroll', label: 'אות' },
    { id: 'birthGift', icon: 'gift', label: 'מתנה' },
    { id: 'yearGift', icon: 'cake', label: 'גיל שנה' }
  ];
  const active = currentStage(m);
  const activeIdx = stages.findIndex((s) => s.id === active);
  return `<div class="stage-icons">
    ${stages.map((s, i) => {
      const allowed = canStage(s.id);
      return `
      <button class="stage-ico ${i < activeIdx ? 'done' : ''} ${active === s.id ? 'active' : ''} ${allowed ? '' : 'locked'}" title="${s.label}"
        ${allowed ? `data-stage-act="${s.id}" data-stage-mother="${m.id}"` : 'disabled'}>
        ${icon(s.icon, 15)}<span>${s.label}</span>
      </button>`;
    }).join('')}
  </div>`;
}

// השלב הנוכחי של היולדת במסלול: ארוחות → שבת → אות → מתנה → גיל שנה
function currentStage(m) {
  const meals = DB.mealsFor(m.id);
  const mealsDone = meals.length && meals.every((x) => x.status === 'done' || x.status === 'cancelled');
  if (!mealsDone) return 'meals';
  const kit = DB.all('kits').find((k) => k.motherId === m.id);
  if (!kit || !kit.deliveredAt) return 'shabbat';
  const bg = DB.all('birthGifts').find((g) => g.motherId === m.id);
  if (bg && !bg.letterOrdered) return 'torah';
  if (bg && bg.status !== 'done') return 'birthGift';
  const yg = DB.all('yearGifts').find((g) => g.motherId === m.id);
  if (yg && yg.status === 'done') return 'done';
  return 'yearGift';
}

// ציור תינוק בכרטיס — ורוד לבת, כחול לבן, בלי כיתוב
function babyIcon(gender) {
  const color = gender === 'girl' ? '#EC4899' : gender === 'boy' ? '#3B82F6' : 'var(--text-muted)';
  const bg = gender === 'girl' ? '#FCE7F3' : gender === 'boy' ? '#DBEAFE' : 'var(--bg)';
  return `<span class="baby-badge" style="background:${bg};color:${color}">${icon('baby', 16)}</span>`;
}

function wazeLink(address) {
  return `https://waze.com/ul?q=${encodeURIComponent(address || '')}&navigate=yes`;
}

// סדר השלבים (חייב להתאים ל-stageIcons)
const STAGE_ORDER = ['meals', 'shabbat', 'torah', 'birthGift', 'yearGift'];

// לחיצה על אייקון שלב: מסמן שהשלב הזה הושלם ומקדם לשלב הבא.
// לחיצה על שלב מוקדם יותר = חזרה אחורה (מבטלת את המאוחרים).
function stageAction(motherId, stage) {
  const m = DB.find('mothers', motherId);
  if (!m) return;
  const idx = STAGE_ORDER.indexOf(stage);

  const apply = () => {
    DB.setStageProgress(motherId, idx);
    // הכנסה לרשימות השבועיות בהתאם לשלב
    if (stage === 'meals') { DB.addToWeekly(motherId, 'meal'); UI.toast(`${m.motherName} נוספה לשינוע השבועי`); }
    else if (stage === 'shabbat') { DB.addToWeekly(motherId, 'shabbat'); UI.toast(`${m.motherName} נוספה לערכות שבת`); }
    else if (stage === 'torah') { UI.toast('נוספה לרשימת האותיות'); }
    else if (stage === 'yearGift') { UI.toast('מתנת גיל שנה סומנה כנאספה'); }
    render();
  };

  // מתנת לידה = מעבר לארכיון → אישור
  if (stage === 'birthGift') {
    UI.confirm('מתנת לידה', `לסמן שמתנת הלידה של ${e(m.motherName)} נמסרה ולהעביר לארכיון? (אפשר להחזיר בלחיצה על שלב מוקדם יותר)`, apply);
    return;
  }
  apply();
}

// ייצוא פרטי אות בספר תורה של יולדת אחת (CSV עם BOM)
function exportOneTorah(m) {
  const header = ['שם הילד/ה', 'שם האמא', 'שם משפחה', 'תאריך לידה', 'שכונה', 'טלפון'];
  const row = [m.childName || '', m.motherName || '', m.lastName || '', m.birthDate || '', nbhdName(m.neighborhood), m.phone || ''];
  const csv = [header, row].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  downloadCSV('אות-' + (m.motherName || 'יולדת') + '.csv', csv);
  UI.toast('הפרטים יוצאו לאקסל');
}

function downloadCSV(filename, csv) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function motherCard(m) {
  const color = nbhdColor(m.neighborhood);
  // הכרטיס נצבע בצבע השכונה: רקע מרוכך + פס צבעוני + מסגרת
  const tinted = m.neighborhood
    ? `background:linear-gradient(0deg, ${color}0D, ${color}0D), var(--card);border:1.5px solid ${color}59;border-inline-start:5px solid ${color}`
    : '';
  return `
    <div class="mother-card" style="${tinted}">
      <div class="mc-top">
        <div class="mc-name-row">
          ${babyIcon(m.childGender)}
          <span class="mc-name">${e(m.motherName)} ${e(m.lastName || '')}</span>
          <button class="mc-clock" data-profile="${m.id}">${icon('clock', 15)}</button>
        </div>
        ${m.neighborhood ? `<span class="mc-nbhd" style="background:${color};color:${contrastText(color)}">${e(nbhdName(m.neighborhood))}</span>` : ''}
      </div>

      <div class="mc-info">
        ${m.phone ? `<a class="mc-line" href="tel:${escapeAttr(m.phone)}">${icon('phone', 13)} ${e(m.phone)}</a>` : ''}
        ${m.address ? `<div class="mc-line">${icon('mappin', 13)} ${e(m.address)}</div>` : ''}
      </div>

      <div class="mc-actions">
        ${m.address ? `<a class="mc-btn waze" href="${wazeLink(m.address)}" target="_blank">${icon('mappin', 13)} Waze</a>` : ''}
        <button class="mc-btn" data-edit="${m.id}">${icon('edit', 13)} עריכה</button>
      </div>

      ${stageIcons(m)}
    </div>`;
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

  root.querySelectorAll('[data-stage]').forEach((el) => {
    el.onclick = () => { mothersFilter.stage = el.dataset.stage; render(); };
  });

  root.querySelectorAll('[data-nbhd]').forEach((el) => {
    el.onclick = () => { mothersFilter.nbhd = el.dataset.nbhd; render(); };
  });

  // כרטיס שלם → פרופיל; שעון או "עריכה" מטופלים בנפרד
  root.querySelectorAll('[data-profile]').forEach((el) => {
    el.onclick = (ev) => { ev.stopPropagation(); go('mother-profile', el.dataset.profile); };
  });
  root.querySelectorAll('[data-edit]').forEach((el) => {
    el.onclick = (ev) => { ev.stopPropagation(); motherForm(el.dataset.edit); };
  });

  // לחיצה על אייקון שלב בכרטיס
  root.querySelectorAll('[data-stage-act]').forEach((el) => {
    el.onclick = (ev) => { ev.stopPropagation(); stageAction(el.dataset.stageMother, el.dataset.stageAct); };
  });

  const add = root.querySelector('#add-mother');
  if (add) add.onclick = () => motherForm();

  const imp = root.querySelector('#import-xls');
  if (imp) imp.onclick = () => importMothersExcel();

  const ai = root.querySelector('#add-ai');
  if (ai) ai.onclick = () => motherFromMessage();
}

function motherForm(id, prefill) {
  const m = id ? DB.find('mothers', id) : (prefill || {});
  UI.modal(id ? 'עריכת יולדת' : 'יולדת חדשה', `
    <div id="mf">
      <div class="field-row">
        ${UI.field('שם האמא *', 'motherName', m.motherName)}
        ${UI.field('שם משפחה', 'lastName', m.lastName)}
      </div>
      <div class="field">
        <label>מין הילוד</label>
        <div class="gender-pick">
          <button type="button" class="gender-btn girl ${m.childGender === 'girl' ? 'active' : ''}" data-gender="girl">${icon('baby', 22)}</button>
          <button type="button" class="gender-btn boy ${m.childGender === 'boy' ? 'active' : ''}" data-gender="boy">${icon('baby', 22)}</button>
        </div>
        <input type="hidden" name="childGender" value="${escapeAttr(m.childGender || '')}">
      </div>
      <div class="field-row">
        ${UI.field('שם הילד/ה', 'childName', m.childName)}
        <div class="field">
          <label>תאריך לידה (יום/חודש/שנה)</label>
          <input type="text" name="birthDate" inputmode="numeric" placeholder="למשל 15/03/2026" value="${escapeAttr(freeDateFromISO(m.birthDate))}">
        </div>
      </div>
      ${UI.field('טלפון', 'phone', m.phone, 'tel')}
      ${UI.select('שכונה', 'neighborhood', m.neighborhood, NEIGHBORHOODS.map((n) => ({ value: n.id, label: n.name })))}
      ${UI.field('כתובת מדויקת', 'address', m.address)}
      ${UI.field('קוד כניסה / הערות הגעה', 'entryCode', m.entryCode)}
      ${UI.field('מקור ההיכרות', 'source', m.source)}
      ${UI.textarea('הערות', 'notes', m.notes)}
      ${id ? UI.select('סטטוס', 'status', m.status, [
        { value: 'active', label: 'פעילה' },
        { value: 'done', label: 'סיימה מסלול' },
        { value: 'archived', label: 'בארכיון' }
      ]) : ''}
      <button class="btn" id="mf-save">${icon('check')} שמירה</button>
      ${id ? `<button class="btn btn-ghost" id="mf-del" style="margin-top:9px;color:var(--danger)">${icon('trash')} מחיקת היולדת</button>` : ''}
    </div>
  `, (c) => {
    // בורר מין: לחיצה מסמנת ומעדכנת את השדה הנסתר
    c.querySelectorAll('[data-gender]').forEach((btn) => {
      btn.onclick = () => {
        c.querySelectorAll('[data-gender]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        c.querySelector('[name="childGender"]').value = btn.dataset.gender;
      };
    });

    c.querySelector('#mf-save').onclick = () => {
      const data = UI.readForm(c.querySelector('#mf'));
      if (!data.motherName) return UI.toast('חובה למלא שם אמא');
      // המרת התאריך החופשי (יום/חודש/שנה) ל-ISO
      data.birthDate = freeDateToISO(data.birthDate);

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

    const del = c.querySelector('#mf-del');
    if (del) del.onclick = () => {
      UI.closeModal();
      UI.confirm('מחיקת יולדת', `למחוק לצמיתות את ${e(m.motherName)} ${e(m.lastName || '')} וכל הנתונים הקשורים?`, () => {
        ['meals', 'kits', 'birthGifts', 'yearGifts', 'timeline', 'weekly'].forEach((col) => {
          DB.all(col).filter((x) => x.motherId === id).forEach((x) => DB.remove(col, x.id));
        });
        DB.remove('mothers', id);
        UI.toast('היולדת נמחקה');
        if (route.name === 'mother-profile') go('mothers'); else render();
      });
    };
  });
}

// המרת תאריך חופשי dd/mm/yyyy ל-ISO; מקבל גם ISO
function freeDateToISO(s) {
  if (!s) return '';
  s = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // כבר ISO
  const m = s.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})$/);
  if (!m) return '';
  let [, d, mo, y] = m;
  if (y.length === 2) y = '20' + y;
  const pad = (n) => String(n).padStart(2, '0');
  return `${y}-${pad(mo)}-${pad(d)}`;
}

// המרה הפוכה ל-תצוגה dd/mm/yyyy
function freeDateFromISO(s) {
  if (!s) return '';
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

// ------------------------------------------------------------
//  הוספת יולדות מהודעת טקסט חופשי (אחת או כמה)
// ------------------------------------------------------------
function motherFromMessage() {
  UI.modal('הוספה מהודעה', `
    <div class="card-sub" style="margin-bottom:12px;line-height:1.6">
      הדביקי הודעה עם פרטי יולדת אחת או כמה. המערכת תזהה שם, טלפון (10 ספרות),
      שכונה, כתובת וקוד. אם יש כמה יולדות בהודעה — היא תיצור כמה כרטיסים.
    </div>
    <div id="ai">
      ${UI.textarea('טקסט ההודעה', 'text', '')}
      <button class="btn" id="ai-parse">${icon('message')} פענוח</button>
    </div>
  `, (c) => {
    c.querySelector('#ai-parse').onclick = () => {
      const { text } = UI.readForm(c.querySelector('#ai'));
      if (!text) return UI.toast('הדביקי טקסט');
      const recs = parseMothersBulk(text);
      UI.closeModal();

      if (recs.length === 0) return UI.toast('לא זוהו פרטים');
      if (recs.length === 1) {
        // יולדת אחת → פתיחת טופס לאישור/עריכה
        motherForm(null, recs[0]);
        return;
      }
      // כמה יולדות → תצוגת אישור לפני הוספה
      confirmBulkMothers(recs);
    };
  });
}

// אישור הוספת כמה יולדות שזוהו מהודעה
function confirmBulkMothers(recs) {
  UI.modal(`זוהו ${recs.length} יולדות`, `
    <div class="card-sub" style="margin-bottom:12px">בדקי ולחצי הוספה. אפשר לתקן כל כרטיס אחרי ההוספה.</div>
    <div style="max-height:44vh;overflow-y:auto">
      ${recs.map((r) => `
        <div class="row">
          <div class="row-main">
            <div class="row-title">${e(r.motherName || '(ללא שם)')}</div>
            <div class="row-sub">${e(r.phone || '')}${r.address ? ' · ' + e(r.address) : ''}${r.neighborhood ? ' · ' + e(nbhdName(r.neighborhood)) : ''}</div>
          </div>
        </div>`).join('')}
    </div>
    <button class="btn" id="bulk-add" style="margin-top:14px">${icon('check')} הוספת ${recs.length} יולדות</button>
  `, (c) => {
    c.querySelector('#bulk-add').onclick = () => {
      let added = 0, skipped = 0;
      recs.forEach((r) => {
        if (r.phone && DB.phoneExists(r.phone)) { skipped++; return; }
        DB.addMother({
          motherName: r.motherName || '(ללא שם — נא לעדכן)', lastName: r.lastName || '',
          childName: r.childName || '', childGender: r.childGender || '',
          phone: r.phone || '', neighborhood: r.neighborhood || '',
          address: r.address || '', entryCode: r.entryCode || ''
        });
        added++;
      });
      UI.closeModal();
      UI.toast(`נוספו ${added}${skipped ? ` · דילוג על ${skipped} כפילויות` : ''}`);
      render();
    };
  });
}

// ------------------------------------------------------------
//  ייבוא יולדות מאקסל (CSV)
// ------------------------------------------------------------
// מנתח רשימת יולדות מטקסט חופשי (הודעות/מסמך) — שם, טלפון, שכונה, כתובת, קוד, תינוק
function parseMothersBulk(text) {
  const raw = String(text).replace(/\s+/g, ' ');
  const phoneRe = /(?:\+?972[\s-]?|0)5\d(?:[\s-]?\d){7}/g;
  const normPhone = (p) => { let d = p.replace(/\D/g, ''); if (d.startsWith('972')) d = '0' + d.slice(3); if (d.length === 9) d = '0' + d; return d.slice(0, 10); };
  const headerRe = /\*([^*]{1,30})\*/g;
  const headers = []; let hm;
  while ((hm = headerRe.exec(raw))) { const t = hm[1].trim(); headers.push({ idx: hm.index, end: hm.index + hm[0].length, txt: t, nbId: detectNeighborhood(t) }); }
  const phones = []; let pm;
  while ((pm = phoneRe.exec(raw))) phones.push({ idx: pm.index, end: pm.index + pm[0].length, phone: normPhone(pm[0]) });

  const ADDR = /^(רחוב|קומה|דירה|קוד|מעלית|כניסה|אין|יש|שומר|סולמית|כוכבית|מפתח|ואז|בעלה|להתקשר|ימין|שמאל|פעמון|טלפון|מסרה|אמרה|קרקע|קומת|דלת|ב|א|ג|ד|ה|ו)$/;
  const junk = /^(בכניסה|פתוחה|אפס|לא |והיא|ירד|תל ברוך|בית |קודם|כדאי|במעלית|יגיעו|או |שכונת|נווה אביבים יולדת|ללא |חיים לבנון|לוי אשכול|מעונות|יולדת|מתן|כרמל לוי|גימל|הירוקה|נווה|נוה|רמת אביב|נאות|כוכב הצפון|אזורי|משפחת|קשאני|בייבי|התינוק|התינוקת)/;
  const strip = (s) => s.replace(/\*[^*]*\*/g, ' ').replace(/[+\d()#*׳'"?,.\-–]/g, ' ').replace(/\s+/g, ' ').trim();

  const out = []; const seen = new Set();
  for (let i = 0; i < phones.length; i++) {
    const p = phones[i]; if (seen.has(p.phone)) continue;
    const prevEnd = i > 0 ? phones[i - 1].end : 0;
    const nextIdx = i < phones.length - 1 ? phones[i + 1].idx : raw.length;
    const beforeSeg = raw.slice(prevEnd, p.idx), afterSeg = raw.slice(p.end, nextIdx);
    // שכונה: קודם מכותרת * *, אחרת מזיהוי בטקסט של היולדת עצמה (למשל "נווה אביבים" בשורה)
    let nb = ''; for (const h of headers) if (h.end <= p.idx && h.nbId) nb = h.nbId;
    // הטקסט שאחרי הטלפון שייך ליולדת זו; לפניו עלול להיות זנב של הקודמת
    const inlineNb = detectNeighborhood(afterSeg) || detectNeighborhood(beforeSeg);
    if (inlineNb) nb = inlineNb;

    // מסירים שמות שכונות מהטקסט כדי שלא ידלפו לשם/כתובת
    const stripNb = (s) => { NEIGHBORHOODS.forEach((n) => { s = s.split(n.name).join(' '); }); return s.replace(/נוה אביבים|הירוקה|גימל|שכונת/g, ' '); };

    // כתובת קודם — צריך את מיקומה כדי לזהות שם שמופיע אחרי הטלפון ולפני הכתובת
    const afterClean = stripNb(afterSeg.replace(/\*[^*]*\*/g, ' '));
    const addrM = afterClean.match(/([א-ת'׳"]{2,}(?:\s[א-ת'׳"]{2,}){0,2}\s\d{1,3})(?:[,\s]+קומה\s?[\d.]+)?(?:[,\s]+דירה\s?\d+)?/);
    const address = addrM ? addrM[0].replace(/\s+/g, ' ').trim().slice(0, 55) : '';

    let name = '';
    // 1. שם ב-* * (למשל *גל פלג*)
    const nm = headers.filter((h) => !h.nbId && h.idx >= prevEnd && h.idx < p.idx && /[א-ת]/.test(h.txt) && !/^\d/.test(h.txt) && h.txt.length < 20);
    if (nm.length) name = nm[nm.length - 1].txt;
    // 2. שם לפני הטלפון (למשל "מזי 0542...")
    if (!name) {
      let s = stripNb(beforeSeg.replace(/\*[^*]*\*/g, ' ')).replace(/^.*[0-9)]/, '');
      const w = strip(s).split(' ').filter((x) => /[א-ת]/.test(x) && x.length >= 2 && !ADDR.test(x));
      name = w.slice(0, 3).join(' ');
    }
    // 3. שם אחרי הטלפון, לפני הכתובת (למשל "0503... 1. נויה בן זקן האמוראים 12")
    if (!name) {
      const beforeAddr = addrM ? afterClean.slice(0, afterClean.indexOf(addrM[0])) : afterClean;
      const w = strip(beforeAddr).replace(/^\d+\.?\s*/, '').split(' ').filter((x) => /[א-ת]/.test(x) && x.length >= 2 && !ADDR.test(x));
      name = w.slice(0, 3).join(' ');
    }
    if (name && junk.test(name)) name = '';
    const codeM = afterSeg.match(/קוד[^0-9*#]{0,8}(\*?\d[\d*#]{1,6})/);
    const babyM = afterSeg.match(/(תינוקת|התינוקת)\s*:?\s*([א-ת' ]{2,20})/) || afterSeg.match(/(תינוק|בייבי|הבייבי|שם התינוק)\s*:?\s*([א-ת' ]{2,20})/);
    let childName = '', childGender = '';
    if (babyM) { childGender = /תינוקת/.test(babyM[1]) ? 'girl' : 'boy'; childName = (babyM[2] || '').trim().split(/\s+/).slice(0, 3).join(' '); }

    // פיצול שם פרטי / שם משפחה: מילה ראשונה = פרטי, השאר = משפחה
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ');

    out.push({ motherName: firstName, lastName, phone: p.phone, neighborhood: nb, address, entryCode: codeM ? codeM[1] : '', childName, childGender });
    seen.add(p.phone);
  }
  return out;
}

// חילוץ טקסט מקובץ docx (zip עם document.xml) — טעינת JSZip מ-CDN
function loadJSZip() {
  return new Promise((resolve, reject) => {
    if (window.JSZip) return resolve(window.JSZip);
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
    s.onload = () => resolve(window.JSZip);
    s.onerror = () => reject(new Error('לא ניתן לטעון את מפענח ה-docx'));
    document.head.appendChild(s);
  });
}

async function docxToText(file) {
  const JSZip = await loadJSZip();
  const zip = await JSZip.loadAsync(file);
  const xml = await zip.file('word/document.xml').async('string');
  return xml.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&[a-z]+;/g, ' ');
}

function importMothersExcel() {
  UI.modal('ייבוא רשימת יולדות', `
    <div class="card-sub" style="margin-bottom:12px;line-height:1.6">
      בחרי קובץ <b>Word (docx)</b> או <b>CSV</b> עם רשימת יולדות.
      המערכת תזהה שם, טלפון, שכונה, כתובת וקוד — ותמנע כפילויות לפי טלפון.
    </div>
    <div class="check-row">
      <input type="checkbox" id="imp-shabbat" checked>
      <label for="imp-shabbat">כבר קיבלו ארוחות + ערכת שבת (שלב "אות")</label>
    </div>
    <button class="btn" id="xls-pick" style="margin-top:8px">${icon('download')} בחירת קובץ</button>
    <div id="imp-status" style="margin-top:12px"></div>
  `, (c) => {
    c.querySelector('#xls-pick').onclick = () => {
      const throughShabbat = c.querySelector('#imp-shabbat').checked;
      const status = c.querySelector('#imp-status');
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv,.txt,.docx';
      input.onchange = async () => {
        const f = input.files[0];
        if (!f) return;
        status.innerHTML = '<div class="empty-inline">קורא את הקובץ...</div>';
        try {
          let records;
          if (/\.docx$/i.test(f.name)) {
            records = parseMothersBulk(await docxToText(f));
          } else {
            const txt = await f.text();
            // CSV עם כותרות, או טקסט חופשי
            if (/,/.test(txt) && /שם|טלפון/.test(txt.split(/\r?\n/)[0] || '')) {
              records = txt.replace(/^﻿/, '').split(/\r?\n/).slice(1).filter((r) => r.trim()).map((line) => {
                const cols = line.split(',').map((s) => s.replace(/^"|"$/g, '').trim());
                return { motherName: cols[0], childName: cols[1] || '', childGender: cols[2] === 'בת' ? 'girl' : cols[2] === 'בן' ? 'boy' : '', phone: cols[3] || '', neighborhood: detectNeighborhood(cols[4] || ''), address: cols[5] || '', entryCode: cols[6] || '' };
              });
            } else {
              records = parseMothersBulk(txt);
            }
          }

          let added = 0, skipped = 0, noName = 0;
          records.forEach((r) => {
            if (!r.phone && !r.motherName) return;
            if (r.phone && DB.phoneExists(r.phone)) { skipped++; return; }
            if (!r.motherName) noName++;
            const mother = DB.addMother({
              motherName: r.motherName || '(ללא שם — נא לעדכן)', lastName: r.lastName || '',
              childName: r.childName || '', childGender: r.childGender || '',
              phone: r.phone || '', neighborhood: r.neighborhood || '',
              address: r.address || '', entryCode: r.entryCode || ''
            });
            if (throughShabbat) DB.markThroughShabbat(mother.id);
            added++;
          });

          UI.closeModal();
          UI.toast(`יובאו ${added} · דילוג על ${skipped} כפילויות`);
          if (noName) setTimeout(() => UI.toast(`${noName} ללא שם — סומנו לעדכון`), 2600);
          render();
        } catch (err) {
          status.innerHTML = `<div class="alert"><div class="alert-text">${e(err.message)}</div></div>`;
        }
      };
      input.click();
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
            ${v.birthdayHeb && v.birthdayHeb.month ? `<div class="card-sub">${icon('cake', 12)} ${gematria(v.birthdayHeb.day)} ${e(v.birthdayHeb.month)}</div>` : ''}
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
  const hb = v.birthdayHeb || {}; // {day, month, year}
  const curHebYear = hebParts(new Date()).yearNum;
  const selYear = hb.year || (curHebYear - 30);
  const months = hebMonthsOfYear(selYear);

  UI.modal(id ? 'עריכת מתנדבת' : 'מתנדבת חדשה', `
    <div id="vf">
      ${UI.field('שם *', 'name', v.name)}
      ${UI.field('טלפון', 'phone', v.phone, 'tel')}
      ${UI.field('כתובת', 'address', v.address)}

      <div class="field">
        <label>יום הולדת עברי</label>
        <div class="heb-picker">
          <select name="hb_day">
            ${Array.from({ length: 30 }, (_, i) => i + 1).map((d) => `<option value="${d}" ${hb.day === d ? 'selected' : ''}>${gematria(d)}</option>`).join('')}
          </select>
          <select name="hb_month" id="hb-month">
            ${months.map((mn) => `<option value="${e(mn)}" ${hb.month === mn ? 'selected' : ''}>${e(mn)}</option>`).join('')}
          </select>
          <div class="heb-year">
            <button type="button" id="hy-minus">−</button>
            <span id="hy-val" data-year="${selYear}">${gematria(selYear)}</span>
            <button type="button" id="hy-plus">+</button>
          </div>
        </div>
      </div>

      ${UI.select('סוג תפקיד', 'roleType', v.roleType,
        Object.entries(VOLUNTEER_TYPES).map(([k, l]) => ({ value: k, label: l })))}
      ${UI.field('זמינות (ימים מועדפים)', 'availability', v.availability)}
      <button class="btn" id="vf-save">${icon('check')} שמירה</button>
      ${id ? `<button class="btn btn-ghost" id="vf-del" style="margin-top:9px;color:var(--danger)">${icon('trash')} מחיקה</button>` : ''}
    </div>
  `, (c) => {
    // ניווט בין שנים עבריות — מעדכן את רשימת החודשים (שנה מעוברת)
    const yv = c.querySelector('#hy-val');
    const refreshMonths = () => {
      const y = Number(yv.dataset.year);
      yv.textContent = gematria(y);
      const sel = c.querySelector('#hb-month');
      const cur = sel.value;
      const ms = hebMonthsOfYear(y);
      sel.innerHTML = ms.map((mn) => `<option value="${mn}" ${mn === cur ? 'selected' : ''}>${mn}</option>`).join('');
    };
    c.querySelector('#hy-minus').onclick = () => { yv.dataset.year = Number(yv.dataset.year) - 1; refreshMonths(); };
    c.querySelector('#hy-plus').onclick = () => { yv.dataset.year = Number(yv.dataset.year) + 1; refreshMonths(); };

    c.querySelector('#vf-save').onclick = () => {
      const data = UI.readForm(c.querySelector('#vf'));
      if (!data.name) return UI.toast('חובה למלא שם');

      // תאריך עברי → שמירה + חישוב לועזי (לצורך תזכורת)
      const hDay = Number(c.querySelector('[name="hb_day"]').value);
      const hMonth = c.querySelector('#hb-month').value;
      const hYear = Number(yv.dataset.year);
      data.birthdayHeb = { day: hDay, month: hMonth, year: hYear };
      const greg = hebrewToGregorian(hYear, hMonth, hDay);
      data.birthday = greg ? greg.toISOString().slice(0, 10) : '';
      delete data.hb_day; delete data.hb_month;

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
let invTab = 'oneTime';

function screenInventory() {
  const all = DB.all('inventory');
  const low = DB.lowStock();
  const list = all.filter((i) => (i.category || 'other') === invTab);
  const shopping = DB.all('shopping').filter((s) => !s.done);

  return `
    <div class="screen-head">
      <div>
        <h2 class="screen-title">${icon('package')} מלאי</h2>
        <div class="screen-sub">ניהול חד-פעמי וערכות מתנה</div>
      </div>
      <button class="btn btn-sm" id="add-inv" style="width:auto">${icon('plus')} פריט חדש</button>
    </div>

    ${shopping.length ? `
      <div class="card" style="background:var(--gradient-soft)">
        <div class="wk-head">
          <div class="card-title" style="display:flex;align-items:center;gap:7px">${icon('package', 16)} רשימת קניות (${shopping.length})</div>
          <button class="btn btn-wa btn-sm" style="width:auto" id="send-shop">${icon('whatsapp')} שליחה לשבי</button>
        </div>
        <div class="low-chips" style="margin-top:8px">
          ${shopping.map((s) => `<span class="low-chip" data-shop-remove="${s.id}">${e(s.name)} ✕</span>`).join('')}
        </div>
      </div>` : ''}

    ${low.length ? `
      <div class="low-panel">
        <div class="low-panel-title">${icon('alert', 15)} פריטים במלאי נמוך (${low.length})</div>
        <div class="low-chips">
          ${low.map((i) => `<span class="low-chip" data-shop-add="${i.id}">${e(i.name)} ${i.qty}/${i.minQty} +</span>`).join('')}
        </div>
      </div>` : ''}

    <div class="chips inv-tabs">
      ${INV_CATEGORIES.map((c) => `
        <button class="chip ${invTab === c.id ? 'active' : ''}" data-invtab="${c.id}">${e(c.name)}</button>
      `).join('')}
    </div>

    <div class="inv-grid">
      ${list.length ? list.map((i) => invCard(i)).join('')
        : UI.empty('package', 'אין פריטים בקטגוריה זו', 'לחצי על "פריט חדש" להוספה')}
    </div>

    <button class="btn btn-ghost" id="view-orders" style="margin-top:14px">
      ${icon('filetext')} היסטוריית הזמנות מתנדבות
    </button>
  `;
}

function invCard(i) {
  const empty = i.qty <= 0;
  const low = i.qty <= i.minQty;
  return `
    <div class="inv-card ${low ? 'low' : ''}">
      <div class="inv-card-top">
        ${i.image ? `<img class="inv-thumb" src="${escapeAttr(i.image)}" alt="">` : ''}
        <div class="inv-name">${e(i.name)}</div>
        <button class="inv-edit" data-inv="${i.id}">${icon('edit', 15)}</button>
      </div>
      <div class="inv-qty ${empty ? 'zero' : ''}">${i.qty}</div>
      <div class="inv-meta">${e(i.unit || 'יח')}׳ · מינימום ${i.minQty}</div>
      <div class="inv-actions">
        <button class="inv-del" data-invdel="${i.id}">${icon('trash', 15)}</button>
        <button class="inv-order" data-shop-add="${i.id}" title="הוספה לרשימת קניות">${icon('package', 15)}</button>
        <button class="inv-step" data-invplus="${i.id}">${icon('plus', 16)}</button>
        <button class="inv-step" data-invminus="${i.id}" ${empty ? 'disabled' : ''}>${icon('minus', 16)}</button>
      </div>
    </div>`;
}

function bindInventory(root) {
  root.querySelectorAll('[data-invtab]').forEach((el) => {
    el.onclick = () => { invTab = el.dataset.invtab; render(); };
  });

  root.querySelectorAll('[data-inv]').forEach((el) => {
    el.onclick = () => inventoryForm(el.dataset.inv);
  });

  // כפתורי +/- מעדכנים במקום בלי לרנדר הכל מחדש (מהיר וחלק)
  root.querySelectorAll('[data-invplus]').forEach((el) => {
    el.onclick = () => {
      const item = DB.find('inventory', el.dataset.invplus);
      DB.update('inventory', item.id, { qty: item.qty + 1 });
      render();
    };
  });
  root.querySelectorAll('[data-invminus]').forEach((el) => {
    el.onclick = () => {
      const item = DB.find('inventory', el.dataset.invminus);
      DB.update('inventory', item.id, { qty: Math.max(0, item.qty - 1) });
      render();
    };
  });

  root.querySelectorAll('[data-invdel]').forEach((el) => {
    el.onclick = () => {
      const item = DB.find('inventory', el.dataset.invdel);
      UI.confirm('מחיקת פריט', `למחוק את ${e(item.name)}?`, () => { DB.remove('inventory', item.id); render(); });
    };
  });

  // הוספה לרשימת קניות
  root.querySelectorAll('[data-shop-add]').forEach((el) => {
    el.onclick = (ev) => {
      ev.stopPropagation();
      const item = DB.find('inventory', el.dataset.shopAdd);
      DB.addToShopping(item.id);
      UI.toast(`${item.name} נוסף לרשימת הקניות`);
      render();
    };
  });

  // הסרה מרשימת קניות
  root.querySelectorAll('[data-shop-remove]').forEach((el) => {
    el.onclick = () => { DB.remove('shopping', el.dataset.shopRemove); render(); };
  });

  // שליחת רשימת הקניות לשבי בוואטסאפ
  const sendShop = root.querySelector('#send-shop');
  if (sendShop) sendShop.onclick = () => {
    const items = DB.all('shopping').filter((s) => !s.done);
    if (!items.length) return UI.toast('הרשימה ריקה');
    const text = `היי שבי! 🛒\nרשימת קניות לארגון ${CONFIG.ORG_NAME}:\n\n${items.map((s, i) => `${i + 1}. ${s.name}`).join('\n')}\n\nתודה רבה! 💗`;
    previewMessage('רשימת קניות לשבי', text, CONFIG.SHOPPING_PHONE);
  };

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
  const i = id ? DB.find('inventory', id) : { qty: 0, minQty: 5, category: invTab, unit: 'יח' };
  UI.modal(id ? 'עריכת פריט' : 'פריט חדש', `
    <div id="if">
      ${UI.field('שם הפריט *', 'name', i.name)}
      ${UI.select('קטגוריה', 'category', i.category || invTab,
        INV_CATEGORIES.map((c) => ({ value: c.id, label: c.name })))}
      <div class="field-row">
        ${UI.field('כמות נוכחית', 'qty', i.qty, 'number')}
        ${UI.field('סף מינימום', 'minQty', i.minQty, 'number')}
      </div>
      ${UI.field('יחידה (יח׳ / שקיות וכו׳)', 'unit', i.unit || 'יח')}

      <div class="field">
        <label>תמונת המוצר</label>
        <div class="img-pick">
          <div class="img-pick-preview" id="if-preview">
            ${i.image ? `<img src="${escapeAttr(i.image)}" alt="">` : icon('package', 22)}
          </div>
          <button type="button" class="btn btn-ghost btn-sm" id="if-pick">${icon('filetext')} בחירת תמונה</button>
          ${i.image ? `<button type="button" class="btn btn-ghost btn-sm" id="if-imgdel" style="color:var(--danger)">${icon('trash')}</button>` : ''}
        </div>
        <input type="hidden" name="image" value="${escapeAttr(i.image || '')}">
      </div>

      <button class="btn" id="if-save">${icon('check')} שמירה</button>
      ${id ? `<button class="btn btn-ghost" id="if-del" style="margin-top:9px;color:var(--danger)">${icon('trash')} מחיקה</button>` : ''}
    </div>
  `, (c) => {
    // בחירת תמונה — מוקטנת לתמונה קטנה ונשמרת עם הפריט
    const pick = c.querySelector('#if-pick');
    if (pick) pick.onclick = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const f = input.files[0];
        if (!f) return;
        shrinkImage(f, 160, (dataUrl) => {
          c.querySelector('[name="image"]').value = dataUrl;
          c.querySelector('#if-preview').innerHTML = `<img src="${dataUrl}" alt="">`;
          UI.toast('התמונה נוספה');
        });
      };
      input.click();
    };
    const imgDel = c.querySelector('#if-imgdel');
    if (imgDel) imgDel.onclick = () => {
      c.querySelector('[name="image"]').value = '';
      c.querySelector('#if-preview').innerHTML = icon('package', 22);
    };

    c.querySelector('#if-save').onclick = () => {
      const data = UI.readForm(c.querySelector('#if'));
      if (!data.name) return UI.toast('חובה למלא שם');
      data.qty = data.qty || 0;
      data.minQty = data.minQty || 0;
      data.category = data.category || 'other';
      data.unit = data.unit || 'יח';
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
