// ============================================================
//  ראוטר ומעטפת האפליקציה
// ============================================================

let route = { name: 'dashboard', param: null };

const SCREENS = {
  dashboard:        { title: 'שפרה ופועה', render: screenDashboard,     bind: bindDashboard },
  tasks:            { title: 'משימות פתוחות', render: screenTasks,      bind: bindTasks },
  mothers:          { title: 'יולדות',     render: screenMothers,       bind: bindMothers },
  'mother-profile': { title: 'פרופיל',     render: screenMotherProfile, bind: bindMotherProfile, back: 'mothers' },
  volunteers:       { title: 'מתנדבות',    render: screenVolunteers,    bind: bindVolunteers },
  meals:            { title: 'ארוחות',     render: screenMeals,         bind: bindMeals },
  kits:             { title: 'ערכות שבת',  render: screenKits,          bind: bindKits },
  gifts:            { title: 'מתנות',      render: screenGifts,         bind: bindGifts },
  torah:            { title: 'אותיות בספר תורה', render: screenTorah,   bind: bindTorah },
  events:           { title: 'בוקר ליולדות', render: screenEvents,      bind: bindEvents },
  contacts:         { title: 'אנשי קשר',   render: screenContacts,      bind: bindContacts },
  neighborhoods:    { title: 'שכונות',     render: screenNeighborhoods, bind: bindNeighborhoods },
  inventory:        { title: 'מלאי',       render: screenInventory,     bind: bindInventory },
  calendar:         { title: 'לוח שנה עברי', render: screenCalendar,    bind: bindCalendar },
  images:           { title: 'תמונות',     render: screenImages,        bind: bindImages },
  messages:         { title: 'הודעות',     render: screenMessages,      bind: bindMessages },
  reports:          { title: 'דוחות',      render: screenReports },
  reminders:        { title: 'תזכורות',    render: screenReminders,     bind: bindReminders },
  settings:         { title: 'הגדרות',     render: screenSettings,      bind: bindSettings },
  order:            { title: 'הזמנת ציוד', render: screenOrder,         bind: bindOrder },
  'my-tasks':       { title: 'המשימות שלי', render: screenMyTasks,      bind: bindMyTasks },
  more:             { title: 'עוד',        render: screenMore,          bind: bindMore }
};

const NAV_ADMIN = [
  { id: 'dashboard', label: 'בית', icon: 'home' },
  { id: 'mothers', label: 'יולדות', icon: 'heart' },
  { id: 'tasks', label: 'משימות', icon: 'filetext' },
  { id: 'inventory', label: 'מלאי', icon: 'package' },
  { id: 'more', label: 'עוד', icon: 'menu' }
];

const NAV_VOLUNTEER = [
  { id: 'my-tasks', label: 'המשימות שלי', icon: 'calendar' },
  { id: 'order', label: 'הזמנת ציוד', icon: 'package' }
];

function go(name, param) {
  route = { name, param: param || null };
  render();
  document.querySelector('.screen').scrollTop = 0;
}

function render() {
  const app = document.getElementById('app');
  const me = DB.me;

  // מצב קצה: אין אף משתמשת (למשל אחרי ייבוא גיבוי פגום) — משחזרים ברירת מחדל
  if (!me) {
    DB.insert('users', { id: 'u-admin', name: 'מנהלת ראשית', role: 'admin', active: true });
    DB.setCurrentUser('u-admin');
    return render();
  }

  const isVolunteer = me.role === 'volunteer';
  const nav = isVolunteer ? NAV_VOLUNTEER : NAV_ADMIN;

  // מתנדבת שנחתה על מסך שאינו שלה — מחזירים אותה למשימות שלה
  if (isVolunteer && !['my-tasks', 'order'].includes(route.name)) {
    route = { name: 'my-tasks', param: null };
  }

  const screen = SCREENS[route.name] || SCREENS.dashboard;

  app.innerHTML = `
    <div class="header">
      ${screen.back ? `<button class="header-btn" id="back-btn">${icon('back')}</button>` : ''}
      <h1>${e(screen.title)}</h1>
      ${!isVolunteer ? `<button class="header-btn" id="rem-btn">${icon('bell')}</button>` : ''}
      <button class="header-btn" id="user-btn">${icon('user')}</button>
    </div>

    <div class="screen">${screen.render(route.param)}</div>

    <div class="nav">
      ${nav.map((n) => `
        <button class="nav-item ${route.name === n.id ? 'active' : ''}" data-nav="${n.id}">
          ${icon(n.icon)}<span>${e(n.label)}</span>
        </button>`).join('')}
    </div>
  `;

  const root = app.querySelector('.screen');
  if (screen.bind) screen.bind(root, route.param);

  app.querySelectorAll('[data-nav]').forEach((el) => {
    el.onclick = () => go(el.dataset.nav);
  });

  const back = app.querySelector('#back-btn');
  if (back) back.onclick = () => go(screen.back);

  const rem = app.querySelector('#rem-btn');
  if (rem) rem.onclick = () => go('reminders');

  app.querySelector('#user-btn').onclick = () => userSwitcher();
}

// ------------------------------------------------------------
//  מסך "עוד"
// ------------------------------------------------------------
function screenMore() {
  const items = [
    { id: 'tasks', label: 'משימות פתוחות', icon: 'filetext', sub: 'לפי סוג משימה' },
    { id: 'calendar', label: 'לוח שנה עברי', icon: 'calendar', sub: 'חודש עברי ולועזי' },
    { id: 'kits', label: 'ערכות שבת', icon: 'gift', sub: 'הצעה, אישור ומסירה' },
    { id: 'gifts', label: 'מתנות', icon: 'package', sub: 'לידה · גיל שנה' },
    { id: 'torah', label: 'אותיות בספר תורה', icon: 'scroll', sub: 'רשימה וייצוא לאקסל' },
    { id: 'events', label: 'בוקר ליולדות', icon: 'coffee', sub: 'מפגש חודשי ונוכחות' },
    { id: 'neighborhoods', label: 'שכונות', icon: 'mappin', sub: 'יולדות לפי אזור' },
    { id: 'contacts', label: 'אנשי קשר', icon: 'mappin', sub: 'נקודות איסוף לפי שכונה' },
    { id: 'inventory', label: 'מלאי ציוד', icon: 'package', sub: 'חד פעמי וערכות מתנה' },
    { id: 'images', label: 'תמונות', icon: 'filetext', sub: 'קבצים ותמונות' },
    { id: 'messages', label: 'הודעות', icon: 'message', sub: 'בין המנהלות' },
    { id: 'reminders', label: 'מרכז תזכורות', icon: 'bell', sub: 'כל מה שדורש טיפול' },
    { id: 'reports', label: 'דוחות', icon: 'chart', sub: 'סטטיסטיקות וסיכומים' },
    { id: 'settings', label: 'הגדרות והרשאות', icon: 'settings', sub: 'משתמשות ותצורה' }
  ];

  return items.map((i) => `
    <div class="row" data-more="${i.id}">
      <div class="avatar">${icon(i.icon)}</div>
      <div class="row-main">
        <div class="row-title">${e(i.label)}</div>
        <div class="row-sub">${e(i.sub)}</div>
      </div>
      ${icon('back')}
    </div>`).join('');
}

function bindMore(root) {
  root.querySelectorAll('[data-more]').forEach((el) => {
    el.onclick = () => go(el.dataset.more);
  });
}

// ------------------------------------------------------------
//  מרכז תזכורות — כל מה שדורש פעולה, במקום אחד
// ------------------------------------------------------------
function screenReminders() {
  const today = todayISO();
  const tomorrow = addDays(today, 1);
  const tasks = [];

  // ארוחות מחר — תזכורת למכינה ולמשנעת
  DB.all('meals')
    .filter((m) => m.date === tomorrow && m.status === 'pending')
    .forEach((m) => {
      const mo = DB.find('mothers', m.motherId);
      if (!mo) return;
      if (m.cookId) {
        const v = DB.find('volunteers', m.cookId);
        tasks.push({
          icon: 'utensils', title: `תזכורת ל${v.name}`, sub: `הכנת ארוחה מחר · ${mo.motherName}`,
          phone: v.phone, tpl: 'mealTomorrow',
          vars: { volunteerName: v.name, dateFull: fmtDateFull(m.date), roleLabel: 'הכנת ארוחת בוקר', motherName: mo.motherName, deliveryTime: m.deliveryTime }
        });
      }
      if (m.driverId) {
        const v = DB.find('volunteers', m.driverId);
        tasks.push({
          icon: 'truck', title: `תזכורת ל${v.name}`, sub: `שינוע מחר · ${mo.motherName}`,
          phone: v.phone, tpl: 'mealTomorrow',
          vars: { volunteerName: v.name, dateFull: fmtDateFull(m.date), roleLabel: 'שינוע הארוחה', motherName: mo.motherName, deliveryTime: m.deliveryTime }
        });
      }
    });

  // כתובות למשנעות היום
  DB.all('meals')
    .filter((m) => m.date === today && m.driverId && m.status === 'pending')
    .forEach((m) => {
      const v = DB.find('volunteers', m.driverId);
      const mo = DB.find('mothers', m.motherId);
      if (!v || !mo) return;
      tasks.push({
        icon: 'mappin', title: `כתובת ל${v.name}`, sub: `היום · ${mo.address || 'אין כתובת'}`,
        phone: v.phone, tpl: 'driverAddress',
        vars: { volunteerName: v.name, motherName: mo.motherName, address: mo.address, entryCode: mo.entryCode, phone: mo.phone, deliveryTime: m.deliveryTime, notes: mo.notes }
      });
    });

  // מתנות גיל שנה שמתקרבות
  DB.all('yearGifts')
    .filter((g) => g.status === 'pending' && g.dueDate)
    .forEach((g) => {
      const left = daysBetween(today, g.dueDate);
      if (left > CONFIG.YEAR_GIFT_REMINDER_DAYS || left < 0) return;
      const mo = DB.find('mothers', g.motherId);
      const ct = g.contactId ? DB.find('contacts', g.contactId) : null;
      if (!mo) return;
      tasks.push({
        icon: 'cake', title: `מתנת גיל שנה · ${mo.childName || mo.motherName}`,
        sub: `${relativeDay(g.dueDate)}${ct ? ` · אצל ${ct.name}` : ' · חסר איש קשר'}`,
        phone: mo.phone, tpl: 'yearGiftReady',
        vars: {
          motherName: mo.motherName, childName: mo.childName,
          contactName: ct ? ct.name : '[יש לשבץ איש קשר]',
          contactAddress: ct ? ct.address : '', contactPhone: ct ? ct.phone : '',
          contactNbhd: ct ? nbhdName(ct.neighborhood) : ''
        }
      });
    });

  // ערכות שבת להצעה
  DB.all('mothers').filter((m) => m.status === 'active').forEach((m) => {
    const due = DB.kitDueDate(m.id);
    if (!due || DB.all('kits').find((k) => k.motherId === m.id)) return;
    if (daysBetween(today, due) > 0) return;
    tasks.push({
      icon: 'gift', title: `הצעת ערכת שבת · ${m.motherName}`, sub: 'סיימה את מסלול הארוחות',
      phone: m.phone, tpl: 'shabbatKitOffer', vars: { motherName: m.motherName }
    });
  });

  // מפגש מחר — תזכורת למוזמנות
  DB.all('events').filter((ev) => ev.date === tomorrow).forEach((ev) => {
    (ev.invitees || []).forEach((mid) => {
      const m = DB.find('mothers', mid);
      if (!m) return;
      tasks.push({
        icon: 'coffee', title: `תזכורת מפגש · ${m.motherName}`, sub: `מחר ב${ev.location || ''}`,
        phone: m.phone, tpl: 'eventReminder',
        vars: { motherName: m.motherName, dateFull: fmtDateFull(ev.date), location: ev.location }
      });
    });
  });

  window._reminderTasks = tasks;

  return `
    <div class="card" style="background:var(--gradient-soft)">
      <div class="card-row">
        <div class="avatar" style="background:var(--card)">${icon('bell')}</div>
        <div style="flex:1">
          <div class="card-title">${tasks.length} תזכורות ממתינות</div>
          <div class="card-sub">לחיצה פותחת הודעה מוכנה לשליחה</div>
        </div>
      </div>
    </div>

    ${tasks.length ? tasks.map((t, i) => `
      <div class="row" data-task="${i}">
        <div class="icon-btn wa">${icon(t.icon)}</div>
        <div class="row-main">
          <div class="row-title">${e(t.title)}</div>
          <div class="row-sub">${e(t.sub)}</div>
        </div>
        ${icon('whatsapp')}
      </div>`).join('') : UI.empty('check', 'הכל מעודכן!', 'אין תזכורות שדורשות טיפול כרגע')}

    <div class="section-title">${icon('message')} תבניות הודעות</div>
    ${Object.entries(TEMPLATES).map(([k, t]) => `
      <div class="row" data-tpl="${k}">
        <div class="icon-btn">${icon(t.icon)}</div>
        <div class="row-main"><div class="row-title">${e(t.title)}</div></div>
        ${icon('back')}
      </div>`).join('')}
  `;
}

function bindReminders(root) {
  root.querySelectorAll('[data-task]').forEach((el) => {
    el.onclick = () => {
      const t = window._reminderTasks[Number(el.dataset.task)];
      previewMessage(TEMPLATES[t.tpl].title, buildMessage(t.tpl, t.vars), t.phone);
    };
  });

  root.querySelectorAll('[data-tpl]').forEach((el) => {
    el.onclick = () => {
      const k = el.dataset.tpl;
      // תצוגת התבנית עם מציין מקום — לבחירת נמען ידנית
      previewMessage(TEMPLATES[k].title, buildMessage(k, {
        motherName: '[שם]', volunteerName: '[שם]', childName: '[ילד/ה]',
        dateFull: '[תאריך]', location: '[מיקום]', address: '[כתובת]',
        contactName: '[איש קשר]', contactAddress: '[כתובת]', roleLabel: '[תפקיד]'
      }), '');
    };
  });
}

// ------------------------------------------------------------
//  המשימות שלי (מתנדבת) — רואה רק את השיבוצים שלה
// ------------------------------------------------------------
function screenMyTasks() {
  const me = DB.me;
  const vid = me.volunteerId;
  const today = todayISO();

  const mine = DB.all('meals')
    .filter((m) => (m.cookId === vid || m.driverId === vid) && m.date >= today && m.status !== 'cancelled')
    .sort((a, b) => a.date.localeCompare(b.date));

  return `
    <div class="hero">
      <div class="hero-greet">היי ${e(me.name)},</div>
      <div class="hero-name">${mine.length ? `${mine.length} שיבוצים קרובים` : 'אין שיבוצים כרגע'}</div>
    </div>

    ${mine.map((m) => {
      const mo = DB.find('mothers', m.motherId);
      if (!mo) return '';
      const isDriver = m.driverId === vid;
      return `
        <div class="card">
          <div class="card-row">
            <div class="avatar">${icon(isDriver ? 'truck' : 'utensils')}</div>
            <div style="flex:1">
              <div class="card-title">${isDriver ? 'שינוע' : 'הכנת ארוחה'} · ${fmtDate(m.date)}</div>
              <div class="card-sub">${relativeDay(m.date)}${m.deliveryTime ? ` · ${e(m.deliveryTime)}` : ''}</div>
            </div>
            <span class="badge ${m.status === 'done' ? 'ok' : ''}">${m.status === 'done' ? 'בוצע' : 'מתוכנן'}</span>
          </div>

          ${isDriver ? `
            <div class="card-sub" style="margin-top:12px;line-height:1.6">
              ${icon('mappin', 13)} ${e(mo.address || 'אין כתובת')}
              ${mo.entryCode ? `<br>🔑 ${e(mo.entryCode)}` : ''}
              ${mo.phone ? `<br>${icon('phone', 13)} ${e(mo.phone)}` : ''}
            </div>` : ''}

          ${m.status !== 'done' ? `
            <button class="btn btn-sm" data-done="${m.id}" style="margin-top:12px;width:100%">
              ${icon('check')} סימון כבוצע
            </button>` : ''}
        </div>`;
    }).join('') || UI.empty('calendar', 'אין שיבוצים', 'המנהלת תשבץ אותך ותקבלי הודעה')}
  `;
}

function bindMyTasks(root) {
  root.querySelectorAll('[data-done]').forEach((el) => {
    el.onclick = () => {
      const m = DB.find('meals', el.dataset.done);
      DB.update('meals', m.id, { status: 'done' });
      DB.logEvent(m.motherId, 'meal', `ארוחת בוקר סופקה (${fmtDate(m.date)})`);
      UI.toast('תודה רבה! 💗');
      render();
    };
  });
}

// ------------------------------------------------------------
//  הגדרות והרשאות
// ------------------------------------------------------------
function screenSettings() {
  const users = DB.all('users');
  const me = DB.me;

  return `
    <div class="section-title">${icon('users')} משתמשות והרשאות</div>
    ${users.map((u) => `
      <div class="row" data-user="${u.id}">
        <div class="avatar">${e(UI.initials(u.name))}</div>
        <div class="row-main">
          <div class="row-title">${e(u.name)} ${u.id === me.id ? '<span class="badge ok">את</span>' : ''}</div>
          <div class="row-sub">${e(ROLES[u.role])}${u.phone ? ` · ${e(u.phone)}` : ''}</div>
        </div>
        ${icon('edit')}
      </div>`).join('')}

    <button class="btn btn-ghost" id="add-user" style="margin-top:10px">${icon('plus')} הוספת משתמשת</button>

    ${me.role === 'manager' ? `
      <div class="section-title">${icon('message')} הודעה למנהלת הראשית</div>
      <div class="card">
        <div class="card-sub" style="margin-bottom:10px">ההודעה תופיע כבאנר בדף הבית שלה</div>
        <button class="btn" id="send-note">${icon('plus')} כתיבת הודעה</button>
      </div>` : ''}

    <div class="section-title">${icon('settings')} מצב סנכרון</div>
    <div class="card">
      <div class="card-row">
        <div class="avatar" style="background:${SUPABASE_READY ? '#D1FAE5' : '#FEF3C7'};color:${SUPABASE_READY ? '#065F46' : '#92400E'}">
          ${icon(SUPABASE_READY ? 'check' : 'alert')}
        </div>
        <div style="flex:1">
          <div class="card-title">${SUPABASE_READY ? 'מסונכרן בענן' : 'מצב מקומי'}</div>
          <div class="card-sub" style="line-height:1.5">
            ${SUPABASE_READY
              ? 'כל המשתמשות רואות את אותם נתונים'
              : 'הנתונים נשמרים על המכשיר הזה בלבד. להפעלת סנכרון — ראי README'}
          </div>
        </div>
      </div>
    </div>

    <div class="section-title">${icon('download')} גיבוי</div>
    <div class="btn-row">
      <button class="btn btn-ghost btn-sm" style="flex:1" id="export-all">${icon('download')} ייצוא נתונים</button>
      <button class="btn btn-ghost btn-sm" style="flex:1" id="import-all">${icon('filetext')} ייבוא</button>
    </div>

    ${me.role === 'admin' ? `
      <div class="section-title" style="color:var(--danger)">${icon('alert')} איפוס</div>
      <div class="card" style="border:1.5px solid #FBCFE0">
        <div class="card-sub" style="line-height:1.5;margin-bottom:10px">
          מחיקת כל היולדות והנתונים הקשורים (ארוחות, מתנות, ציר זמן).
          שימושי לניקוי לפני הזנת רשימה אמיתית. הפעולה אינה הפיכה.
        </div>
        <button class="btn btn-danger btn-sm" id="reset-mothers" style="width:auto">${icon('trash')} מחיקת כל היולדות</button>
      </div>` : ''}
  `;
}

function bindSettings(root) {
  root.querySelectorAll('[data-user]').forEach((el) => {
    el.onclick = () => userForm(el.dataset.user);
  });

  root.querySelector('#add-user').onclick = () => userForm();

  const note = root.querySelector('#send-note');
  if (note) note.onclick = () => {
    UI.modal('הודעה למנהלת הראשית', `
      <div id="nf2">
        ${UI.textarea('תוכן ההודעה', 'text', '')}
        <button class="btn" id="nf2-save">${icon('check')} שליחה</button>
      </div>
    `, (c) => {
      c.querySelector('#nf2-save').onclick = () => {
        const { text } = UI.readForm(c.querySelector('#nf2'));
        if (!text) return UI.toast('חובה למלא תוכן');
        DB.insert('notes', { fromUserId: DB.me.id, text, date: todayISO(), read: false });
        UI.closeModal();
        UI.toast('ההודעה נשלחה');
      };
    });
  };

  root.querySelector('#export-all').onclick = () => {
    const blob = new Blob([JSON.stringify(DB.raw, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `shifra-backup-${todayISO()}.json`;
    a.click();
    UI.toast('הגיבוי הורד');
  };

  const reset = root.querySelector('#reset-mothers');
  if (reset) reset.onclick = () => {
    const n = DB.all('mothers').length;
    UI.confirm('מחיקת כל היולדות', `למחוק ${n} יולדות וכל הנתונים הקשורים? הפעולה אינה הפיכה.`, async () => {
      reset.disabled = true;
      reset.innerHTML = 'מוחקת...';
      // מחיקה דרך ה-API המאומת של המשתמשת — עובר דרך ה-RLS
      const cols = ['meals', 'kits', 'birthGifts', 'yearGifts', 'timeline', 'mothers'];
      cols.forEach((col) => {
        DB.all(col).slice().forEach((x) => DB.remove(col, x.id));
      });
      UI.toast(`נמחקו ${n} יולדות`);
      route = { name: 'dashboard', param: null };
      render();
    });
  };

  root.querySelector('#import-all').onclick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = () => {
      const f = input.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        UI.confirm('ייבוא נתונים', 'הפעולה תחליף את כל הנתונים הקיימים במכשיר. להמשיך?', () => {
          try {
            localStorage.setItem(STORE_KEY, reader.result);
            location.reload();
          } catch (err) {
            UI.toast('הקובץ אינו תקין');
          }
        });
      };
      reader.readAsText(f);
    };
    input.click();
  };
}

function userForm(id) {
  const u = id ? DB.find('users', id) : {};
  const vols = DB.all('volunteers');

  UI.modal(id ? 'עריכת משתמשת' : 'משתמשת חדשה', `
    <div id="uf">
      ${UI.field('שם *', 'name', u.name)}
      ${UI.field('טלפון', 'phone', u.phone, 'tel')}
      ${UI.select('תפקיד *', 'role', u.role, Object.entries(ROLES).map(([k, l]) => ({ value: k, label: l })))}
      ${UI.select('קישור לכרטיס מתנדבת', 'volunteerId', u.volunteerId,
        vols.map((v) => ({ value: v.id, label: v.name })))}
      <div class="card-sub" style="margin:-6px 0 14px;line-height:1.5">
        נדרש רק למתנדבות — כך המערכת יודעת אילו שיבוצים להציג לה
      </div>
      <button class="btn" id="uf-save">${icon('check')} שמירה</button>
      ${id && id !== DB.me.id ? `<button class="btn btn-ghost" id="uf-del" style="margin-top:9px;color:var(--danger)">${icon('trash')} מחיקה</button>` : ''}
    </div>
  `, (c) => {
    c.querySelector('#uf-save').onclick = () => {
      const data = UI.readForm(c.querySelector('#uf'));
      if (!data.name || !data.role) return UI.toast('חובה למלא שם ותפקיד');
      data.volunteerId = data.volunteerId || null;
      if (id) DB.update('users', id, data);
      else DB.insert('users', Object.assign({ active: true }, data));
      UI.closeModal();
      render();
    };

    const del = c.querySelector('#uf-del');
    if (del) del.onclick = () => {
      UI.closeModal();
      UI.confirm('מחיקת משתמשת', `למחוק את ${e(u.name)}?`, () => { DB.remove('users', id); render(); });
    };
  });
}

// מעבר בין משתמשות — במצב מקומי זה גם מדמה כניסה לתפקידים השונים
function userSwitcher() {
  // במצב מחובר-לענן אין "החלפת משתמשת" — יש יציאה והתחברות מחדש
  if (SUPABASE_READY) {
    const me = DB.me;
    UI.modal('החשבון שלי', `
      <div class="row">
        <div class="avatar">${e(UI.initials(me.name))}</div>
        <div class="row-main">
          <div class="row-title">${e(me.name)}</div>
          <div class="row-sub">${e(ROLES[me.role])}</div>
        </div>
      </div>
      <button class="btn btn-ghost" id="acc-refresh" style="margin-top:12px">
        ${icon('download')} רענון נתונים מהשרת
      </button>
      <button class="btn btn-ghost" id="acc-out" style="margin-top:9px;color:var(--danger)">
        ${icon('logout')} יציאה
      </button>
    `, (c) => {
      c.querySelector('#acc-refresh').onclick = async () => {
        await DB.refresh();
        UI.closeModal();
        UI.toast('הנתונים עודכנו');
        render();
      };
      c.querySelector('#acc-out').onclick = () => {
        UI.closeModal();
        UI.confirm('יציאה', 'לצאת מהחשבון?', () => Auth.signOut());
      };
    });
    return;
  }

  const users = DB.all('users');
  UI.modal('החלפת משתמשת', `
    ${users.map((u) => `
      <div class="row" data-switch="${u.id}">
        <div class="avatar">${e(UI.initials(u.name))}</div>
        <div class="row-main">
          <div class="row-title">${e(u.name)}</div>
          <div class="row-sub">${e(ROLES[u.role])}</div>
        </div>
        ${u.id === DB.me.id ? `<span class="badge ok">${icon('check', 12)}</span>` : ''}
      </div>`).join('')}
  `, (c) => {
    c.querySelectorAll('[data-switch]').forEach((el) => {
      el.onclick = () => {
        DB.setCurrentUser(el.dataset.switch);
        UI.closeModal();
        route = { name: 'dashboard', param: null };
        render();
      };
    });
  });
}

// ------------------------------------------------------------
//  מסך התחברות (רק כשמחוברים ל-Supabase)
// ------------------------------------------------------------
function renderLogin(errMsg) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="login">
      <div class="login-card">
        <div class="login-logo">${icon('heart', 34)}</div>
        <div class="login-title">${e(CONFIG.ORG_NAME)}</div>
        <div class="login-sub">מערכת ניהול</div>

        <div id="lf">
          <div class="field">
            <label>מייל</label>
            <input type="email" name="email" autocomplete="username" dir="ltr">
          </div>
          <div class="field">
            <label>סיסמה</label>
            <input type="password" name="password" autocomplete="current-password" dir="ltr">
          </div>
          ${errMsg ? `<div class="alert" style="margin-bottom:12px">
            ${icon('alert')}<div class="alert-text">${e(errMsg)}</div>
          </div>` : ''}
          <button class="btn" id="lf-go">${icon('check')} כניסה</button>
        </div>
      </div>
    </div>
  `;

  const btn = app.querySelector('#lf-go');
  const submit = async () => {
    const { email, password } = UI.readForm(app.querySelector('#lf'));
    if (!email || !password) return renderLogin('יש למלא מייל וסיסמה');

    btn.disabled = true;
    btn.innerHTML = 'מתחברת...';
    try {
      await Auth.signIn(email, password);
      route = { name: 'dashboard', param: null };
      render();
    } catch (err) {
      renderLogin(err.message);
    }
  };

  btn.onclick = submit;
  app.querySelector('[name="password"]').onkeydown = (ev) => {
    if (ev.key === 'Enter') submit();
  };
}

// ------------------------------------------------------------
//  מסך בחירת סיסמה (בכניסה ראשונה דרך קישור הזמנה)
// ------------------------------------------------------------
function renderSetPassword(errMsg) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="login">
      <div class="login-card">
        <div class="login-logo">${icon('heart', 34)}</div>
        <div class="login-title">ברוכה הבאה!</div>
        <div class="login-sub">כדי לסיים, בחרי סיסמה לכניסות הבאות</div>

        <div id="sp">
          <div class="field">
            <label>סיסמה חדשה</label>
            <input type="password" name="password" autocomplete="new-password" dir="ltr">
          </div>
          <div class="field">
            <label>אימות סיסמה</label>
            <input type="password" name="confirm" autocomplete="new-password" dir="ltr">
          </div>
          ${errMsg ? `<div class="alert" style="margin-bottom:12px">
            ${icon('alert')}<div class="alert-text">${e(errMsg)}</div>
          </div>` : ''}
          <button class="btn" id="sp-go">${icon('check')} שמירה וכניסה</button>
        </div>
      </div>
    </div>
  `;

  const btn = app.querySelector('#sp-go');
  const submit = async () => {
    const { password, confirm } = UI.readForm(app.querySelector('#sp'));
    if (!password || password.length < 6) return renderSetPassword('סיסמה חייבת להיות לפחות 6 תווים');
    if (password !== confirm) return renderSetPassword('הסיסמאות אינן תואמות');

    btn.disabled = true;
    btn.innerHTML = 'שומרת...';
    try {
      await Auth.setPassword(password);
      if (!DB.me) return renderLogin('הסיסמה נשמרה. כעת אפשר להתחבר.');
      route = { name: 'dashboard', param: null };
      render();
    } catch (err) {
      renderSetPassword(err.message);
    }
  };

  btn.onclick = submit;
  app.querySelector('[name="confirm"]').onkeydown = (ev) => {
    if (ev.key === 'Enter') submit();
  };
}

// ------------------------------------------------------------
//  אתחול
// ------------------------------------------------------------
async function boot() {
  // כל קישור אימות במייל (הזמנה / איפוס / magic link) מגיע עם access_token
  // ב-hash. משתמשת חוזרת עם סשן שמור מגיעה בלי hash — לכן זה מזהה נכון
  // "כניסה ראשונה דרך קישור" ומפנה למסך בחירת סיסמה.
  const arrivedViaLink = location.hash.includes('access_token');

  try {
    await DB.init();
  } catch (err) {
    console.error('init failed', err);
  }

  // במצב מחובר-לענן חייבים התחברות אמיתית לפני שרואים משהו
  if (SUPABASE_READY) {
    const session = await Auth.session();

    // הגעה דרך קישור הזמנה → קביעת סיסמה ראשונית
    if (session && arrivedViaLink) return renderSetPassword();

    if (!session) return renderLogin();
    if (!DB.me) return renderLogin('המשתמשת אינה מוגדרת במערכת. פני למנהלת.');
  }

  render();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

boot();
