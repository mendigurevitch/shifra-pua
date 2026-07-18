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

// קטגוריות מלאי (טאבים במסך המלאי)
const INV_CATEGORIES = [
  { id: 'oneTime', name: 'חד-פעמי' },
  { id: 'afterBirth', name: 'מתנה אחרי לידה' },
  { id: 'pregnancy', name: 'ערכת הריוניות' },
  { id: 'yearGift', name: 'מתנת גיל שנה' },
  { id: 'other', name: 'אחר' }
];

// המלאי המדויק מהצילומים של המערכת הקיימת
function defaultInventory() {
  const items = [
    // חד-פעמי
    ['oneTime', 'נייר קטן ללחם', 150, 20, 'יח'],
    ['oneTime', 'כוסות שייק', 400, 20, 'יח'],
    ['oneTime', 'בקבוקים', 150, 10, 'יח'],
    ['oneTime', 'קשים', 200, 20, 'יח'],
    ['oneTime', 'קערת סלט קטנה', 100, 10, 'יח'],
    ['oneTime', 'קערת סלט גדולה', 70, 10, 'יח'],
    ['oneTime', 'שקית לאריזה', 250, 20, 'יח'],
    ['oneTime', 'רוטב קטן', 0, 20, 'יח'],
    ['oneTime', 'רוטב גדול', 1000, 10, 'יח'],
    ['oneTime', 'תבנית קטנה לאפייה (שחור-זהב)', 450, 10, 'יח'],
    // מתנה אחרי לידה
    ['afterBirth', 'ערכה של שפרה ופועה מל״ש', 20, 3, 'יח'],
    ['afterBirth', 'הסבר שמן אתרי', 0, 5, 'יח'],
    ['afterBirth', 'הדפסות צבעוניות', 0, 5, 'יח'],
    ['afterBirth', 'שוקלד', 0, 5, 'יח'],
    ['afterBirth', 'שוברים', 0, 5, 'יח'],
    ['afterBirth', 'פתק הסבר שפרה ופועה', 0, 5, 'יח'],
    ['afterBirth', 'שמן אתרי לתינוק', 0, 5, 'יח'],
    // ערכת הריוניות
    ['pregnancy', 'סוכריות מציצה', 0, 5, 'שקיות'],
    ['pregnancy', 'דוגמיות סימני מתיחה', 0, 5, 'יח'],
    ['pregnancy', 'בקבוק מים', 0, 5, 'יח'],
    ['pregnancy', 'שמן לידה של יהודית', 0, 3, 'יח'],
    ['pregnancy', 'שובר השאלת TENS', 0, 3, 'יח'],
    ['pregnancy', 'שובר הפרשת חלה', 0, 5, 'יח'],
    ['pregnancy', 'תהילים + שיר המעלות', 0, 5, 'יח'],
    // מתנת גיל שנה
    ['yearGift', 'משחק לילד', 0, 5, 'יח'],
    ['yearGift', 'מגנט', 0, 5, 'יח'],
    ['yearGift', 'גרבר ללא סוכר', 0, 5, 'יח'],
    ['yearGift', 'תהילים אישי', 0, 5, 'יח'],
    ['yearGift', 'ספרון מתנת גיל שנה', 25, 3, 'יח']
  ];
  return items.map(([category, name, qty, minQty, unit], i) => ({
    id: 'inv-' + (i + 1), category, name, qty, minQty, unit
  }));
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
    state = loadLocal();

    if (SUPABASE_READY) {
      await loadSupabaseClient();
      const session = await getSession();
      if (!session) return state; // מסך ההתחברות יטפל בזה

      // חובה למשוך מהשרת — בלי זה כל מכשיר חי בבועה משלו
      await pullAll();
      return state;
    }

    // מצב מקומי בלבד
    if (!state.inventory.length) state.inventory = defaultInventory();
    if (!state.users.length) {
      state.users = seedState().users;
      state.currentUserId = 'u-admin';
    }
    saveLocal();
    return state;
  },

  async refresh() {
    if (!sb) return;
    await pullAll();
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
    if (sb) syncDelete(collection, id);
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

// שמות הטבלאות ב-Postgres לא זהים לשמות האוספים בקוד
const TABLE_OF = {
  users: 'users', mothers: 'mothers', volunteers: 'volunteers',
  contacts: 'contacts', inventory: 'inventory', meals: 'meals',
  kits: 'kits', birthGifts: 'birthGifts', yearGifts: 'yearGifts',
  events: 'events', timeline: 'timeline', notes: 'notes', orders: 'orders'
};

// ------------------------------------------------------------
//  המרת שמות שדות
//  הקוד עובד ב-camelCase, Postgres ב-snake_case.
//  בלי ההמרה הזו כל כתיבה נכשלת על "column does not exist".
// ------------------------------------------------------------
function toSnake(s) {
  return s.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
}

function toCamel(s) {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function rowToRecord(row) {
  const out = {};
  Object.entries(row).forEach(([k, v]) => { out[toCamel(k)] = v; });
  return out;
}

function recordToRow(rec) {
  const out = {};
  Object.entries(rec).forEach(([k, v]) => {
    if (v === undefined) return;
    // מחרוזת ריקה נדחית ע"י Postgres בעמודות תאריך/שעה/מספר.
    // ריק = "אין ערך" = null, וכך הכתיבה מצליחה.
    out[toSnake(k)] = v === '' ? null : v;
  });
  return out;
}

async function loadSupabaseClient() {
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('לא ניתן לטעון את ספריית Supabase'));
    document.head.appendChild(s);
  });
  sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    auth: {
      // detectSessionInUrl קורא את ה-token מקישור ההזמנה (הגעה עם #access_token)
      detectSessionInUrl: true,
      flowType: 'implicit',
      persistSession: true,
      autoRefreshToken: true
    }
  });
  window.__sb = sb; // חשיפה למסך התמונות (Storage)
}

async function getSession() {
  const { data } = await sb.auth.getSession();
  return data.session || null;
}

// משיכת כל הנתונים מהשרת. RLS מחליט מה כל משתמשת בכלל רואה,
// כך שמתנדבת מקבלת רק את השורות שלה — האכיפה היא בשרת, לא כאן.
async function pullAll() {
  const results = await Promise.all(
    COLLECTIONS.map(async (c) => {
      const { data, error } = await sb.from(TABLE_OF[c]).select('*');
      if (error) {
        console.warn(`pull ${c} failed:`, error.message);
        return [c, null];
      }
      return [c, data.map(rowToRecord)];
    })
  );

  results.forEach(([c, rows]) => {
    if (rows) state[c] = rows;
  });

  // זיהוי המשתמשת המחוברת לפי auth_id
  const session = await getSession();
  if (session) {
    const me = state.users.find((u) => u.authId === session.user.id);
    if (me) state.currentUserId = me.id;
  }

  saveLocal(); // עותק מקומי לשימוש אופליין
  return state;
}

async function syncUp(collection, rec) {
  try {
    const { error } = await sb.from(TABLE_OF[collection]).upsert(recordToRow(rec));
    if (error) {
      // כשל בכתיבה חייב להיות רועש — אחרת מאבדים נתונים בשקט
      console.error(`sync ${collection} failed:`, error.message);
      if (typeof UI !== 'undefined') UI.toast('שמירה לשרת נכשלה — בדקי חיבור');
    }
  } catch (e) {
    console.error('sync failed', e);
  }
}

async function syncDelete(collection, id) {
  try {
    const { error } = await sb.from(TABLE_OF[collection]).delete().eq('id', id);
    if (error) console.error(`delete ${collection} failed:`, error.message);
  } catch (e) {
    console.error('delete failed', e);
  }
}

// ------------------------------------------------------------
//  התחברות
// ------------------------------------------------------------
const Auth = {
  ready: () => SUPABASE_READY,

  async signIn(email, password) {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(authErrorHe(error.message));
    await pullAll();
  },

  // קביעת סיסמה בפעם הראשונה (אחרי לחיצה על קישור הזמנה)
  async setPassword(password) {
    const { error } = await sb.auth.updateUser({ password });
    if (error) throw new Error(authErrorHe(error.message));
    // מנקים את ה-token מה-URL כדי שרענון לא יחזיר למסך הסיסמה
    history.replaceState(null, '', location.pathname + location.search);
    await pullAll();
  },

  async signOut() {
    await sb.auth.signOut();
    localStorage.removeItem(STORE_KEY);
    location.reload();
  },

  async session() {
    return sb ? getSession() : null;
  }
};

function authErrorHe(msg) {
  if (/Invalid login credentials/i.test(msg)) return 'מייל או סיסמה שגויים';
  if (/Email not confirmed/i.test(msg)) return 'המייל טרם אומת';
  if (/network|fetch/i.test(msg)) return 'אין חיבור לאינטרנט';
  return msg;
}
