import Link from "next/link";
import { AILab } from "@/components/ai/AILab";

export default function AILabPage() {
  return <main className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-12">
    <Link href="/" className="text-sm font-semibold text-caramel-700 underline underline-offset-4">Back to Café Circle</Link>
    <header className="mb-8 mt-6">
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">Café Circle AI Lab</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-espresso-600">A menu photo, your tastes, a little café memory. Try the isolated Gemini integration without changing the main app or saving anything to the database.</p>
    </header>
    <AILab />
  </main>;
}
