// ============================================================
//  הגדרות מערכת
// ============================================================
//
//  כדי לעבור למצב "כל המשתמשות רואות את אותם נתונים":
//  1. פותחים פרויקט חינמי ב-https://supabase.com
//  2. מריצים את הקובץ supabase/schema.sql ב-SQL Editor שם
//  3. מעתיקים מ-Settings > API את ה-URL ואת ה-anon key לכאן למטה
//  4. מעלים את השינוי ל-GitHub - וזהו, כולן מסונכרנות
//
//  כל עוד השדות ריקים - המערכת עובדת מקומית על המכשיר בלבד
//  (מצב הדגמה, נוח לבדיקות, הנתונים לא עוברים בין מכשירים).
// ============================================================

const CONFIG = {
  // המפתח הזה מיועד להיות גלוי בדפדפן. ההגנה היא ה-RLS במסד,
  // לא הסתרת המפתח. לעולם אין לשים כאן מפתח מסוג secret/service_role.
  SUPABASE_URL: 'https://toznuyzygngoqcoiitdk.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_9FvkD0kiDCC2A3-Q-uKezw_mbkzrRxj',

  ORG_NAME: 'שפרה ופועה',

  // מספר וואטסאפ לשליחת רשימות קניות (שבי)
  SHOPPING_PHONE: '+972585643770',

  // כמה ימי ארוחות בוקר נפתחים אוטומטית ליולדת חדשה
  MEAL_DAYS: 5,

  // כמה ימים אחרי סיום הארוחות מציעים ערכת שבת
  SHABBAT_KIT_OFFSET_DAYS: 7,

  // כמה ימים לפני יום ההולדת מזכירים על מתנת גיל שנה
  YEAR_GIFT_REMINDER_DAYS: 7
};

// 8 שכונות, כל אחת בצבע מובחן. היולדת נצבעת אוטומטית לפי השכונה.
const NEIGHBORHOODS = [
  { id: 'chen', name: 'אזורי חן', color: '#10B981' },        // ירוק
  { id: 'kochav', name: 'כוכב הצפון', color: '#3B82F6' },     // כחול
  { id: 'neve', name: 'נווה אביבים', color: '#F59E0B' },      // כתום
  { id: 'chadasha', name: 'רמת אביב החדשה', color: '#A855F7' }, // סגול
  { id: 'afeka', name: 'אפקה', color: '#EC4899' },            // ורוד
  { id: 'lamed', name: 'למד', color: '#14B8A6' },             // טורקיז
  { id: 'gimel', name: "רמת אביב ג'", color: '#EAB308' },      // צהוב
  { id: 'yeruka', name: 'רמת אביב הירוקה', color: '#EF4444' }  // אדום
];

// זיהוי שכונה מטקסט חופשי (הודעת וואטסאפ / כתובת) — כולל כתיבים חלופיים
function detectNeighborhood(text) {
  if (!text) return '';
  const t = String(text);
  const aliases = [
    ['chen', ['אזורי חן', 'אזור חן', 'אזורי-חן']],
    ['kochav', ['כוכב הצפון', 'כוכב צפון']],
    ['neve', ['נווה אביבים', 'נוה אביבים', 'נווה-אביבים']],
    ['chadasha', ['רמת אביב החדשה', 'רמ"א החדשה', 'רמת-אביב החדשה']],
    ['afeka', ['אפקה']],
    ['lamed', ['למד', "רמת אביב ל'", 'רמת אביב למד']],
    ['gimel', ["רמת אביב ג", 'רמת אביב ג׳', "רמ\"א ג", 'רמת-אביב ג']],
    ['yeruka', ['רמת אביב הירוקה', 'הירוקה', 'רמ"א הירוקה']]
  ];
  for (const [id, names] of aliases) {
    if (names.some((n) => t.includes(n))) return id;
  }
  return '';
}

const ROLES = {
  admin: 'מנהלת ראשית',
  manager: 'מנהלת משנית',
  volunteer: 'מתנדבת'
};

const VOLUNTEER_TYPES = {
  cook: 'מכינת אוכל',
  driver: 'משנעת',
  both: 'מכינה ומשנעת',
  other: 'אחר'
};

// מסכים שאפשר להעניק/לחסום למשתמשת (הרשאות מותאמות אישית)
const PERM_SCREENS = [
  { id: 'mothers', label: 'יולדות' },
  { id: 'meals', label: 'ארוחות ושינוע' },
  { id: 'kits', label: 'ערכות שבת' },
  { id: 'gifts', label: 'מתנות' },
  { id: 'torah', label: 'אותיות בספר תורה' },
  { id: 'events', label: 'בוקר ליולדות' },
  { id: 'calendar', label: 'לוח שנה' },
  { id: 'neighborhoods', label: 'שכונות' },
  { id: 'contacts', label: 'אנשי קשר' },
  { id: 'inventory', label: 'מלאי' },
  { id: 'volunteers', label: 'מתנדבות' },
  { id: 'images', label: 'תמונות' },
  { id: 'messages', label: 'הודעות' },
  { id: 'reports', label: 'דוחות' }
];

// פרטים קבועים לייצוא אותיות בספר תורה (כתובת המשלוח + פרטי קשר)
const TORAH_EXPORT = {
  shipName: 'יהודה ליפש',
  street: 'יחיאל דרונר',
  house: '6',
  apartment: '2',
  city: 'תל אביב',
  region: 'ישראל',
  country: 'ישראל',
  zip: '6949758',
  email: 'yul770@gmail.com',
  phone: '0528456770'
};

const SUPABASE_READY = Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);
