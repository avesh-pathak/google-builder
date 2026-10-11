"use client";

import {
  AlertCircle,
  ImagePlus,
  Search,
  SearchX,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { PRIMARY_CAFE_ID } from "@/lib/data";
import { useApp } from "@/lib/store";
import type { ItemCategory } from "@/lib/types";
import {
  buttonGhost,
  buttonPrimary,
  buttonSecondary,
  chipBase,
  chipOff,
  chipOn,
  field,
  label,
} from "@/lib/ui";
import { cn, pluralize } from "@/lib/utils";
import { MenuItemCard } from "./MenuItemCard";
import { DemoBadge, SectionHeader } from "./ui/SectionHeader";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPT_ATTR = "image/jpeg,image/png,image/webp";

const CATEGORIES: { id: "all" | ItemCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "drinks", label: "Drinks" },
  { id: "food", label: "Food" },
];

interface PreviewFile {
  url: string;
  name: string;
  size: number;
}

/** Human-readable file size, e.g. "1.4 MB". */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function MenuExplorer() {
  const { menu, cafes } = useApp();
  const primaryCafe = cafes.find((cafe) => cafe.id === PRIMARY_CAFE_ID);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | ItemCategory>("all");

  const [preview, setPreview] = useState<PreviewFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Revoke the object URL whenever the preview changes or the section unmounts.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview.url);
  }, [preview]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return menu.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      return needle ? item.name.toLowerCase().includes(needle) : true;
    });
  }, [menu, query, category]);

  const description = primaryCafe
    ? `Every item at ${primaryCafe.name} in ${primaryCafe.area}. Search the menu, rate what you try and save your favorites.`
    : "Every item on the menu. Search, rate what you try and save your favorites.";

  function openPicker() {
    inputRef.current?.click();
  }

  function handleFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError("That file type is not supported. Choose a JPEG, PNG or WebP image.");
      return;
    }
    setFileError(null);
    setPreview({ url: URL.createObjectURL(file), name: file.name, size: file.size });
  }

  function clearFile() {
    setFileError(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function clearFilters() {
    setQuery("");
    setCategory("all");
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
    event.target.value = "";
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(true);
  }

  function onDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <section className="flex flex-col gap-6">
      <SectionHeader title="Explore Menu" description={description} action={<DemoBadge />} />

      <div className="rounded-2xl border border-cream-300 bg-white p-4 shadow-soft sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-caramel-50 text-caramel-700">
              <ImagePlus className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </span>
            <div>
              <h3 className="font-display text-base font-semibold text-espresso-900">
                Add a menu photo
              </h3>
              <p className="mt-0.5 text-sm text-espresso-500">
                Choose a picture of the café menu. Preview it here, then analyze it once Gemini
                support arrives.
              </p>
            </div>
          </div>

          <div>
            <input
              ref={inputRef}
              id="menu-image-input"
              type="file"
              name="menu-image"
              accept={ACCEPT_ATTR}
              tabIndex={-1}
              aria-label="Upload a menu photo"
              onChange={onInputChange}
              className="sr-only"
            />

            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={cn(
                "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-5 py-8 text-center transition-colors duration-200",
                dragging || fileError
                  ? "border-caramel-400 bg-caramel-50"
                  : "border-cream-400 bg-cream-50",
              )}
            >
              {preview ? (
                <>
                  <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-cream-300 bg-white shadow-soft">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview.url}
                      alt={`Preview of ${preview.name}`}
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-left">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-espresso-800">
                          {preview.name}
                        </span>
                        <span className="text-xs text-espresso-400">
                          {formatBytes(preview.size)}
                        </span>
                      </span>
                      <span className="inline-flex shrink-0 items-center rounded-full bg-caramel-50 px-2 py-0.5 text-[11px] font-semibold text-caramel-700">
                        Ready
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button type="button" onClick={openPicker} className={buttonSecondary}>
                      <Upload className="h-4 w-4" strokeWidth={2} aria-hidden />
                      Replace
                    </button>
                    <button type="button" onClick={clearFile} className={buttonGhost}>
                      <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
                      Remove
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-caramel-600 shadow-soft">
                    <Upload className="h-6 w-6" strokeWidth={1.6} aria-hidden />
                  </span>
                  <p className="font-display text-sm font-semibold text-espresso-800">
                    Drop a menu photo here
                  </p>
                  <p className="max-w-sm text-xs text-espresso-500">
                    JPEG, PNG or WebP. Or pick a file from your device. Nothing is uploaded in this
                    phase.
                  </p>
                  <button type="button" onClick={openPicker} className={buttonPrimary}>
                    <Upload className="h-4 w-4" strokeWidth={2} aria-hidden />
                    Choose an image
                  </button>
                </>
              )}
            </div>

            {fileError ? (
              <p
                role="alert"
                className="mt-2 flex items-center gap-1.5 text-sm font-medium text-caramel-700"
              >
                <AlertCircle className="h-4 w-4" strokeWidth={2} aria-hidden />
                {fileError}
              </p>
            ) : (
              <p className="mt-2 text-xs text-espresso-400">
                Your image stays on your device. Preview only, no upload.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-cream-300 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" disabled className={buttonPrimary}>
                <Sparkles className="h-4 w-4" strokeWidth={2} aria-hidden />
                Analyze Menu with AI
              </button>
              <span className="inline-flex items-center rounded-full border border-dashed border-caramel-300 bg-caramel-50 px-2.5 py-1 text-[11px] font-semibold text-caramel-700">
                Coming in Phase 3
              </span>
            </div>
            <p className="max-w-md text-xs text-espresso-500">
              Menu scanning with Gemini arrives in Phase 3. In this phase nothing is uploaded and
              nothing is analyzed.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-cream-300 bg-white p-4 shadow-soft sm:p-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="w-full lg:max-w-sm">
          <label htmlFor="menu-search" className={label}>
            Search the menu
          </label>
          <div className="relative mt-1.5">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-espresso-400"
              strokeWidth={2}
              aria-hidden
            />
            <input
              id="menu-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by item name"
              autoComplete="off"
              className={cn(field, "pl-9")}
            />
          </div>
        </div>

        <div>
          <span className={cn(label, "mb-1.5")}>Filter by category</span>
          <div role="group" aria-label="Filter menu by category" className="flex flex-wrap gap-2">
            {CATEGORIES.map((option) => {
              const active = category === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCategory(option.id)}
                  className={cn(chipBase, active ? chipOn : chipOff)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <p role="status" aria-live="polite" className="text-sm text-espresso-500">
        {filtered.length} of {menu.length} {pluralize(menu.length, "item")}
      </p>

      {filtered.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <MenuItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-cream-400 bg-cream-50 px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-caramel-600 shadow-soft">
            <SearchX className="h-6 w-6" strokeWidth={1.6} aria-hidden />
          </span>
          <p className="font-display text-base font-semibold text-espresso-800">
            No items match your search
          </p>
          <p className="max-w-sm text-sm text-espresso-500">
            Try a different name
            {category !== "all" ? " or switch back to all categories" : ""}.
          </p>
          <button type="button" onClick={clearFilters} className={buttonSecondary}>
            Clear filters
          </button>
        </div>
      )}
    </section>
  );
}
