'use client';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface TradeTypeOption<T extends string> {
  value: T;
  label: string;
}

interface TradeTypeChipsProps<T extends string> {
  value: T;
  options: TradeTypeOption<T>[];
  onValueChange: (value: T) => void;
}

export function TradeTypeChips<T extends string>({
  value,
  options,
  onValueChange,
}: TradeTypeChipsProps<T>) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => {
        // Use options lookup so onValueChange receives the correctly-typed T value
        const opt = options.find((o) => o.value === v);
        if (opt) onValueChange(opt.value);
      }}
      className="w-max gap-1.5 sm:gap-2"
    >
      {options.map((opt) => (
        <ToggleGroupItem
          key={opt.value}
          value={opt.value}
          className="h-8 whitespace-nowrap rounded-full border border-input bg-background px-3 text-xs font-medium data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:text-background hover:bg-muted sm:h-10 sm:px-4 sm:text-sm"
        >
          {opt.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
