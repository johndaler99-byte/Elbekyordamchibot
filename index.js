const http = require('http');
const { Telegraf, Markup } = require('telegraf');
const mongoose = require('mongoose');

// Render o'chib qolmasligi uchun HTTP server
http.createServer((req, res) => res.end('Bot ishlamoqda!')).listen(process.env.PORT || 3000);

// MongoDB bazasiga ulanish
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://johndaler99_db_user:ciymlPrQl9NQ3vYm@cluster0.gntfzmn.mongodb.net/tv_archive?retryWrites=true&w=majority';
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB bazasiga muvaffaqiyatli ulandi!'))
  .catch(err => console.error('Baza ulanishida xatolik:', err));

// Baza sxemasi (Model)
const VideoSchema = new mongoose.Schema({
  userId: Number,
  fileId: String,
  airTime: String,
  createdAt: { type: Date, default: Date.now }
});
const ArchiveVideo = mongoose.model('ArchiveVideo', VideoSchema);

const bot = new Telegraf(process.env.BOT_TOKEN || '8577543730:AAE1ToMRiPbSKfppI1JDIDeSl6qIbM6O37c');
const userStates = {};

const mainMenu = Markup.keyboard([
  ['🎙 Zakadr Matni', '⏱ Xronometraj'],
  ['📜 Lavha Qo\'shish', '📁 Mening Arxivim'],
  ['🎬 Titr Tayyorlash', 'ℹ️ Yordam']
]).resize();

bot.start((ctx) => {
  const userId = ctx.from.id;
  userStates[userId] = null;
  ctx.reply(`Assalomu alaykum, ${ctx.from.first_name}!\n\nElbekning TV yordamchisi botiga xush kelibsiz! Menyudan kerakli bo'limni tanlang:`, mainMenu);
});

// Lavha qo'shish jarayoni
bot.hears(['📜 Lavha Qo\'shish', '📜 Lavhalar Arxivi'], (ctx) => {
  const userId = ctx.from.id;
  userStates[userId] = { step: 'AWAITING_VIDEO' };
  ctx.reply('📹 Iltimos, efirga ketgan tayyor TV lavha **videofaylini** yuboring:');
});

// Arxivdagi videolarni bazadan ko'rish
bot.hears('📁 Mening Arxivim', async (ctx) => {
  const userId = ctx.from.id;
  
  try {
    const userVideos = await ArchiveVideo.find({ userId: userId }).sort({ createdAt: -1 });

    if (userVideos.length === 0) {
      return ctx.reply('📁 Sizda hali saqlangan lavha videolari yo\'q.');
    }

    await ctx.reply(`📁 **Sizning bazangizda ${userVideos.length} ta lavha saqlangan:**\n\nVideolar yuklanmoqda...`, { parse_mode: 'Markdown' });

    for (let i = 0; i < userVideos.length; i++) {
      const item = userVideos[i];
      await ctx.replyWithVideo(item.fileId, {
        caption: `🎬 **Lavha #${userVideos.length - i}**\n📅 **Efir vaqti:** ${item.airTime}`
      });
    }
  } catch (error) {
    ctx.reply('Bazadan ma\'lumot olishda xatolik yuz berdi.');
  }
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

// Matnli ma'lumot va sana qabul qilish
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text;
  const state = userStates[userId];

  if (state && state.step === 'AWAITING_DATE') {
    try {
      await ArchiveVideo.create({
        userId: userId,
        fileId: state.fileId,
        airTime: text
      });

      userStates[userId] = null;
      return ctx.reply(`🎉 **Muvaffaqiyatli bazaga saqlandi!**\n\n📅 Efir vaqti: ${text}\n\nVideolaringiz endi abadiy saqlanadi. Ularni **"📁 Mening Arxivim"** bo'limidan ko'rishingiz mumkin.`, mainMenu);
    } catch (err) {
      return ctx.reply('Bazaga saqlashda xatolik bo\'ldi.');
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

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
