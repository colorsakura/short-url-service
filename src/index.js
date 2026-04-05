const BASE62 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * 生成短码（基于纳秒时间戳转 base62）
 */
function generateShortCode() {
	let id = Date.now();
	let code = "";
	while (id > 0) {
		code = BASE62[id % 62] + code;
		id = Math.floor(id / 62);
	}
	return code.padStart(6, "a");
}

/**
 * 验证 URL 格式
 */
function isValidUrl(url) {
	try {
		const parsed = new URL(url);
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const path = url.pathname;

		if (request.method === "POST" && path === "/") {
			let body;
			try {
				body = await request.json();
			} catch {
				return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}

			const { url: originalUrl } = body;
			if (!originalUrl || !isValidUrl(originalUrl)) {
				return new Response(JSON.stringify({ error: "Invalid or missing URL" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}

			const shortCode = generateShortCode();
			await env.KV.put(shortCode, originalUrl);

			const shortUrl = `${url.origin}/${shortCode}`;
			return new Response(JSON.stringify({ shortUrl, shortCode }), {
				status: 201,
				headers: { "Content-Type": "application/json" },
			});
		}

		if (request.method === "GET" && path !== "/") {
			const shortCode = path.slice(1);
			const originalUrl = await env.KV.get(shortCode);

			if (!originalUrl) {
				return new Response(JSON.stringify({ error: "Short URL not found" }), {
					status: 404,
					headers: { "Content-Type": "application/json" },
				});
			}

			return Response.redirect(originalUrl, 302);
		}

		return new Response(JSON.stringify({ error: "Not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	},
};
