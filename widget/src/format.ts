import type { WidgetQuote } from "./types";

export function isIndexSymbol(symbol: string): boolean {
  return symbol.toUpperCase().startsWith("IX");
}

// 指數只顯示名稱（如「加權指數」），個股／ETF 在名稱前面加代號方便辨識
// （例如「2330 台積電」）。
export function formatDisplayName(quote: Pick<WidgetQuote, "symbol" | "name">): string {
  const name = quote.name || quote.symbol;
  if (isIndexSymbol(quote.symbol)) return name;
  return `${quote.symbol} ${name}`;
}

export function formatTimestamp(date: Date | null): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function directionClass(quote: WidgetQuote): "up" | "down" | "flat" {
  if (quote.change === null || quote.change === undefined || quote.change === 0) return "flat";
  return quote.change > 0 ? "up" : "down";
}

export function arrow(quote: WidgetQuote): string {
  const dir = directionClass(quote);
  if (dir === "up") return "▲";
  if (dir === "down") return "▼";
  return "－";
}

export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return "--";
  return value.toLocaleString("zh-Hant-TW", { maximumFractionDigits: 2 });
}

export function formatChange(quote: WidgetQuote): string {
  if (quote.change === null || quote.change === undefined) return "--";
  const sign = quote.change > 0 ? "+" : "";
  return `${sign}${quote.change.toLocaleString("zh-Hant-TW", { maximumFractionDigits: 2 })}`;
}

export function formatPercent(quote: WidgetQuote): string {
  if (quote.change_percent === null || quote.change_percent === undefined) return "--";
  const sign = quote.change_percent > 0 ? "+" : "";
  return `${sign}${quote.change_percent.toFixed(2)}%`;
}

export function formatVolume(value: number | null | undefined): string {
  if (value === null || value === undefined) return "--";
  return value.toLocaleString("zh-Hant-TW");
}
