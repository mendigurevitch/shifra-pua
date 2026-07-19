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
  const weekEnd = addDays(today, 7);
  const weekMeals = DB.all('meals').filter((m) => m.date >= today && m.date <= weekEnd && m.status !== 'cancelled');
  const lowStock = DB.lowStock();
  const notes = me.role === 'admin' ? DB.all('notes').filter((n) => !n.read) : [];

  // מתנות גיל שנה שדורשות טיפול (עד שבוע לפני יום ההולדת)
  const yearDue = DB.all('yearGifts').filter((g) => {
    if (g.status === 'done' || !g.dueDate) return false;
    const left = daysBetween(today, g.dueDate);
    return left <= CONFIG.YEAR_GIFT_REMINDER_DAYS && left >= -30;
  });

  const quickActions = [
    { id: 'tasks', label: 'משימות', icon: 'filetext' },
    { id: 'torah', label: 'אות בס״ת', icon: 'scroll' },
    { id: 'events', label: 'אירועים', icon: 'coffee' },
    { id: 'gifts', label: 'מתנות', icon: 'gift' },
    { id: 'inventory', label: 'מלאי', icon: 'package' },
    { id: 'neighborhoods', label: 'שכונות', icon: 'mappin' },
    { id: 'volunteers', label: 'מתנדבות', icon: 'users' },
    { id: 'mothers', label: 'יולדות', icon: 'heart' }
  ];

  return `
    <div class="screen-head">
      <div>
        <h2 class="screen-title">${icon('home')} מסך הבית</h2>
        <div class="screen-sub">סקירה מהירה של הפעילות בארגון</div>
      </div>
      <button class="icon-btn" id="go-cal">${icon('calendar')}</button>
    </div>

    ${yearDue.length ? `
      <div class="task-card-green">
        <div class="task-card-title">${icon('cake', 16)} מתנות גיל שנה — לטיפול (${yearDue.length})</div>
        ${yearDue.slice(0, 3).map((g) => {
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

    <div class="stat-grid stat-grid-3">
      <div class="stat" data-go="inventory">
        <div class="stat-ico warn">${icon('alert', 20)}</div>
        <div class="stat-num" style="color:var(--danger)">${lowStock.length}</div>
        <div class="stat-label">מלאי נמוך</div>
      </div>
      <div class="stat" data-go="messages">
        <div class="stat-ico">${icon('message', 20)}</div>
        <div class="stat-num">${notes.length}</div>
        <div class="stat-label">הודעות חדשות</div>
      </div>
      <div class="stat" data-go="mothers">
        <div class="stat-ico pink">${icon('heart', 20)}</div>
        <div class="stat-num" style="color:var(--primary)">${mothers.length}</div>
        <div class="stat-label">יולדות</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title" style="display:flex;align-items:center;gap:7px;margin-bottom:${notes.length ? '12px' : '0'}">
        ${icon('message', 16)} הודעות מהמנהלה
      </div>
      ${notes.length ? notes.map((n) => {
        const from = DB.find('users', n.fromUserId);
        return `
          <div class="task-row" data-note="${n.id}">
            <div>
              <div class="row-title">${e(n.text)}</div>
              <div class="row-sub">${e(from ? from.name : 'מנהלת משנית')} · ${relativeDay(n.date)}</div>
            </div>
            <button class="icon-btn" data-read="${n.id}">${icon('check', 15)}</button>
          </div>`;
      }).join('') : '<div class="empty-inline">אין הודעות חדשות</div>'}
    </div>

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

  const cal = root.querySelector('#go-cal');
  if (cal) cal.onclick = () => go('calendar');

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

    <div class="btn-row" style="margin-bottom:12px">
      <button class="btn btn-sm" id="add-mother">${icon('plus')} הוספת יולדת</button>
      <button class="btn btn-ghost btn-sm" id="import-xls">${icon('filetext')} ייבוא אקסל</button>
      <button class="btn btn-ghost btn-sm" id="add-ai">${icon('message')} מהודעה</button>
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
    ${stages.map((s, i) => `
      <div class="stage-ico ${i < activeIdx ? 'done' : ''} ${active === s.id ? 'active' : ''}" title="${s.label}">
        ${icon(s.icon, 15)}<span>${s.label}</span>
      </div>`).join('')}
  </div>`;
}

// השלב הנוכחי של היולדת במסלול
function currentStage(m) {
  const meals = DB.mealsFor(m.id);
  const mealsDone = meals.length && meals.every((x) => x.status === 'done' || x.status === 'cancelled');
  if (!mealsDone) return 'meals';
  const kit = DB.all('kits').find((k) => k.motherId === m.id);
  if (!kit || !kit.deliveredAt) return 'shabbat';
  const bg = DB.all('birthGifts').find((g) => g.motherId === m.id);
  if (bg && bg.status !== 'done') return 'birthGift';
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

function motherCard(m) {
  const color = nbhdColor(m.neighborhood);
  return `
    <div class="mother-card" style="border-inline-start:4px solid ${color}">
      <div class="mc-top">
        <div class="mc-name-row">
          ${babyIcon(m.childGender)}
          <span class="mc-name">${e(m.motherName)} ${e(m.lastName || '')}</span>
          <button class="mc-clock" data-profile="${m.id}">${icon('clock', 15)}</button>
        </div>
        ${m.neighborhood ? `<span class="mc-nbhd" style="background:${color}1F;color:${color}">${e(nbhdName(m.neighborhood))}</span>` : ''}
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
//  הוספת יולדת מהודעת טקסט חופשי
//  מנתח שם/טלפון/כתובת/קוד מתוך טקסט (למשל הודעת וואטסאפ)
// ------------------------------------------------------------
function parseMotherText(text) {
  const out = {};
  // טלפון ישראלי
  const phone = text.match(/0\d[-\s]?\d{3}[-\s]?\d{4}|0\d{8,9}/);
  if (phone) out.phone = phone[0].replace(/[-\s]/g, '');

  // קוד כניסה
  const code = text.match(/קוד[:\s]*([0-9]{2,6}#?)/);
  if (code) out.entryCode = code[1];

  // שכונה — זיהוי חכם כולל כתיבים חלופיים
  const nbId = detectNeighborhood(text);
  if (nbId) out.neighborhood = nbId;

  // כתובת: שורה שמכילה מספר בית (רחוב + מספר)
  const addr = text.match(/([א-ת'"]+(?:\s[א-ת'"]+)*\s\d{1,3})/);
  if (addr && !/^0/.test(addr[1])) out.address = addr[1].trim();

  // שם: הראשון אחרי "שם" או המילים הראשונות
  const nameM = text.match(/(?:שם|יולדת|ילדה)[:\s]+([א-ת]+(?:\s[א-ת]+)?)/);
  if (nameM) out.motherName = nameM[1].trim();
  else {
    const firstWords = text.trim().split(/[\s,]+/).slice(0, 2).filter((w) => /^[א-ת]+$/.test(w));
    if (firstWords.length) out.motherName = firstWords.join(' ');
  }
  return out;
}

function motherFromMessage() {
  UI.modal('הוספה מהודעת טקסט', `
    <div class="card-sub" style="margin-bottom:12px;line-height:1.6">
      הדביקי הודעה שמכילה פרטי יולדת. המערכת תזהה שם, טלפון, כתובת וקוד — ותמלא כרטיס.
    </div>
    <div id="ai">
      ${UI.textarea('טקסט ההודעה', 'text', '')}
      <button class="btn" id="ai-parse">${icon('message')} פענוח</button>
    </div>
  `, (c) => {
    c.querySelector('#ai-parse').onclick = () => {
      const { text } = UI.readForm(c.querySelector('#ai'));
      if (!text) return UI.toast('הדביקי טקסט');
      const parsed = parseMotherText(text);
      if (!parsed.notes) parsed.notes = text.slice(0, 300);
      UI.closeModal();
      // פותח את טופס היולדת עם השדות שזוהו
      motherFormPrefilled(parsed);
    };
  });
}

// טופס יולדת עם ערכים שזוהו מראש
function motherFormPrefilled(data) {
  motherForm(null, data);
}

// ------------------------------------------------------------
//  ייבוא יולדות מאקסל (CSV)
// ------------------------------------------------------------
function importMothersExcel() {
  UI.modal('ייבוא מאקסל', `
    <div class="card-sub" style="margin-bottom:12px;line-height:1.6">
      קובץ CSV עם עמודות: שם האמא, שם משפחה, שם הילד, טלפון, שכונה, כתובת, תאריך לידה.
      השורה הראשונה = כותרות.
    </div>
    <button class="btn" id="xls-pick">${icon('download')} בחירת קובץ</button>
  `, (c) => {
    c.querySelector('#xls-pick').onclick = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv,text/csv';
      input.onchange = () => {
        const f = input.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
          const rows = String(reader.result).replace(/^﻿/, '').split(/\r?\n/).filter((r) => r.trim());
          let count = 0;
          rows.slice(1).forEach((line) => {
            const cols = line.split(',').map((s) => s.replace(/^"|"$/g, '').trim());
            if (!cols[0]) return;
            const nbId = detectNeighborhood(cols[4]) || detectNeighborhood(cols[5]);
            DB.addMother({
              motherName: cols[0], lastName: cols[1] || '', childName: cols[2] || '',
              phone: cols[3] || '', neighborhood: nbId, address: cols[5] || '',
              birthDate: cols[6] || ''
            });
            count++;
          });
          UI.closeModal();
          UI.toast(`יובאו ${count} יולדות`);
          render();
        };
        reader.readAsText(f);
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
let invTab = 'oneTime';

function screenInventory() {
  const all = DB.all('inventory');
  const low = DB.lowStock();
  const list = all.filter((i) => (i.category || 'other') === invTab);

  return `
    <div class="screen-head">
      <div>
        <h2 class="screen-title">${icon('package')} מלאי</h2>
        <div class="screen-sub">ניהול חד-פעמי וערכות מתנה</div>
      </div>
      <button class="btn btn-sm" id="add-inv" style="width:auto">${icon('plus')} פריט חדש</button>
    </div>

    ${low.length ? `
      <div class="low-panel">
        <div class="low-panel-title">${icon('alert', 15)} פריטים במלאי נמוך (${low.length})</div>
        <div class="low-chips">
          ${low.map((i) => `<span class="low-chip">${e(i.name)} ${i.qty}/${i.minQty}</span>`).join('')}
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
        <div class="inv-name">${e(i.name)}</div>
        <button class="inv-edit" data-inv="${i.id}">${icon('edit', 15)}</button>
      </div>
      <div class="inv-qty ${empty ? 'zero' : ''}">${i.qty}</div>
      <div class="inv-meta">${e(i.unit || 'יח')}׳ · מינימום ${i.minQty}</div>
      <div class="inv-actions">
        <button class="inv-del" data-invdel="${i.id}">${icon('trash', 15)}</button>
        <button class="inv-order" data-invorder="${i.id}" title="הזמנה">${icon('package', 15)}</button>
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

  root.querySelectorAll('[data-invorder]').forEach((el) => {
    el.onclick = () => {
      const item = DB.find('inventory', el.dataset.invorder);
      UI.modal(`הזמנת ${e(item.name)}`, `
        <div id="ordf">
          ${UI.field('כמה להוסיף למלאי?', 'add', 0, 'number')}
          <button class="btn" id="ordf-save">${icon('check')} עדכון מלאי</button>
        </div>
      `, (c) => {
        c.querySelector('#ordf-save').onclick = () => {
          const { add } = UI.readForm(c.querySelector('#ordf'));
          DB.update('inventory', item.id, { qty: item.qty + (add || 0) });
          UI.closeModal();
          UI.toast('המלאי עודכן');
          render();
        };
      });
    };
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
      <button class="btn" id="if-save">${icon('check')} שמירה</button>
      ${id ? `<button class="btn btn-ghost" id="if-del" style="margin-top:9px;color:var(--danger)">${icon('trash')} מחיקה</button>` : ''}
    </div>
  `, (c) => {
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
