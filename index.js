const http = require('http');
const { Telegraf, Markup } = require('telegraf');

// Render o'chib qolmasligi uchun HTTP server
http.createServer((req, res) => res.end('Bot ishlamoqda!')).listen(process.env.PORT || 3000);

const bot = new Telegraf(process.env.BOT_TOKEN || '8577543730:AAE1ToMRiPbSKfppI1JDIDeSl6qIbM6O37c');

// Foydalanuvchi holatlarini va arxivni xotirada saqlash
const userStates = {};
const archives = {}; // har bir foydalanuvchi uchun lavhalar bazasi

const mainMenu = Markup.keyboard([
  ['🎙 Zakadr Matni', '⏱ Xronometraj'],
  ['📥 Lavha Saqlash', '📜 Lavhalar Arxivi'],
  ['🎬 Titr Tayyorlash', 'ℹ️ Yordam']
]).resize();

bot.start((ctx) => {
  const userId = ctx.from.id;
  userStates[userId] = null;
  if (!archives[userId]) archives[userId] = [];
  
  ctx.reply(
    `Assalomu alaykum, ${ctx.from.first_name}!\n\nElbekning TV yordamchisi botiga xush kelibsiz! Quyidagi menyudan kerakli bo'limni tanlang:`, 
    mainMenu
  );
});

// Lavha saqlash buyrug'i
bot.hears('📥 Lavha Saqlash', (ctx) => {
  const userId = ctx.from.id;
  userStates[userId] = 'AWAITING_ARCHIVE_ITEM';
  ctx.reply('📥 Saqlamoqchi bo\'lgan lavha matnini yoki lavha nomini yuboring:\n\n(Mavzusi va qisqacha mazmunini yozishingiz mumkin)');
});

// Lavhalar arxivini ko'rish buyrug'i
bot.hears('📜 Lavhalar Arxivi', (ctx) => {
  const userId = ctx.from.id;
  const userArchive = archives[userId] || [];

  if (userArchive.length === 0) {
    return ctx.reply('📜 Sizda hali saqlangan lavhalar yo\'q. "📥 Lavha Saqlash" tugmasi orqali yangi lavha qo\'shishingiz mumkin.');
  }

  let archiveList = '📜 **Sizning Saqlangan Lavhalaringiz:**\n\n';
  userArchive.forEach((item, index) => {
    archiveList += `${index + 1}. **${item.title}**\n📅 *Sana:* ${item.date}\n⏱ *O'qilish vaqti:* ~${item.time}\n------------------\n`;
  });

  ctx.reply(archiveList, { parse_mode: 'Markdown' });
});

bot.hears('🎙 Zakadr Matni', (ctx) => {
  const userId = ctx.from.id;
  userStates[userId] = 'AWAITING_ZAKADR';
  ctx.reply('🎙 Zakadr matnini kiriting (bot so\'zlar soni va o\'qilish vaqtini hisoblab beradi):');
});

bot.hears('⏱ Xronometraj', (ctx) => {
  ctx.reply('Xronometraj hisoblash uchun zakadr matnini yuboring.');
});

bot.hears('🎬 Titr Tayyorlash', (ctx) => {
  ctx.reply('🎬 Titr uchun ism-sharif va lavozimni kiriting (Masalan: *Eshmatov Tashmat - Jurnalist*):', { parse_mode: 'Markdown' });
});

bot.hears('ℹ️ Yordam', (ctx) => {
  ctx.reply('ℹ️ Ushbu bot TV jurnalistlar uchun zakadr matnlari xronometrajini hisoblash va lavhalarni tartibga solib arxivlashda yordam beradi.');
});

// Xabar va matnlarni qabul qilish va qayta ishlash
bot.on('text', (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text;
  const currentState = userStates[userId];

  if (!archives[userId]) archives[userId] = [];

  // Agar foydalanuvchi "Lavha Saqlash" holatida bo'lsa
  if (currentState === 'AWAITING_ARCHIVE_ITEM') {
    const words = text.trim().split(/\s+/).length;
    const seconds = Math.ceil((words / 130) * 60);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const timeString = minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${seconds}s`;

    const now = new Date();
    const dateStr = now.toLocaleDateString('uz-UZ');

    archives[userId].push({
      title: text.length > 50 ? text.substring(0, 50) + '...' : text,
      fullText: text,
      date: dateStr,
      time: timeString
    });

    userStates[userId] = null;
    return ctx.reply('✅ Lavha muvaffaqiyatli arxivga saqlandi! Ularni "📜 Lavhalar Arxivi" bo\'limidan ko\'rishingiz mumkin.', mainMenu);
  }

  // Odatiy zakadr matnini hisoblash
  const words = text.trim().split(/\s+/).length;
  const seconds = Math.ceil((words / 130) * 60);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  let timeString = minutes > 0 ? `${minutes} daqiqa ${remainingSeconds} sekund` : `${seconds} sekund`;

  ctx.reply(`📝 **Zakadr matni tahlili:**\n\n- So'zlar soni: **${words} ta**\n- O'qilish vaqti: **~${timeString}**`, { parse_mode: 'Markdown' });
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
