"use client";

import { Check } from "lucide-react";
import { FLAVOR_OPTIONS, INGREDIENT_OPTIONS } from "@/lib/data";
import { useApp } from "@/lib/store";
import type { Budget, Temperature } from "@/lib/types";
import { card, chipBase, chipOff, chipOn, label } from "@/lib/ui";
import { cn } from "@/lib/utils";

const TEMPERATURE_OPTIONS: { value: Temperature; label: string }[] = [
  { value: "hot", label: "Hot" },
  { value: "cold", label: "Cold" },
  { value: "both", label: "Either" },
];

const BUDGET_OPTIONS: { value: Budget; label: string }[] = [
  { value: "value", label: "Value" },
  { value: "balanced", label: "Balanced" },
  { value: "premium", label: "Premium" },
];

function SliderField({
  id,
  labelText,
  value,
  onChange,
  minLabel,
  maxLabel,
}: {
  id: string;
  labelText: string;
  value: number;
  onChange: (value: number) => void;
  minLabel: string;
  maxLabel: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className={label}>
          {labelText}
        </label>
        <span className="text-sm font-medium text-espresso-600">{value} / 5</span>
      </div>
      <input
        id={id}
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-valuetext={`${value} out of 5`}
        className="mt-2 w-full"
      />
      <div className="mt-1 flex justify-between text-xs text-espresso-400">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

function SegmentedField<T extends string>({
  labelText,
  value,
  options,
  onChange,
}: {
  labelText: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <span className={label}>{labelText}</span>
      <div role="group" aria-label={labelText} className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={selected}
              className={cn(chipBase, selected ? chipOn : chipOff)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TasteProfileEditor() {
  const { user, updatePreferences } = useApp();
  const { preferences } = user;

  const toggleFlavor = (flavor: string) => {
    const next = preferences.favoriteFlavors.includes(flavor)
      ? preferences.favoriteFlavors.filter((entry) => entry !== flavor)
      : [...preferences.favoriteFlavors, flavor];
    updatePreferences({ favoriteFlavors: next });
  };

  const toggleIngredient = (ingredient: string) => {
    const next = preferences.dislikedIngredients.includes(ingredient)
      ? preferences.dislikedIngredients.filter((entry) => entry !== ingredient)
      : [...preferences.dislikedIngredients, ingredient];
    updatePreferences({ dislikedIngredients: next });
  };

  return (
    <section className={cn(card, "p-5 sm:p-6")} aria-labelledby="taste-profile-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-[52ch]">
          <h3
            id="taste-profile-heading"
            className="font-display text-lg font-semibold text-espresso-900"
          >
            Taste profile
          </h3>
          <p className="mt-1 text-sm text-espresso-500">
            Personalize what you like and the suggestions follow. Every change is saved
            automatically.
          </p>
        </div>
        <span
          role="status"
          aria-live="polite"
          className="inline-flex items-center gap-1.5 rounded-full bg-cream-100 px-3 py-1.5 text-xs font-medium text-espresso-500"
        >
          <Check className="h-3.5 w-3.5 text-caramel-600" strokeWidth={2.25} aria-hidden />
          Saved on this device
        </span>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <SliderField
          id="taste-sweetness"
          labelText="Sweetness"
          value={preferences.sweetness}
          onChange={(value) => updatePreferences({ sweetness: value })}
          minLabel="Barely sweet"
          maxLabel="Very sweet"
        />
        <SliderField
          id="taste-bitterness"
          labelText="Bitterness"
          value={preferences.bitterness}
          onChange={(value) => updatePreferences({ bitterness: value })}
          minLabel="Mild"
          maxLabel="Bold"
        />
        <SegmentedField
          labelText="Temperature"
          value={preferences.temperature}
          options={TEMPERATURE_OPTIONS}
          onChange={(value) => updatePreferences({ temperature: value })}
        />
        <SegmentedField
          labelText="Budget"
          value={preferences.budget}
          options={BUDGET_OPTIONS}
          onChange={(value) => updatePreferences({ budget: value })}
        />
        <div className="sm:col-span-2">
          <span className={label}>Favorite flavors</span>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Favorite flavors">
            {FLAVOR_OPTIONS.map((flavor) => {
              const selected = preferences.favoriteFlavors.includes(flavor);
              return (
                <button
                  key={flavor}
                  type="button"
                  onClick={() => toggleFlavor(flavor)}
                  aria-pressed={selected}
                  className={cn(chipBase, selected ? chipOn : chipOff)}
                >
                  {flavor}
                </button>
              );
            })}
          </div>
        </div>

        <div className="sm:col-span-2">
          <span className={label}>Ingredients to avoid</span>
          <p className="mt-1 text-xs text-espresso-400">
            Items that mention these are left out of your suggestions.
          </p>
          <div
            className="mt-2 flex flex-wrap gap-2"
            role="group"
            aria-label="Ingredients to avoid"
          >
            {INGREDIENT_OPTIONS.map((ingredient) => {
              const selected = preferences.dislikedIngredients.includes(ingredient);
              return (
                <button
                  key={ingredient}
                  type="button"
                  onClick={() => toggleIngredient(ingredient)}
                  aria-pressed={selected}
                  className={cn(chipBase, selected ? chipOn : chipOff)}
                >
                  {ingredient}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
