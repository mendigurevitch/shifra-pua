// ============================================================
//  תבניות הודעות וואטסאפ
//  ------------------------------------------------------------
//  המנהלת בוחרת נמען ולוחצת שליחה — הפרטים האישיים
//  מתמלאים אוטומטית מתוך הנתונים.
// ============================================================

const TEMPLATES = {
  newMotherDetails: {
    title: 'בקשת פרטים מיולדת חדשה',
    icon: 'baby',
    body: (v) => `שלום${v.motherName ? ' ' + v.motherName : ''}! 🌸
כאן ארגון "${CONFIG.ORG_NAME}" מרמת אביב.
שמענו בשמחה שילדת — מזל טוב!
אנחנו מביאות ארוחת בוקר חמה עד הבית ${CONFIG.MEAL_DAYS} ימים בשבוע, ללא תשלום.
נשמח אם תשלחי לנו:
• שם מלא
• כתובת מדויקת (כולל קומה וקוד כניסה לבניין)
• תאריך הלידה
• שם התינוק/ת

באהבה, צוות ${CONFIG.ORG_NAME} 💗`
  },

  mealTomorrow: {
    title: 'תזכורת שיבוץ ארוחה למחר',
    icon: 'utensils',
    body: (v) => `היי ${v.volunteerName}! 🌷
תזכורת קטנה — מחר (${v.dateFull}) את משובצת ל${v.roleLabel} עבור ${v.motherName}.
${v.deliveryTime ? `שעת האספקה: ${v.deliveryTime}` : ''}
תודה ענקית על הנתינה שלך 💗`
  },

  driverAddress: {
    title: 'כתובת מדויקת למשנעת',
    icon: 'truck',
    body: (v) => `היי ${v.volunteerName}! 🚗
פרטי המשלוח להיום עבור ${v.motherName}:

📍 כתובת: ${v.address}
${v.entryCode ? `🔑 קוד כניסה: ${v.entryCode}` : ''}
${v.phone ? `📞 טלפון: ${v.phone}` : ''}
${v.deliveryTime ? `🕐 שעה: ${v.deliveryTime}` : ''}
${v.notes ? `📝 ${v.notes}` : ''}

תודה רבה! 💗`
  },

  shabbatKitOffer: {
    title: 'הצעת ערכת סעודת שבת',
    icon: 'gift',
    body: (v) => `שלום ${v.motherName}! 🕯️
מקווות שנהניתם מארוחות הבוקר.
לסיום המסלול אנחנו שמחות להעניק לך **ערכת סעודת שבת** במתנה.
האם תרצי לקבל אותה לשבת הקרובה?
פשוט השיבי כן/לא 🙂

שבת שלום, צוות ${CONFIG.ORG_NAME} 💗`
  },

  yearGiftReady: {
    title: 'מתנת גיל שנה מחכה',
    icon: 'cake',
    body: (v) => `שלום ${v.motherName}! 🎂
לא להאמין — ${v.childName} חוגג/ת שנה!
מזל טוב מכל הלב מצוות ${CONFIG.ORG_NAME}.

מחכה לכם מתנה קטנה 🎁
📍 אפשר לאסוף אצל ${v.contactName}
בכתובת: ${v.contactAddress}${v.contactNbhd ? ` (${v.contactNbhd})` : ''}
${v.contactPhone ? `📞 ${v.contactPhone} — כדאי לתאם מראש` : ''}

שנה של נחת ובריאות! 💗`
  },

  eventInvite: {
    title: 'הזמנה לבוקר ליולדות',
    icon: 'coffee',
    body: (v) => `שלום ${v.motherName}! ☕
מוזמנת בשמחה ל**בוקר ליולדות** שלנו:

📅 ${v.dateFull}
📍 ${v.location}
${v.speakers ? `🎤 בהנחיית: ${v.speakers}` : ''}

בוקר של פינוק, כיבוד ותוכן מעשיר — בשבילך.
נשמח לאישור הגעה 🙂

צוות ${CONFIG.ORG_NAME} 💗`
  },

  eventReminder: {
    title: 'תזכורת — בוקר ליולדות מחר',
    icon: 'bell',
    body: (v) => `היי ${v.motherName}! ☕
רק תזכורת שמחר נפגשות ב**בוקר ליולדות**:
📅 ${v.dateFull}
📍 ${v.location}

מחכות לך! 💗`
  },

  cookAvailability: {
    title: 'בקשת זמינות שבועית למכינות',
    icon: 'message',
    // הודעת "סקר" מוכנה — אפשר להעתיק את השאלה והאפשרויות ליצירת Poll בוואטסאפ
    body: () => `בוקר טוב מתנדבות יקרות! 🌸
מתחילות לשבץ את השבוע הקרוב.
*באיזה ימים את פנויה להכין ארוחת בוקר?*

🔹 יום ראשון
🔹 יום שני
🔹 יום שלישי
🔹 יום רביעי
🔹 יום חמישי

תשובה כאן בצ'אט, או הפכו זו לסקר (Poll) בוואטסאפ.
תודה על הלב הענק שלכן 💗`
  }
};

// ---------- בניית ההודעה עם הנתונים האישיים ----------
function buildMessage(key, vars) {
  const t = TEMPLATES[key];
  if (!t) return '';
  return t.body(vars || '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ניקוי מספר לפורמט בינלאומי לקישור wa.me
function waNumber(phone) {
  if (!phone) return '';
  let p = String(phone).replace(/\D/g, '');
  if (p.startsWith('972')) return p;
  if (p.startsWith('0')) return '972' + p.slice(1);
  return p;
}

// פותח וואטסאפ עם הנמען וההודעה מוכנים — המשתמשת לוחצת "שלח" בעצמה
function sendWhatsApp(phone, text) {
  const num = waNumber(phone);
  const url = num
    ? `https://wa.me/${num}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

// תצוגה מקדימה של ההודעה לפני שליחה
function previewMessage(title, text, phone) {
  UI.modal(title, `
    <div style="background:var(--bg);border-radius:var(--radius-sm);padding:14px;margin-bottom:16px;
                font-size:13.5px;line-height:1.7;white-space:pre-wrap;font-weight:500;
                max-height:44vh;overflow-y:auto">${e(text)}</div>
    <div class="btn-row">
      <button class="btn btn-ghost" id="m-copy">העתקה</button>
      <button class="btn btn-wa" id="m-send">${icon('whatsapp')} פתיחה בוואטסאפ</button>
    </div>
  `, (c) => {
    c.querySelector('#m-copy').onclick = () => {
      navigator.clipboard.writeText(text);
      UI.toast('ההודעה הועתקה');
    };
    c.querySelector('#m-send').onclick = () => {
      sendWhatsApp(phone, text);
      UI.closeModal();
    };
  });
}
