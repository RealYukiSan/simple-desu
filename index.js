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

client.command('stele', async (ctx) => {
    const args = ctx.text.split(" ");
    try {
        const files = await fetch(`https://api.telegram.org/bot${process.env.TELE_TOKEN}/getStickerSet?name=${args[1]}`).then(res => res.json());
        if (files.ok) {
            files.result.stickers.forEach(async (file) => {
                const st = await fetch(`https://api.telegram.org/bot${process.env.TELE_TOKEN}/getFile?file_id=${file.file_id}`).then(res => res.json()).catch(console.log);
                const sticker = await fetch(`https://api.telegram.org/file/bot${process.env.TELE_TOKEN}/${st.result.file_path}`).catch(console.log);
                await ctx.replyWithSticker(sticker).catch(console.log);
            })
        }
    } catch (error) {
        console.log(error);
    }
})

client.launch();
