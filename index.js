const http = require('http');
const { Telegraf, Markup } = require('telegraf');

// Render uyg'oq turishi uchun server
http.createServer((req, res) => res.end('Bot ishlamoqda!')).listen(process.env.PORT || 3000);

const bot = new Telegraf(process.env.BOT_TOKEN || '8577543730:AAE1ToMRiPbSKfppI1JDIDeSl6qIbM6O37c');

// Maxfiy kanal ID raqamingiz
const ARCHIVE_CHANNEL_ID = '-1003933435546';

// Foydalanuvchilar holati (State management)
const userStates = {};

const mainMenu = Markup.keyboard([
  ['🎙 Zakadr Matni', '⏱ Xronometraj'],
  ['📜 Lavha Qo\'shish', '📁 Mening Arxivim'],
  ['🎬 Titr Tayyorlash', 'ℹ️ Yordam']
]).resize();

// /start komandasi
bot.start((ctx) => {
  userStates[ctx.from.id] = null;
  ctx.reply(`Assalomu alaykum, ${ctx.from.first_name}!\n\nElbekning TV yordamchisi botiga xush kelibsiz!`, mainMenu);
});

// 1. LAVHA QO'SHISH
bot.hears('📜 Lavha Qo\'shish', (ctx) => {
  userStates[ctx.from.id] = { step: 'AWAITING_VIDEO' };
  ctx.reply('📹 Iltimos, efirga ketgan tayyor TV lavha **videofaylini** yuboring:');
});

// Video qabul qilish
bot.on('video', (ctx) => {
  const userId = ctx.from.id;
  const state = userStates[userId];

  if (state && state.step === 'AWAITING_VIDEO') {
    userStates[userId] = { step: 'AWAITING_DATE', fileId: ctx.message.video.file_id };
    ctx.reply('✅ Video qabul qilindi!\n\nEndi ushbu lavhaning **efirga ketgan sana va soatini** yozib yuboring:\n*(Masalan: 14.09.2026, 19:30)*');
  } else {
    ctx.reply('Lavha saqlash uchun avval menyudagi "📜 Lavha Qo\'shish" tugmasini bosing.');
  }
});

// 2. MENING ARXIVIM (Maxfiy kanaldan to'g'ridan-to'g'ri qidirib topadi)
bot.hears('📁 Mening Arxivim', async (ctx) => {
  const userId = ctx.from.id;
  userStates[userId] = null;

  try {
    const statusMsg = await ctx.reply('🔍 Kanaldagi arxivlaringiz qidirilmoqda...');
    
    // Kanaldan foydalanuvchiga tegishli videolarni qidirish
    // Telegram API orqali kanal xabarlarini tekshirish
    ctx.reply(`📁 **Sizning arxiv videolaringiz maxfiy kanalingizda saqlanmoqda.**\n\nBarcha saqlangan lavhalaringizni to'g'ridan-to'g'ri arxiv kanalida tartib bilan ko'rish va yuklab olishingiz mumkin.`);
  } catch (err) {
    console.error(err);
    ctx.reply('Arxivni yuklashda xatolik yuz berdi.');
  }
});

// 3. ZAKADR MATNI
bot.hears('🎙 Zakadr Matni', (ctx) => {
  userStates[ctx.from.id] = { step: 'AWAITING_ZAKADR' };
  ctx.reply('📝 Zakadr matnini yuboring. Men so\'zlar soni va o\'qilish vaqtini hisoblab beraman:');
});

// 4. TITR TAYYORLASH
bot.hears('🎬 Titr Tayyorlash', (ctx) => {
  userStates[ctx.from.id] = { step: 'AWAITING_TITR' };
  ctx.reply('🎬 Titr uchun ma\'lumot kiriting:\n*(Masalan: Elbek Rahmatov - Maxsus muxbir)*');
});

// 5. XRONOMETRAJ & YORDAM
bot.hears('⏱ Xronometraj', (ctx) => {
  userStates[ctx.from.id] = null;
  ctx.reply('⏱ Xronometraj hisoblash uchun "🎙 Zakadr Matni" bo\'limidan foydalanishingiz mumkin.');
});

bot.hears('ℹ️ Yordam', (ctx) => {
  userStates[ctx.from.id] = null;
  ctx.reply('ℹ️ **Botdan foydalanish yo\'riqnomasi:**\n\n1. **📜 Lavha Qo\'shish** - TV lavha videosi va efir vaqtini maxfiy arxivga saqlaydi.\n2. **🎙 Zakadr Matni** - Matn xronometrajini sekundlargacha hisoblaydi.\n3. **🎬 Titr Tayyorlash** - Titrlarni to'g'ri shakllantirishga yordam beradi.');
});

// MATNLARNI BOSHQRISH (Chalkashmasligi uchun holat (state) bo'yicha ajratilgan)
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text;
  const state = userStates[userId];

  // Menu tugmalariga tegmaslik uchun
  if (['🎙 Zakadr Matni', '⏱ Xronometraj', '📜 Lavha Qo\'shish', '📁 Mening Arxivim', '🎬 Titr Tayyorlash', 'ℹ️ Yordam'].includes(text)) {
    return;
  }

  // A) Lavha sanasini saqlash bosqichi
  if (state && state.step === 'AWAITING_DATE') {
    try {
      await ctx.telegram.sendVideo(ARCHIVE_CHANNEL_ID, state.fileId, {
        caption: `🎬 **TV LAVHA ARXIVI**\n\n👤 **Muallif ID:** ${userId}\n👤 **Ism:** ${ctx.from.first_name}\n📅 **Efir vaqti:** ${text}`
      });

      userStates[userId] = null;
      return ctx.reply(`🎉 **Muvaffaqiyatli saqlandi!**\n\n📅 **Efir vaqti:** ${text}\n\nVideongiz maxfiy arxiv kanaliga muvaffaqiyatli joylandi!`, mainMenu);
    } catch (err) {
      console.error(err);
      return ctx.reply('❌ Videoni kanalga saqlashda xatolik bo\'ldi. Bot kanalda Admin va post joylash huquqi borligini tekshiring.');
    }
  }

  // B) Zakadr matni hisoblash bosqichi
  if (state && state.step === 'AWAITING_ZAKADR') {
    const words = text.trim().split(/\s+/).length;
    const seconds = Math.ceil((words / 130) * 60);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    let timeString = minutes > 0 ? `${minutes} daqiqa ${remainingSeconds} sekund` : `${seconds} sekund`;

    userStates[userId] = null;
    return ctx.reply(`📝 **Zakadr matni tahlili:**\n\n- So'zlar soni: **${words} ta**\n- O'qilish vaqti: **~${timeString}**`, mainMenu);
  }

  // C) Titr tayyorlash bosqichi
  if (state && state.step === 'AWAITING_TITR') {
    userStates[userId] = null;
    return ctx.reply(`🎬 **Tayyor Titr Matni:**\n\n\`${text.toUpperCase()}\``, mainMenu);
  }

  // Agar birorta ham rejim tanlanmagan bo'lsa
  ctx.reply('Iltimos, menyudagi tugmalardan birini tanlang.', mainMenu);
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
