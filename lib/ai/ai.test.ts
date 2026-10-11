import assert from "node:assert/strict";
import { test } from "node:test";
import { contextSchema, rawExtractionSchema } from "./schemas";
import { demoContext, DEMO_AI_MENU } from "./demo-adapter";
import { eligibleCandidates, evidenceFacts, groundRecommendations } from "./grounding";
import { validateImage, validateImageSignature } from "./menu-analyzer";
import { readBoundedBody } from "./http";
import { POST as analyze } from "../../app/api/ai/analyze-menu/route";
import { POST as recommend } from "../../app/api/ai/recommend/route";
import { POST as ask } from "../../app/api/ai/ask-menu/route";

test("Phase 1 adapter validates and excludes private friend visits", () => {
  const context = contextSchema.parse(demoContext(DEMO_AI_MENU));
  assert.ok(context.memory.some((m) => m.id.startsWith("visit-avesh-3")));
  assert.ok(!JSON.stringify(context.friends).includes("visit-aarav-3"));
  assert.ok(context.rankedCandidates.length > 0);
});

test("missing history, friends and preferences remain valid", () => {
  const context = demoContext(DEMO_AI_MENU);
  context.memory = []; context.friends = [];
  context.user.preferences = { sweetness: null, bitterness: null, temperature: null, favoriteFlavors: [] };
  assert.ok(contextSchema.safeParse(context).success);
  assert.ok(evidenceFacts(context).every((f) => f.kind === "menu"));
});

test("reject invalid candidate IDs, duplicate ranks and unshared records", () => {
  const context = demoContext(DEMO_AI_MENU);
  assert.equal(contextSchema.safeParse({ ...context, rankedCandidates: [{ itemId: "not-present", rank: 1, evidence: [] }] }).success, false);
  assert.equal(contextSchema.safeParse({ ...context, rankedCandidates: context.rankedCandidates.map((c) => ({ ...c, rank: 1 })) }).success, false);
  const invalid = structuredClone(context);
  Object.assign(invalid.friends[0].sharedRecommendations[0], { shared: false });
  assert.equal(contextSchema.safeParse(invalid).success, false);
});

test("budget, unreadable price, disliked ingredients and unknown dietary safety are enforced", () => {
  const context = demoContext(DEMO_AI_MENU, "avesh", 250);
  assert.ok(eligibleCandidates(context).every((c) => context.menu.find((m) => m.id === c.itemId)!.priceINR! <= 250));
  const id = eligibleCandidates(context)[0].itemId;
  context.menu = context.menu.map((m) => m.id === id ? { ...m, priceINR: null } : m);
  assert.ok(!eligibleCandidates(context).some((c) => c.itemId === id));
  context.user.budgetINR = null;
  context.user.dislikedIngredients = ["milk"];
  assert.ok(eligibleCandidates(context).every((c) => !context.menu.find((m) => m.id === c.itemId)!.description?.toLowerCase().includes("milk")));
  context.user.dietaryRestrictions = ["milk allergy"];
  assert.equal(eligibleCandidates(context).length, 0);
});

test("grounded reasons retain ranking and reject invented facts/items/cross-item evidence", () => {
  const context = demoContext(DEMO_AI_MENU);
  const candidates = eligibleCandidates(context).slice(0, 2);
  const facts = evidenceFacts(context);
  const selections = [...candidates].reverse().map((c) => ({ itemId: c.itemId, evidenceIds: [facts.find((f) => f.itemId === c.itemId)!.id] }));
  assert.deepEqual(groundRecommendations(context, selections, facts).map((r) => r.itemId), candidates.map((c) => c.itemId));
  assert.throws(() => groundRecommendations(context, [{ itemId: "invented", evidenceIds: [] }], facts));
  assert.throws(() => groundRecommendations(context, [{ itemId: candidates[0].itemId, evidenceIds: ["invented-fact"] }], facts));
  assert.throws(() => groundRecommendations(context, [{ itemId: candidates[0].itemId, evidenceIds: [facts.find((f) => f.itemId === candidates[1].itemId)!.id] }], facts));
});

test("conflicting friend preferences are not rewritten as similarities", () => {
  const context = demoContext(DEMO_AI_MENU);
  context.friends = context.friends.filter((f) => f.name === "Aarav");
  assert.ok(!evidenceFacts(context).some((f) => f.text.includes("both prefer")));
});

test("uploaded item names do not prove historical recipe identity", () => {
  const uploaded = DEMO_AI_MENU.map((m, i) => ({ ...m, id: `extracted-${i}`, source: "uploaded_menu" as const }));
  const facts = evidenceFacts(demoContext(uploaded));
  assert.ok(facts.filter((f) => f.kind === "memory" || f.kind === "friend").every((f) => f.itemId === null));
});

test("extraction permits unreadable prices but rejects malformed outputs", () => {
  assert.ok(rawExtractionSchema.safeParse({ items: [{ name: "Latte", category: "drink", priceINR: null, description: null, ingredients: [], tags: [] }], warnings: [] }).success);
  assert.equal(rawExtractionSchema.safeParse({ items: [{ name: "Latte", priceINR: "220" }], warnings: [] }).success, false);
});

test("JPEG, PNG, WebP metadata and signatures; oversized/empty/spoofed images", () => {
  for (const [type, signature] of [
    ["image/jpeg", [255,216,255]], ["image/png", [137,80,78,71,13,10,26,10]],
    ["image/webp", [...Buffer.from("RIFF0000WEBP")]],
  ] as const) { const bytes = new Uint8Array(signature); validateImage(new File([bytes], "menu", { type })); validateImageSignature(bytes, type); }
  assert.throws(() => validateImage(new File(["svg"], "menu.svg", { type: "image/svg+xml" })));
  assert.throws(() => validateImage(new File([], "empty.png", { type: "image/png" })));
  assert.throws(() => validateImage(new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" })));
  assert.throws(() => validateImageSignature(new Uint8Array([1,2,3]), "image/png"));
});

test("bounded body rejects oversized data even without Content-Length", async () => {
  await assert.rejects(() => readBoundedBody(new Request("http://local", { method: "POST", body: "12345" }), 4));
});

test("routes reject missing image, invalid JSON and oversized question", async () => {
  const form = new FormData();
  assert.equal((await analyze(new Request("http://local", { method: "POST", body: form }))).status, 400);
  assert.equal((await recommend(new Request("http://local", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }))).status, 400);
  assert.equal((await ask(new Request("http://local", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ context: demoContext(DEMO_AI_MENU), question: "x".repeat(501) }) }))).status, 400);
});

test("mocked provider: real SDK/route extraction, empty/invalid output and rate-limit handling", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key-not-a-real-credential";
  let output = JSON.stringify({ items: [{ name: "Iced Latte", category: "drink", priceINR: null, description: null, ingredients: [], tags: ["cold"] }], warnings: ["Price unclear."] });
  let status = 200;
  globalThis.fetch = async () => new Response(JSON.stringify(status === 200 ? { candidates: [{ content: { parts: [{ text: output }], role: "model" }, finishReason: "STOP" }] } : { error: { code: status, message: "secret-provider-message" } }), { status, headers: { "Content-Type": "application/json" } });
  const request = () => { const form = new FormData(); form.append("image", new File([new Uint8Array([255,216,255,0])], "test.jpg", { type: "image/jpeg" })); return new Request("http://local", { method: "POST", body: form }); };
  try {
    const success = await analyze(request()); assert.equal(success.status, 200);
    const body = await success.json(); assert.equal(body.items[0].id, "extracted-1"); assert.equal(body.items[0].priceINR, null);
    output = JSON.stringify({ items: [], warnings: ["No readable menu items."] }); assert.equal((await (await analyze(request())).json()).items.length, 0);
    output = "not json"; assert.equal((await analyze(request())).status, 502);
    status = 429; const limited = await analyze(request()); assert.equal(limited.status, 429); assert.ok(!(await limited.text()).includes("secret-provider-message"));
  } finally { globalThis.fetch = originalFetch; if (originalKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = originalKey; }
});
