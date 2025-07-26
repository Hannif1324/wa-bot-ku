const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());
app.use((req, res, next) => {
    if (req.headers['content-type'] !== 'application/json') {
        return res.status(415).json({ status: 'unsupported_media_type', message: 'Gunakan Content-Type application/json' });
    }
    next();
});

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox'],
        executablePath: '/usr/bin/google-chrome'
    }
});

const allowedNumbers = ['6285736924811@c.us']; // optional
const AUTH_TOKEN = 'rahasia123'; // amanin ini via ENV var

// ✅ Endpoint dari n8n
app.post('/send-message', async (req, res) => {
    const { number, message, imageUrl, caption, token } = req.body;

    // 🔐 Validasi Token
    if (token !== AUTH_TOKEN) {
        return res.status(401).json({ status: 'unauthorized', message: 'Token tidak valid' });
    }

    if (!number || (!message && !imageUrl)) {
        return res.status(400).json({ status: 'bad_request', message: 'number & (message atau imageUrl) wajib diisi' });
    }

    const cleanNumber = number.replace(/\D/g, '');
    const chatId = cleanNumber + '@c.us';

    try {
        // 🔁 Kirim gambar jika tersedia
        if (imageUrl) {
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const media = new MessageMedia('image/jpeg', Buffer.from(response.data).toString('base64'), 'image.jpg');
            await client.sendMessage(chatId, media, { caption: caption || '' });
            console.log(`[✔] Gambar dikirim ke ${chatId}`);
        }

        // 🔁 Kirim teks jika tersedia
        if (message) {
            await client.sendMessage(chatId, message);
            console.log(`[✔] Pesan teks dikirim ke ${chatId}`);
        }

        return res.status(200).json({ status: 'success', to: chatId, message, imageUrl, caption });
    } catch (error) {
        console.error(`[✖] Gagal kirim ke ${chatId}:`, error);
        return res.status(500).json({ status: 'error', message: error.toString() });
    }
});

// 🚀 Listen server
app.listen(3001, () => {
    console.log('✅ API bot WA berjalan di http://localhost:3001');
});

// 🔄 QR Code event
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('📲 Silakan scan QR Code di WhatsApp Anda');
});

// ✅ Bot ready event
client.on('ready', async () => {
    console.log('🤖 Bot sudah siap!');
    try {
        const selfChat = await client.getChatById('6282139695033@c.us');
        if (selfChat) {
            await client.sendMessage(selfChat.id._serialized, 'Bot aktif dan siap menerima perintah.');
        }
    } catch (err) {
        console.log('❗ Gagal kirim pesan ke diri sendiri:', err.message);
    }
});

// 📥 Incoming message event
client.on('message', async (msg) => {
    if (msg.fromMe) return;
    console.log(`📩 Pesan dari ${msg.from}: ${msg.body}`);

    if (msg.from === '6282139695033@c.us') {
        await client.sendMessage(msg.from, `🗨️ Pesan Anda: ${msg.body}`);
    }

    if (allowedNumbers.includes(msg.from)) {
        if (msg.body === '!ping') {
            msg.reply('pong');
        } else if (msg.body.startsWith('!hello')) {
            msg.reply('Halo! Apa kabar?');
        }
    }
});

// 🔌 Bot disconnect event
client.on('disconnected', (reason) => {
    console.log('⚠️ Bot terputus:', reason);
});

client.initialize();
