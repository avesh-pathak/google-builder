"use client";

import { useState } from "react";
import { USERS } from "@/lib/data";
import { buttonSecondary, field } from "@/lib/ui";
import { DEMO_AI_MENU, demoContext } from "@/lib/ai/demo-adapter";
import type { AIMenuItem } from "@/lib/ai/types";
import { AIMenuExplorer } from "./AIMenuExplorer";
import { AIRecommendations } from "./AIRecommendations";
import { AskGemini } from "./AskGemini";

export function AILab() {
  const [menu, setMenu] = useState<AIMenuItem[] | null>(null);
  const [userId, setUserId] = useState(USERS[0].id);
  const [budget, setBudget] = useState("");
  const [revision, setRevision] = useState(0);
  const context = menu ? demoContext(menu, userId, budget === "" ? null : Number(budget)) : null;
  function reset() { setMenu(null); setRevision((r) => r + 1); }
  return <div className="space-y-10">
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-medium">Fictional demo profile<select className={`${field} mt-2`} value={userId} onChange={(e) => { setUserId(e.target.value); setRevision((r) => r + 1); }}>{USERS.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
      <label className="block text-sm font-medium">Maximum budget (₹, optional)<input className={`${field} mt-2`} value={budget} type="number" min={0} max={100000} placeholder="No price limit" onChange={(e) => { setBudget(e.target.value); setRevision((r) => r + 1); }} /></label>
    </div>
    <AIMenuExplorer onReviewedMenu={(items) => { setMenu(items); setRevision((r) => r + 1); }} onReset={reset} />
    <div className="border-t border-cream-300 pt-6">
      <button className={buttonSecondary} onClick={() => { setMenu(DEMO_AI_MENU); setRevision((r) => r + 1); }}>Test with fictional Phase 1 menu instead</button>
      <p className="mt-2 text-xs text-espresso-600">This loads demo menu data, not AI extraction. Explanations and questions still call the real Gemini API.</p>
    </div>
    {context ? <div key={revision} className="space-y-10">
      <p className="text-sm text-espresso-600">Active menu: {menu?.[0]?.source === "uploaded_menu" ? "your reviewed photo" : "fictional demo catalogue"} · {menu?.length} items. Personal history and shared friend records are fictional demo data.</p>
      <AIRecommendations context={context} />
      <AskGemini context={context} />
    </div> : <p className="text-sm text-espresso-600">Review an uploaded menu or load the fictional menu to enable recommendations and questions.</p>}
  </div>;
}
