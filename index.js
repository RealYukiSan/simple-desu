const path = require("node:path")
const { Client, SessionManager } = require('gampang');

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
  
client.command('stele', async (ctx) => {
    const args = ctx.text.split(" ");
    try {
        const files = await fetch(`https://api.telegram.org/bot6256334764:AAFvw3YGLYVJSYho3Gu-VZH_jAyhddXyLpk/getStickerSet?name=${args[1]}`).then(res => res.json());
        if (files.ok) {
            files.result.stickers.forEach(async (file) => {
                const st = await fetch(`https://api.telegram.org/bot6256334764:AAFvw3YGLYVJSYho3Gu-VZH_jAyhddXyLpk/getFile?file_id=${file.file_id}`).then(res => res.json()).catch(console.log);
                const sticker = await fetch(`https://api.telegram.org/file/bot6256334764:AAFvw3YGLYVJSYho3Gu-VZH_jAyhddXyLpk/${st.result.file_path}`).catch(console.log);
                await ctx.replyWithSticker(sticker).catch(console.log);
            })
        }
    } catch (error) {
        console.log(error);
    }
})

client.launch();