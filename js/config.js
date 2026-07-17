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

  // כמה ימי ארוחות בוקר נפתחים אוטומטית ליולדת חדשה
  MEAL_DAYS: 5,

  // כמה ימים אחרי סיום הארוחות מציעים ערכת שבת
  SHABBAT_KIT_OFFSET_DAYS: 7,

  // כמה ימים לפני יום ההולדת מזכירים על מתנת גיל שנה
  YEAR_GIFT_REMINDER_DAYS: 7
};

const NEIGHBORHOODS = [
  { id: 'neve', name: 'נווה אביבים', color: 'var(--nbhd-neve)' },
  { id: 'gush', name: 'הגוש הגדול', color: 'var(--nbhd-gush)' },
  { id: 'yeruka', name: 'רמת אביב הירוקה', color: 'var(--nbhd-yeruka)' },
  { id: 'gimel', name: "רמת אביב ג'", color: 'var(--nbhd-gimel)' }
];

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

const SUPABASE_READY = Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);
