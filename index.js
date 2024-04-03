const path = require("node:path");
const { spawn } = require("node:child_process");
const { get } = require("node:https");
const { Client, SessionManager } = require("gampang");
const { writeFileSync, readFileSync, unlinkSync } = require("node:fs");
require("dotenv").config();

const session = new SessionManager(
	path.resolve(__dirname, "sessions"),
	"folder"
);

const client = new Client(session, {
	qr: {
		store: "file",
		options: {
			dest: "qr.png",
		},
	},
	logger: {
		level: "trace",
	},
	prefixes: ["."],
	disableCooldown: true,
});

client.on("ready", () => {
	console.log(client.raw?.user, "ready");
});

client.command("test", (ctx) => ctx.reply("pong"), {
	aliases: ["ping", "pong"],
	cooldown: 1_000,
});

client.command("toimg", async (ctx) => {
	const reply = ctx.getReply();
	if (reply?.sticker) {
		const sticker = await reply.sticker.retrieveFile("sticker");
		if (reply.sticker.animated) {
			const tmpInput = "tmpInput.webp";
			const tmpOutput = "tmpOutput.mp4";
			writeFileSync(tmpInput, sticker);
			const process = spawn("magick", [
				"convert",
				"-format",
				"mp4",
				tmpInput,
				tmpOutput,
			]);
			process.on("exit", () => {
				const buff = readFileSync(tmpOutput);
				ctx.replyWithVideo(buff);
				unlinkSync(tmpInput);
				unlinkSync(tmpOutput);
			});
		} else {
			ctx.replyWithPhoto(sticker);
		}
	}
});

client.command("tostkr", async (ctx) => {
	const reply = ctx.getReply();
	if (reply?.image) {
		ctx.replyWithSticker(await reply.image.retrieveFile("image"));
	}
});

client.command(
	"menu",
	(ctx) => {
		const commands = [
			"tostkr <reply gambar>",
			"toimg <reply sticker>",
			"ping",
			"stele bokepanak1",
		].map((cmd) => ctx.getPrefix() + cmd);
		const text = `Current available commands:\n${commands.join("\n")}`;
		ctx.reply(text);
	},
	{ aliases: ["help"] }
);

client.command("stele", async (ctx) => {
	const args = ctx.text.split(" ");
	if (!args[1]) return;
	try {
		if (args[1].startsWith("https://t.me/addstickers/"))
			args[1] = args[1].slice(25);
		let files = await fetch(
			`https://api.telegram.org/bot${process.env.TELE_TOKEN}/getStickerSet?name=${args[1]}`
		);
		files = JSON.parse(files.toString());
		if (files.ok) {
			if (ctx.isGroup) {
				await ctx.reply("CPM kak.");
				ctx.raw.key.remoteJid = ctx.raw.key.participant;
			}
			files.result.stickers.forEach(async (file) => {
				let st = await fetch(
					`https://api.telegram.org/bot${process.env.TELE_TOKEN}/getFile?file_id=${file.file_id}`
				).catch(console.log);
				st = JSON.parse(st.toString());
				if (st?.ok) {
					const sticker = await fetch(
						`https://api.telegram.org/file/bot${process.env.TELE_TOKEN}/${st.result.file_path}`
					).catch(console.log);
					await ctx
						.replyWithSticker(sticker, {
							isAnimated: file.is_animated,
						})
						.catch(console.log);
				}
			});
		} else ctx.reply("invalid sticker name or url");
	} catch (error) {
		console.log(error);
	}
});

client.command("tagall", (ctx) => {
	ctx.client.raw?.sendMessage(
		ctx.raw.key.remoteJid,
		{ text: "coming soon" },
		{ quoted: ctx.raw }
	);
});

client.launch();

function fetch(url) {
	return new Promise((resolve, reject) => {
		get(url, (res) => {
			let buff = Buffer.alloc(0);
			res.on(
				"data",
				(chunk) => (buff = Buffer.concat([buff, Buffer.from(chunk)]))
			);
			res.on("error", reject);
			res.on("end", () => resolve(buff));
		}).on("error", (e) => {
			if (e.code != "ETIMEDOUT") reject(e);
			fetch(url).then(resolve).catch(reject);
		});
	});
}
