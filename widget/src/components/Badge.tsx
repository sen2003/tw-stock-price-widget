import type { FlashDirection, WidgetQuote } from "../types";
import {
  arrow,
  directionClass,
  formatChange,
  formatPercent,
  formatPrice,
} from "../format";

type Props = {
  quote: WidgetQuote | undefined;
  fugleEnabled: boolean;
  rateLimited: boolean;
  flash: FlashDirection | undefined;
};

export default function Badge({
  quote,
  fugleEnabled,
  rateLimited,
  flash,
}: Props) {
  if (!fugleEnabled) {
    return (
      <div className="badge badge-warning">
        <span>尚未設定 FUGLE_API_KEY</span>
      </div>
    );
  }
  if (!quote) {
    return (
      <div className="badge">
        <span>載入中…</span>
      </div>
    );
  }
  return (
    <div
      className={`badge dir-${directionClass(quote)}${flash ? ` flash-${flash}` : ""}`}
    >
      <span className="badge-name">{quote.name || quote.symbol}</span>
      <span className="badge-price">{formatPrice(quote.deal_price)}</span>
      <span className="badge-arrow">{arrow(quote)}</span>
      <span className="badge-change">{formatChange(quote)}</span>
      <span className="badge-percent">({formatPercent(quote)})</span>
      {rateLimited && (
        <span
          className="badge-rate-warning"
          title="已達 Fugle API 請求限制，資料可能是快取的舊值"
        >
          ⚠ API額度
        </span>
      )}
    </div>
  );
}
