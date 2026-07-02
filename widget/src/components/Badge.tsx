import type { WidgetQuote } from "../types";
import { arrow, directionClass, formatChange, formatPercent, formatPrice } from "../format";

type Props = {
  quote: WidgetQuote | undefined;
  fugleEnabled: boolean;
};

export default function Badge({ quote, fugleEnabled }: Props) {
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
    <div className={`badge dir-${directionClass(quote)}`}>
      <span className="badge-name">{quote.name || quote.symbol}</span>
      <span className="badge-price">{formatPrice(quote.deal_price)}</span>
      <span className="badge-arrow">{arrow(quote)}</span>
      <span className="badge-change">{formatChange(quote)}</span>
      <span className="badge-percent">({formatPercent(quote)})</span>
    </div>
  );
}
