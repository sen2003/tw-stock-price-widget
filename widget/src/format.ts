import type { WidgetQuote } from "./types";

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
