const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const { get } = require("node:https");
const { Client, SessionManager } = require("gampang");
const { writeFileSync, readFileSync, unlinkSync } = require("node:fs");
const { getRandomValues } = require("node:crypto");
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
			const random = getRandomValues(new Uint32Array(2));
			const tmpInput = `tmpInput-${random[0]}.webp`;
			const tmpOutput = `tmpOutput-${random[1]}.mp4`;
			writeFileSync(tmpInput, sticker);
			const child = spawn("magick", [
				"convert",
				"-format",
				"mp4",
				tmpInput,
				tmpOutput,
			]);
			child.on("exit", () => {
				const buff = readFileSync(tmpOutput);
				ctx.replyWithVideo(buff).finally(() => {
					unlinkSync(tmpInput);
					unlinkSync(tmpOutput);
				});
			});
		} else {
			ctx.replyWithPhoto(sticker);
		}
	}
});

client.command("tostkr", async (ctx) => {
	const reply = ctx.getReply();
	const random = getRandomValues(new Uint32Array(2));
	const tmpOutput = `tmpOutput-${random[1]}.webp`;
	let tmpInput;
	if (reply?.image) {
		tmpInput = `tmpInput-${random[0]}.jpeg`;
		writeFileSync(tmpInput, await reply.image.retrieveFile("image"));
	} else if (reply?.video) {
		if (reply.video.seconds > 5) {
			ctx.reply("durasi maksimal 5 detik.");
			return;
		}
		tmpInput = `tmpInput-${random[0]}.mp4`;
		writeFileSync(tmpInput, await reply.video.retrieveFile("video"));
	} else return;
	const child = spawn("ffmpeg", [
		"-y",
		"-i",
		tmpInput,
		"-vf",
		"scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1",
		tmpOutput,
	]);

	child.on("exit", () => {
		const buff = readFileSync(tmpOutput);
		ctx.replyWithSticker(buff).finally(() => {
			unlinkSync(tmpInput);
			unlinkSync(tmpOutput);
		});
	});
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
			if (ctx.raw.key.participant) {
				await ctx.reply("CPM kak.");
				ctx.raw.key.remoteJid = ctx.raw.key.participant;
			}
			files.result.stickers.forEach(async (file) => {
				let st = await fetch(
					`https://api.telegram.org/bot${process.env.TELE_TOKEN}/getFile?file_id=${file.file_id}`
				).catch(console.log);
				st = JSON.parse(st.toString());
				if (st?.ok) {
					let sticker = await fetch(
						`https://api.telegram.org/file/bot${process.env.TELE_TOKEN}/${st.result.file_path}`
					).catch(console.log);
					let tmpOutput;
					let tmpInput;
					if (file.is_animated) {
						const random = getRandomValues(new Uint32Array(2));
						tmpOutput = `tmpOutput-${random[1]}.webp`;
						tmpInput = `tmpInput-${random[0]}.tgs`;
						writeFileSync(tmpInput, sticker);
						spawnSync("tgswebp", [tmpInput, "-o", tmpOutput]);
						sticker = readFileSync(tmpOutput);
					}
					await ctx
						.replyWithSticker(sticker, {
							isAnimated: file.is_animated,
						})
						.catch(console.log);
					if (file.is_animated) {
						unlinkSync(tmpOutput);
						unlinkSync(tmpInput);
					}
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
