const http = require('http');
http.createServer((req, res) => res.end('Bot ishlamoqda!')).listen(process.env.PORT || 3000);
const { Telegraf, Markup } = require('telegraf');

// Bot tokenini kiriting
const bot = new Telegraf(process.env.BOT_TOKEN || '8577543730:AAE1ToMRiPbSKfppI1JDIDeSl6qIbM6O37c');

// Foydalanuvchi holatlarini saqlash uchun
const userStates = {};

// Asosiy menyu tugmalari
const mainMenu = Markup.keyboard([
  ['📝 Zakadr Matni', '⏱ Xronometraj'],
  ['📁 Lavhalar Arxivi', '🔍 Qidirish'],
  ['🖥 Titr Tayyorlash', 'ℹ️ Yordam']
]).resize();

// Bosh menyu buyrug'i
bot.start((ctx) => {
  const userId = ctx.from.id;
  userStates[userId] = null;
  return ctx.reply("Elbekning yordamchisiga xush kelibsiz! Kerakli bo'limni tanlang:", mainMenu);
});

// 📝 Zakadr Matni
bot.hears('📝 Zakadr Matni', (ctx) => {
  const userId = ctx.from.id;
  userStates[userId] = 'awaiting_script';
  return ctx.reply("Zakadr matnini yuboring. Men o'qilish vaqtini hisoblab beraman:");
});

// ⏱ Xronometraj
bot.hears('⏱ Xronometraj', (ctx) => {
  const userId = ctx.from.id;
  userStates[userId] = 'awaiting_chrono';
  return ctx.reply("Xronometrajini hisoblash uchun matnni yuboring:");
});

// 📁 Lavhalar Arxivi
bot.hears('📁 Lavhalar Arxivi', (ctx) => {
  return ctx.reply("📁 Lavhalar arxivi bo'limi. Hozircha saqlangan lavhalar yo'q.");
});

// 🔍 Qidirish
bot.hears('🔍 Qidirish', (ctx) => {
  return ctx.reply("Qidirmoqchi bo'lgan kalit so'zingizni yuboring:");
});

// 🖥 Titr Tayyorlash
bot.hears('🖥 Titr Tayyorlash', (ctx) => {
  const userId = ctx.from.id;
  userStates[userId] = 'awaiting_titr';
  return ctx.reply("Titr uchun ma'lumotni ushbu formatda yuboring:\n\nIsm Familiya - Lavozim\n(Masalan: Elbek Aliyev - Telejurnalist)");
});

// ℹ️ Yordam
bot.hears('ℹ️ Yordam', (ctx) => {
  return ctx.reply("Ushbu bot TV jurnalistlar uchun zakadr matnlari xronometrajini hisoblash, titrlar tayyorlash va lavhalarni tartiblash uchun mo'ljallangan.");
});

// Xabarlarni qayta ishlash mantiqiy qismi
bot.on('text', (ctx) => {
  const userId = ctx.from.id;
  const state = userStates[userId];
  const text = ctx.message.text;

  if (state === 'awaiting_script' || state === 'awaiting_chrono') {
    const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    const totalSeconds = Math.round(words / 2.3);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    let timeString = '';
    if (minutes > 0) {
      timeString = `${minutes} daqiqa ${seconds} soniya`;
    } else {
      timeString = `${seconds} soniya`;
    }

    userStates[userId] = null;

    if (state === 'awaiting_script') {
      return ctx.reply(
        `📝 ZAKADR MATNI TAYYOR:\n\n` +
        `${text}\n\n` +
        `-------------------\n` +
        `📊 So'zlar soni: ${words} ta\n` +
        `⏱ Taxminiy o'qilish vaqti: ${timeString}`
      );
    } else {
      return ctx.reply(
        `⏱ XRONOMETRAJ NATIJASI:\n\n` +
        `📊 Jami so'zlar: ${words} ta\n` +
        `⏱ Efir vaqti: ${timeString}`
      );
    }
  }

  if (state === 'awaiting_titr') {
    userStates[userId] = null;
    return ctx.reply(
      `🖥 TITR TAYYOR:\n\n` +
      `-------------------\n` +
      `${text.toUpperCase()}\n` +
      `-------------------`
    );
  }

  return ctx.reply("Tushunmadim. Iltimos, menyudagi bo'limlardan birini tanlang.", mainMenu);
});

// Xatolar botni to'xtatib qo'ymasligi uchun
bot.catch((err, ctx) => {
  console.log(`Xatolik yuz berdi (${ctx.updateType}):`, err);
});

// Botni ishga tushirish
bot.launch().then(() => {
  console.log('Bot muvaffaqiyatli ishga tushdi!');
});

// Serverni to'xtatganda botni xavfsiz o'chirish
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
