// ============================================================
//  שכבת נתונים
//  ------------------------------------------------------------
//  כל המסכים מדברים רק עם DB.* ולעולם לא ישירות עם האחסון.
//  לכן המעבר מאחסון מקומי ל-Supabase לא דורש שינוי במסכים.
// ============================================================

const STORE_KEY = 'shifra-pua-data';

const COLLECTIONS = [
  'users', 'mothers', 'volunteers', 'contacts', 'inventory',
  'meals', 'kits', 'birthGifts', 'yearGifts', 'events',
  'timeline', 'notes', 'orders'
];

let state = null;
let sb = null; // Supabase client when configured

// ---------- utils ----------
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const todayISO = () => new Date().toISOString().slice(0, 10);

function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  const ms = new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00');
  return Math.round(ms / 86400000);
}

// גיל הילד/ה בחודשים — משמש למתנת גיל שנה ולהזמנות לבוקר יולדות
function monthsSince(iso) {
  const from = new Date(iso + 'T12:00:00');
  const now = new Date();
  return (now.getFullYear() - from.getFullYear()) * 12 + (now.getMonth() - from.getMonth());
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
}

function fmtDateFull(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function relativeDay(iso) {
  const diff = daysBetween(todayISO(), iso);
  if (diff === 0) return 'היום';
  if (diff === 1) return 'מחר';
  if (diff === -1) return 'אתמול';
  if (diff > 1) return `בעוד ${diff} ימים`;
  return `לפני ${Math.abs(diff)} ימים`;
}

function nbhdName(id) {
  const n = NEIGHBORHOODS.find((x) => x.id === id);
  return n ? n.name : '';
}

function nbhdColor(id) {
  const n = NEIGHBORHOODS.find((x) => x.id === id);
  return n ? n.color : 'var(--text-muted)';
}

// ---------- empty / demo state ----------
function emptyState() {
  const s = { currentUserId: null };
  COLLECTIONS.forEach((c) => { s[c] = []; });
  return s;
}

function defaultInventory() {
  return [
    'קערת סלט גדולה', 'קערת סלט קטנה', 'תבנית אפייה קטנה', 'בקבוקים',
    'כוסות שייק', 'רוטב קטן', 'רוטב גדול', 'ניילון ללחם', 'שקית אריזה'
  ].map((name) => ({ id: uid(), name, qty: 50, minQty: 15 }));
}

function seedState() {
  const s = emptyState();
  s.users = [
    { id: 'u-admin', name: 'מנהלת ראשית', phone: '', role: 'admin', active: true },
    { id: 'u-manager', name: 'מנהלת משנית', phone: '', role: 'manager', active: true }
  ];
  s.inventory = defaultInventory();
  s.currentUserId = 'u-admin';
  return s;
}

// ---------- persistence ----------
function saveLocal() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('save failed', e);
  }
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw);
    const base = emptyState();
    // מיזוג עם המבנה הריק כדי שאוספים חדשים לא ישברו התקנות ישנות
    return Object.assign(base, parsed);
  } catch (e) {
    console.error('load failed', e);
    return seedState();
  }
}

// ============================================================
//  DB API
// ============================================================
const DB = {
  async init() {
    if (SUPABASE_READY) {
      await loadSupabaseClient();
    }
    state = loadLocal();
    if (!state.inventory.length) state.inventory = defaultInventory();
    if (!state.users.length) {
      state.users = seedState().users;
      state.currentUserId = 'u-admin';
    }
    saveLocal();
    return state;
  },

  get raw() { return state; },

  all(collection) { return state[collection] || []; },

  find(collection, id) { return (state[collection] || []).find((x) => x.id === id) || null; },

  insert(collection, obj) {
    const rec = Object.assign({ id: uid(), createdAt: new Date().toISOString() }, obj);
    state[collection].push(rec);
    saveLocal();
    if (sb) syncUp(collection, rec);
    return rec;
  },

  update(collection, id, patch) {
    const rec = DB.find(collection, id);
    if (!rec) return null;
    Object.assign(rec, patch);
    saveLocal();
    if (sb) syncUp(collection, rec);
    return rec;
  },

  remove(collection, id) {
    state[collection] = state[collection].filter((x) => x.id !== id);
    saveLocal();
    if (sb) sb.from(collection).delete().eq('id', id);
  },

  // ---------- current user / permissions ----------
  get me() {
    return DB.find('users', state.currentUserId) || state.users[0] || null;
  },

  setCurrentUser(id) {
    state.currentUserId = id;
    saveLocal();
  },

  can(what) {
    const me = DB.me;
    if (!me) return false;
    if (me.role === 'admin') return true;
    if (me.role === 'manager') return what !== 'manageUsers';
    // מתנדבת: רק המשימות שלה + הזמנת ציוד
    return what === 'orderSupplies' || what === 'viewOwnTasks';
  },

  // ---------- timeline ----------
  logEvent(motherId, type, text) {
    return DB.insert('timeline', { motherId, type, text, date: todayISO() });
  },

  timelineFor(motherId) {
    return DB.all('timeline')
      .filter((t) => t.motherId === motherId)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  },

  // ============================================================
  //  לוגיקה עסקית
  // ============================================================

  // יולדת חדשה -> פותח אוטומטית 5 ימי ארוחות + רשומת מתנת לידה + מתנת גיל שנה
  addMother(data) {
    const mother = DB.insert('mothers', Object.assign({ status: 'active' }, data));

    let d = mother.birthDate || todayISO();
    for (let i = 0; i < CONFIG.MEAL_DAYS; i++) {
      d = nextWeekday(i === 0 ? addDays(d, 1) : addDays(d, 1));
      DB.insert('meals', {
        motherId: mother.id,
        date: d,
        cookId: null,
        driverId: null,
        deliveryTime: '',
        status: 'pending'
      });
    }

    DB.insert('birthGifts', {
      motherId: mother.id,
      letterOrdered: false,
      accessories: false,
      deliveredAt: null,
      status: 'pending'
    });

    if (mother.birthDate) {
      DB.insert('yearGifts', {
        motherId: mother.id,
        contactId: null,
        dueDate: addDays(mother.birthDate, 365),
        collectedAt: null,
        status: 'pending'
      });
    }

    DB.logEvent(mother.id, 'registered', 'נרשמה למערכת · נפתחו 5 ימי ארוחות בוקר');
    return mother;
  },

  mealsFor(motherId) {
    return DB.all('meals')
      .filter((m) => m.motherId === motherId)
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  // ערכת שבת מוצעת שבוע אחרי הארוחה האחרונה
  kitDueDate(motherId) {
    const meals = DB.mealsFor(motherId);
    if (!meals.length) return null;
    return addDays(meals[meals.length - 1].date, CONFIG.SHABBAT_KIT_OFFSET_DAYS);
  },

  // ---------- מלאי ----------
  lowStock() {
    return DB.all('inventory').filter((i) => i.qty <= i.minQty);
  },

  placeOrder(volunteerId, items) {
    const order = DB.insert('orders', { volunteerId, items, date: todayISO() });
    items.forEach(({ itemId, qty }) => {
      const item = DB.find('inventory', itemId);
      if (item) DB.update('inventory', itemId, { qty: Math.max(0, item.qty - qty) });
    });
    return order;
  },

  // ---------- התראות לדשבורד ----------
  alerts() {
    const out = [];

    DB.lowStock().forEach((i) => {
      out.push({ level: 'warn', text: `מלאי נמוך: ${i.name} — נותרו ${i.qty}` });
    });

    // ארוחות מחר בלי שיבוץ
    const tomorrow = addDays(todayISO(), 1);
    const unassigned = DB.all('meals').filter(
      (m) => m.date === tomorrow && m.status === 'pending' && (!m.cookId || !m.driverId)
    );
    if (unassigned.length) {
      out.push({ level: 'danger', text: `${unassigned.length} ארוחות מחר עדיין ללא שיבוץ מלא` });
    }

    // מתנות גיל שנה שמתקרבות
    DB.all('yearGifts')
      .filter((g) => g.status === 'pending' && g.dueDate)
      .forEach((g) => {
        const left = daysBetween(todayISO(), g.dueDate);
        if (left <= CONFIG.YEAR_GIFT_REMINDER_DAYS && left >= 0) {
          const m = DB.find('mothers', g.motherId);
          if (m) out.push({ level: 'info', text: `מתנת גיל שנה ל${m.childName} — ${relativeDay(g.dueDate)}` });
        }
      });

    // ערכות שבת שהגיע זמן להציע
    DB.all('mothers')
      .filter((m) => m.status === 'active')
      .forEach((m) => {
        const due = DB.kitDueDate(m.id);
        const existing = DB.all('kits').find((k) => k.motherId === m.id);
        if (due && !existing && daysBetween(todayISO(), due) <= 0) {
          out.push({ level: 'info', text: `${m.motherName} — הגיע הזמן להציע ערכת שבת` });
        }
      });

    return out;
  },

  // ימי הולדת מתנדבות בשבועיים הקרובים
  upcomingBirthdays() {
    const now = new Date();
    return DB.all('volunteers')
      .filter((v) => v.birthday)
      .map((v) => {
        const b = new Date(v.birthday + 'T12:00:00');
        const next = new Date(now.getFullYear(), b.getMonth(), b.getDate(), 12);
        if (next < now) next.setFullYear(next.getFullYear() + 1);
        return { v, days: Math.round((next - now) / 86400000) };
      })
      .filter((x) => x.days <= 14)
      .sort((a, b) => a.days - b.days);
  }
};

// דילוג על שבת — הארוחות ניתנות 5 ימים בשבוע
function nextWeekday(iso) {
  let d = iso;
  while (new Date(d + 'T12:00:00').getDay() === 6) d = addDays(d, 1);
  return d;
}

// ============================================================
//  Supabase (נטען רק אם מולאו פרטים ב-config.js)
// ============================================================
async function loadSupabaseClient() {
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
}

async function syncUp(collection, rec) {
  try {
    await sb.from(collection).upsert(rec);
  } catch (e) {
    console.warn('sync failed, will retry next load', e);
  }
}
