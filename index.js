const path = require("node:path")
const { Client, SessionManager } = require('gampang');
require("dotenv").config()

const session = new SessionManager(
    path.resolve(__dirname, 'sessions'),
    'folder',
);

const client = new Client(session,
  {
    'qr': {
        'store': 'web',
        'options': {
        'port': 3000,
        },
    },
    'prefixes' : ['.'],
    disableCooldown: true
  },
);

client.on('ready', () => {
    console.log(client.raw?.user, 'ready');
});

client.command('test', (ctx) => ctx.reply('pong'), {
        aliases: ['ping', 'pong'],
        cooldown: 1_000,
    }
);

client.command('toimg', async (ctx) => {
    const reply = ctx.getReply()
    if (reply?.sticker) {
        ctx.replyWithPhoto(await reply.sticker.retrieveFile("sticker"))
    }
});

client.command('tostkr', async (ctx) => {
    const reply = ctx.getReply()
    if (reply?.image) {
        ctx.replyWithSticker(await reply.image.retrieveFile("image"))
    }
});

client.command('menu', (ctx) => {
    const commands = ['tostkr <reply gambar>', 'toimg <reply sticker>', 'ping', 'stele bokepanak1'].map(cmd => ctx.getPrefix()+cmd)
    const text = `Current available commands:\n${commands.join('\n')}`
    ctx.reply(text);
}, { aliases: ['help']})

client.command('stele', async (ctx) => {
    const args = ctx.text.split(" ");
    try {
        if (args[1].startsWith("https://t.me/addstickers/")) args[1] = args[1].slice(25)
        const files = await fetch(`https://api.telegram.org/bot${process.env.TELE_TOKEN}/getStickerSet?name=${args[1]}`).then(res => res.json());
        if (files.ok) {
            await ctx.reply("CPM kak.")
            ctx.raw.key.remoteJid = ctx.raw.key.participant
            files.result.stickers.forEach(async (file) => {
                const st = await fetch(`https://api.telegram.org/bot${process.env.TELE_TOKEN}/getFile?file_id=${file.file_id}`).then(res => res.json()).catch(console.log);
                const sticker = await fetch(`https://api.telegram.org/file/bot${process.env.TELE_TOKEN}/${st.result.file_path}`).catch(console.log);
                await ctx.replyWithSticker(sticker).catch(console.log);
            })
        } else ctx.reply("invalid sticker name or url")
    } catch (error) {
        console.log(error);
    }
})

client.command('tagall', (ctx) => {
    ctx.client.raw?.sendMessage(ctx.raw.key.remoteJid, { text: "coming soon" }, { quoted: ctx.raw })
})

client.launch();
