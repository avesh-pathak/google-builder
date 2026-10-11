"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Upload } from "lucide-react";
import { buttonPrimary, buttonSecondary, field } from "@/lib/ui";
import { extractedItemSchema, extractionSchema, IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/ai/schemas";
import type { AIMenuItem } from "@/lib/ai/types";
import { aiRequest, requestError } from "./request";

interface Props { onReviewedMenu: (items: AIMenuItem[]) => void; onReset?: () => void }
/** Uploaded images and drafts stay in memory only. Parent owns the reviewed context. */
export function AIMenuExplorer({ onReviewedMenu, onReset }: Props) {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [items, setItems] = useState<AIMenuItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function choose(file?: File) {
    controller.current?.abort(); setBusy(false); setCompleted(false); setReviewed(false); setItems([]); setWarnings([]); onReset?.();
    setImage(null); setPreview(null);
    if (!file) return;
    if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) { setError("Choose a JPEG, PNG or WebP menu photo."); return; }
    if (!file.size || file.size > MAX_IMAGE_BYTES) { setError(file.size ? "Your image is too large. Please upload a file under 5 MB." : "This image is empty. Choose another photo."); return; }
    setError(null); setImage(file); setPreview(URL.createObjectURL(file));
  }
  async function analyze() {
    if (!image || busy) return;
    const active = new AbortController(); controller.current = active;
    setBusy(true); setError(null); setItems([]); setCompleted(false); setReviewed(false); onReset?.();
    const data = new FormData(); data.append("image", image);
    try {
      const result = await aiRequest("/api/ai/analyze-menu", data, extractionSchema, active.signal);
      if (!active.signal.aborted) { setItems(result.items); setWarnings(result.warnings); setCompleted(true); }
    } catch (e) { if (!active.signal.aborted) setError(requestError(e)); }
    finally { if (!active.signal.aborted) setBusy(false); }
  }
  function correct(id: string, patch: Partial<AIMenuItem>) {
    setItems((old) => old.map((m) => m.id === id ? { ...m, ...patch } : m));
    if (reviewed) onReset?.(); setReviewed(false);
  }
  function confirm() {
    if (items.some((m) => !extractedItemSchema.safeParse(m).success)) { setError("Check item names, descriptions and prices. Names are required; prices must be between ₹0 and ₹100,000."); return; }
    setError(null); setReviewed(true); onReviewedMenu(items);
  }
  return <section aria-labelledby="ai-upload-title" className="space-y-5">
    <div><h2 id="ai-upload-title" className="font-display text-2xl font-semibold">Read a real menu</h2><p className="mt-2 text-sm text-espresso-600">Upload a clear photo, then review what Gemini can read. Your photo is sent to Gemini but is not saved by this app.</p></div>
    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-cream-400 bg-white p-5">
      <ImagePlus aria-hidden="true" className="shrink-0 text-caramel-600" size={24} />
      <span className="min-w-0"><span className="block font-semibold">Choose a menu photo</span><span className="text-sm text-espresso-600">JPEG, PNG or WebP · up to 5 MB</span>
        <input aria-label="Menu photo" className="mt-3 block w-full text-sm" type="file" accept={IMAGE_TYPES.join(",")} disabled={busy} onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }} />
      </span>
    </label>
    {preview ? <figure className="space-y-2">
      {/* Local object URLs cannot use the Next image optimizer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={preview} alt="Selected menu photo for review" className="max-h-96 w-full rounded-2xl border border-cream-300 bg-white object-contain" />
      <figcaption className="break-all text-sm text-espresso-600">{image?.name}</figcaption>
    </figure> : null}
    <button className={buttonPrimary} disabled={!image || busy} onClick={analyze}><Upload size={16} aria-hidden="true" />{busy ? "Reading your menu with Gemini..." : "Analyze Menu with AI"}</button>
    {error ? <p role="alert" className="text-sm text-caramel-700">{error}</p> : null}
    <div aria-live="polite" aria-busy={busy} className="space-y-3">
      {warnings.map((w) => <p key={w} className="text-sm text-espresso-600">{w}</p>)}
      {completed && !items.length ? <p className="rounded-xl bg-cream-200 p-4 text-sm">No readable menu items found. Try a brighter, closer photo with sharp text.</p> : null}
      {items.length ? <p className="text-sm font-medium">{items.length} items extracted. Review names, prices, categories and descriptions before using them.</p> : null}
    </div>
    <div className="grid gap-4 sm:grid-cols-2">{items.map((item) => <article key={item.id} className="space-y-3 rounded-2xl border border-cream-300 bg-white p-4">
      <label className="block text-sm font-medium">Item name<input className={`${field} mt-1`} value={item.name} maxLength={160} onChange={(e) => correct(item.id, { name: e.target.value })} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">Price (₹)<input className={`${field} mt-1`} type="number" min={0} max={100000} step="0.01" placeholder="Not readable" value={item.priceINR ?? ""} onChange={(e) => correct(item.id, { priceINR: e.target.value === "" ? null : Number(e.target.value) })} /></label>
        <label className="block text-sm font-medium">Category<select className={`${field} mt-1`} value={item.category} onChange={(e) => correct(item.id, { category: e.target.value as AIMenuItem["category"] })}><option value="drink">Drink</option><option value="food">Food</option><option value="unknown">Unknown</option></select></label>
      </div>
      <label className="block text-sm font-medium">Description<textarea className={`${field} mt-1`} rows={2} maxLength={600} value={item.description ?? ""} onChange={(e) => correct(item.id, { description: e.target.value.trim() ? e.target.value : null })} /></label>
      <p className="text-xs text-espresso-600">Visible ingredients: {item.ingredients.join(", ") || "Not listed"}. Tags: {item.tags.join(", ") || "Not listed"}.</p>
    </article>)}</div>
    {items.length ? <button className={buttonSecondary} disabled={reviewed} onClick={confirm}>{reviewed ? "Reviewed menu ready below" : "Use reviewed menu for recommendations"}</button> : null}
    <p className="text-xs text-espresso-600">Reviewing does not change the café&apos;s official menu. Confirm ingredients and allergies with staff.</p>
  </section>;
}
