import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
	SELF,
} from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import worker from "../src";

describe("Short URL Service", () => {
	describe("POST / - create short URL", () => {
		it("creates a short URL with valid URL", async () => {
			const request = new Request("http://example.com/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ url: "https://example.com/very/long/path" }),
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(201);
			const data = await response.json();
			expect(data.shortUrl).toBeDefined();
			expect(data.shortCode).toBeDefined();
			expect(data.shortCode.length).toBeGreaterThanOrEqual(6);
		});

		it("returns 400 for missing URL", async () => {
			const request = new Request("http://example.com/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.error).toBe("Invalid or missing URL");
		});

		it("returns 400 for invalid URL format", async () => {
			const request = new Request("http://example.com/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ url: "not-a-valid-url" }),
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(400);
		});

		it("returns 400 for invalid JSON body", async () => {
			const request = new Request("http://example.com/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: "invalid json",
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.error).toBe("Invalid JSON body");
		});
	});

	describe("GET /*shortCode - redirect", () => {
		it("redirects to original URL when short code exists", async () => {
			await env.KV.put("test123", "https://example.com/redirect-target");

			const request = new Request("http://example.com/test123");
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(302);
			expect(response.headers.get("Location")).toBe("https://example.com/redirect-target");
		});

		it("returns 404 when short code not found", async () => {
			const request = new Request("http://example.com/nonexistent");
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data.error).toBe("Short URL not found");
		});
	});

	describe("root path", () => {
		it("returns 404 for GET /", async () => {
			const request = new Request("http://example.com/");
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(404);
		});
	});
});
