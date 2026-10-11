"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useApp } from "@/lib/store";
import { buttonPrimary, buttonSecondary, field, label } from "@/lib/ui";
import { cn, todayIso } from "@/lib/utils";
import { Modal } from "./ui/Modal";
import { RatingInput } from "./ui/Rating";

interface FieldErrors {
  cafeName?: string;
  date?: string;
  itemName?: string;
}

export function AddVisitDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addVisit, cafes, menu } = useApp();

  const [cafeName, setCafeName] = useState("");
  // Seeded empty so the first render is time-independent; the effect below
  // fills in today's date the moment the dialog opens.
  const [date, setDate] = useState("");
  const [itemName, setItemName] = useState("");
  const [rating, setRating] = useState(4);
  const [note, setNote] = useState("");
  const [shared, setShared] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const cafeRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const itemRef = useRef<HTMLInputElement>(null);

  // Start every opening from a clean slate.
  useEffect(() => {
    if (!open) return;
    setCafeName("");
    setDate(todayIso());
    setItemName("");
    setRating(4);
    setNote("");
    setShared(false);
    setErrors({});
  }, [open]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: FieldErrors = {};
    if (!cafeName.trim()) nextErrors.cafeName = "Add the café name.";
    if (!date) nextErrors.date = "Pick a date.";
    if (!itemName.trim()) nextErrors.itemName = "Add what you ordered.";

    if (nextErrors.cafeName || nextErrors.date || nextErrors.itemName) {
      setErrors(nextErrors);
      if (nextErrors.cafeName) cafeRef.current?.focus();
      else if (nextErrors.date) dateRef.current?.focus();
      else itemRef.current?.focus();
      return;
    }

    const trimmedName = itemName.trim();
    const match = menu.find((item) => item.name.toLowerCase() === trimmedName.toLowerCase());

    addVisit({
      cafeName: cafeName.trim(),
      date,
      itemName: trimmedName,
      menuItemId: match?.id,
      rating,
      note,
      shared,
    });

    setCafeName("");
    setDate(todayIso());
    setItemName("");
    setRating(4);
    setNote("");
    setShared(false);
    setErrors({});
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a visit"
      description="Log a café stop and what you ordered."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="visit-cafe" className={label}>
            Café name
          </label>
          <input
            id="visit-cafe"
            ref={cafeRef}
            type="text"
            list="visit-cafe-options"
            autoComplete="off"
            value={cafeName}
            onChange={(event) => setCafeName(event.target.value)}
            aria-invalid={Boolean(errors.cafeName) || undefined}
            aria-describedby={errors.cafeName ? "visit-cafe-error" : undefined}
            className={cn(field, "mt-1.5", errors.cafeName && "ring-1 ring-caramel-300")}
          />
          <datalist id="visit-cafe-options">
            {cafes.map((cafe) => (
              <option key={cafe.id} value={cafe.name} />
            ))}
          </datalist>
          {errors.cafeName ? (
            <p id="visit-cafe-error" className="mt-1.5 text-xs font-medium text-caramel-700">
              {errors.cafeName}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="visit-date" className={label}>
            Date
          </label>
          <input
            id="visit-date"
            ref={dateRef}
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            aria-invalid={Boolean(errors.date) || undefined}
            aria-describedby={errors.date ? "visit-date-error" : undefined}
            className={cn(field, "mt-1.5", errors.date && "ring-1 ring-caramel-300")}
          />
          {errors.date ? (
            <p id="visit-date-error" className="mt-1.5 text-xs font-medium text-caramel-700">
              {errors.date}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="visit-item" className={label}>
            Item
          </label>
          <input
            id="visit-item"
            ref={itemRef}
            type="text"
            list="visit-item-options"
            autoComplete="off"
            value={itemName}
            onChange={(event) => setItemName(event.target.value)}
            aria-invalid={Boolean(errors.itemName) || undefined}
            aria-describedby={errors.itemName ? "visit-item-error" : undefined}
            className={cn(field, "mt-1.5", errors.itemName && "ring-1 ring-caramel-300")}
          />
          <datalist id="visit-item-options">
            {menu.map((item) => (
              <option key={item.id} value={item.name} />
            ))}
          </datalist>
          {errors.itemName ? (
            <p id="visit-item-error" className="mt-1.5 text-xs font-medium text-caramel-700">
              {errors.itemName}
            </p>
          ) : null}
        </div>

        <div>
          <span className={label}>Rating</span>
          <div className="mt-1.5">
            <RatingInput value={rating} onChange={setRating} />
          </div>
        </div>

        <div>
          <label htmlFor="visit-note" className={label}>
            Notes
          </label>
          <textarea
            id="visit-note"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className={cn(field, "mt-1.5 resize-y")}
          />
          <p className="mt-1.5 text-xs text-espresso-400">
            Optional. Anything worth remembering for next time.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-cream-300 bg-cream-50 px-3.5 py-3">
          <input
            id="visit-shared"
            type="checkbox"
            checked={shared}
            onChange={(event) => setShared(event.target.checked)}
            aria-describedby="visit-shared-help"
            className="mt-0.5 h-4 w-4 shrink-0 accent-caramel-600"
          />
          <div className="min-w-0">
            <label htmlFor="visit-shared" className="block text-sm font-medium text-espresso-800">
              Share with friends
            </label>
            <p id="visit-shared-help" className="mt-0.5 text-xs text-espresso-500">
              Shared visits can be recommended to your friends. Private visits stay private.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={buttonSecondary}>
            Cancel
          </button>
          <button type="submit" className={buttonPrimary}>
            Save visit
          </button>
        </div>
      </form>
    </Modal>
  );
}
