import React from "react";

type Size = "sm" | "md";

type Props = {
  rec: Record<string, any>;
  size?: Size;
};

/** Возвращает первое непустое значение из списка возможных ключей */
function pickValue(obj: Record<string, any>, keys: string[]): string | number {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null) {
      const s = String(v).trim();
      if (s !== "" && s !== "—" && s !== "-") return v;
    }
  }
  return "—";
}

// Утилита помогает зафиксировать тип кортежа [string, ReactNode]
const row = (label: string, value: React.ReactNode): [string, React.ReactNode] => [label, value];

export default function PriceTable({ rec, size = "md" }: Props) {
  const cls = size === "sm" ? "text-sm" : undefined;

  // Собираем строки таблицы. Для совместимости учитываем и snake_case и названия c пробелами.
  const rows: Array<[string, React.ReactNode]> = [
    row("от 20", pickValue(rec, ["price_per_m2_20", "price per m2 20"])),
    row("от 50", pickValue(rec, ["price_per_m2_50", "price per m2 50"])),
    row("от 100", pickValue(rec, ["price_per_m2_100", "price per m2 100"])),
    row("от 400", pickValue(rec, ["price_per_m2_400", "price per m2 400"])),
    row("от 700", pickValue(rec, ["price_per_m2_700", "price per m2 700"])),
    row("от 1500", pickValue(rec, ["price_per_m2_1500", "price per m2 1500"])),
  ];

  return (
    <div className={cls}>
      <div className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1">
        <div className="text-muted-foreground">Площадь</div>
        <div className="text-muted-foreground">Цены, ₽/м²</div>
        {rows.map(([label, value]) => (
          <React.Fragment key={label}>
            <div className="text-muted-foreground">{label}</div>
            <div>{value}</div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
