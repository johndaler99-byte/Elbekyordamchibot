const http = require('http');
const { Telegraf, Markup } = require('telegraf');

// Render serverini uyg'oq tutish uchun HTTP server
http.createServer((req, res) => res.end('Bot ishlamoqda!')).listen(process.env.PORT || 3000);

const bot = new Telegraf(process.env.BOT_TOKEN || '8577543730:AAE1ToMRiPbSKfppI1JDIDeSl6qIbM6O37c');

// Sizning maxfiy kanal ID raqamingiz
const ARCHIVE_CHANNEL_ID = '-1003933435546'; 

const userStates = {};
const userArchives = {};

const mainMenu = Markup.keyboard([
  ['🎙 Zakadr Matni', '⏱ Xronometraj'],
  ['📜 Lavha Qo\'shish', '📁 Mening Arxivim'],
  ['🎬 Titr Tayyorlash', 'ℹ️ Yordam']
]).resize();

bot.start((ctx) => {
  userStates[ctx.from.id] = null;
  ctx.reply(`Assalomu alaykum, ${ctx.from.first_name}!\n\nElbekning TV yordamchisi botiga xush kelibsiz! Menyudan kerakli bo'limni tanlang:`, mainMenu);
});

bot.hears(['📜 Lavha Qo\'shish', '📜 Lavhalar Arxivi'], (ctx) => {
  userStates[ctx.from.id] = { step: 'AWAITING_VIDEO' };
  ctx.reply('📹 Iltimos, efirga ketgan tayyor TV lavha **videofaylini** yuboring:');
});

// Video faylni qabul qilish
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

// Sana va soatni qabul qilib, kanalga va xotiraga saqlash
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text;
  const state = userStates[userId];

  if (state && state.step === 'AWAITING_DATE') {
    try {
      // 1. Videoni maxfiy kanalga saqlash
      await ctx.telegram.sendVideo(ARCHIVE_CHANNEL_ID, state.fileId, {
        caption: `👤 User: ${ctx.from.first_name} (${userId})\n📅 Efir: ${text}`
      });

      // 2. Foydalanuvchi ro'yxatiga qo'shish
      if (!userArchives[userId]) {
        userArchives[userId] = [];
      }
      userArchives[userId].push({
        fileId: state.fileId,
        airTime: text
      });

      userStates[userId] = null;
      return ctx.reply(`🎉 **Muvaffaqiyatli saqlandi!**\n\n📅 Efir vaqti: ${text}\n\nVideolaringizni **"📁 Mening Arxivim"** bo'limidan ko'rishingiz mumkin.`, mainMenu);
    } catch (err) {
      console.error(err);
      return ctx.reply('Videoni saqlashda xatolik bo\'ldi. Bot kanal admini ekanligini va post joylash huquqi borligini tekshiring.');
    }
  }

  // Zakadr matni hisoblash
  const words = text.trim().split(/\s+/).length;
  const seconds = Math.ceil((words / 130) * 60);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  let timeString = minutes > 0 ? `${minutes} daqiqa ${remainingSeconds} sekund` : `${seconds} sekund`;

  ctx.reply(`📝 **Zakadr matni tahlili:**\n\n- So'zlar soni: **${words} ta**\n- O'qilish vaqti: **~${timeString}**`, { parse_mode: 'Markdown' });
});

// Arxivdagi videolarni ko'rish
bot.hears('📁 Mening Arxivim', async (ctx) => {
  const userId = ctx.from.id;
  const list = userArchives[userId] || [];

  if (list.length === 0) {
    return ctx.reply('📁 Sizda hali saqlangan lavha videolari yo\'q.');
  }

  await ctx.reply(`📁 **Sizning arxivda ${list.length} ta lavha bor:**`);
  for (let i = 0; i < list.length; i++) {
    await ctx.replyWithVideo(list[i].fileId, {
      caption: `🎬 **Lavha #${list.length - i}**\n📅 **Efir vaqti:** ${list[i].airTime}`
    });
  }
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
