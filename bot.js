const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const admin = require("firebase-admin");

// Подключение сервисного аккаунта
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const TOKEN = process.env.BOT_TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/start (.+)/, async (msg, match) => {
    const chatId = msg.chat.id.toString(); // ID нового пользователя
    const referrerId = match[1]; // ID пригласившего

    if (referrerId !== chatId) {
        try {
            const referrerRef = db.collection("players").doc(referrerId);
            const userRef = db.collection("players").doc(chatId);

            const referrerSnap = await referrerRef.get();
            const userSnap = await userRef.get();

            let userData = userSnap.exists ? userSnap.data() : {};
            let referrerData = referrerSnap.exists ? referrerSnap.data() : {};

            if (!userData.referredBy) {
                await userRef.set({
                    coins: (userData.coins || 0) + 50000,
                    referredBy: referrerId
                }, { merge: true });

                let invitedUsers = referrerData.invitedUsers || [];
                if (!invitedUsers.includes(chatId)) {
                    invitedUsers.push(chatId);
                    await referrerRef.set({
                        coins: (referrerData.coins || 0) + 100000,
                        invitedUsers: invitedUsers
                    }, { merge: true });
                }

                bot.sendMessage(chatId, `🎉 Вы получили 50.000 монет по реферальной ссылке.`);
                bot.sendMessage(referrerId, `🎉 Ваш друг принял приглашение! Вы получаете 100.000 монет.`);
            } else {
                bot.sendMessage(chatId, "Вы уже использовали реферальную ссылку.");
            }
        } catch (error) {
            console.error("Ошибка при обработке реферала:", error);
            bot.sendMessage(chatId, "Произошла ошибка при обработке реферала.");
        }
    } else {
        bot.sendMessage(chatId, "Вы не можете использовать свою же ссылку 😅");
    }
});


bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    if (msg.text === "/start") {
        bot.sendMessage(chatId, "Привет! Используйте реферальную ссылку, чтобы пригласить друзей.");
    }
});

console.log("Бот запущен!");
