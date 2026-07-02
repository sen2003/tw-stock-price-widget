import type { SymbolHit, WidgetQuote } from "../types";
import { arrow, directionClass, formatChange, formatPercent, formatPrice, formatVolume } from "../format";
import SymbolAutocomplete from "./SymbolAutocomplete";

const MAX_SYMBOLS = 5;

type Props = {
  quotes: WidgetQuote[];
  allSymbols: string[]; // 完整觀察清單（含第一檔），只用來算 5 檔上限跟自動補全排除
  visibleSymbols: string[]; // 面板實際要列出的項目——不含第一檔，因為徽章已經顯示過了
  fugleEnabled: boolean;
  onAdd: (hit: SymbolHit) => void;
  onRemove: (code: string) => void;
  onMinimize: () => void;
  onQuit: () => void;
};

export default function Panel({ quotes, allSymbols, visibleSymbols, fugleEnabled, onAdd, onRemove, onMinimize, onQuit }: Props) {
  const quoteBySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));

  return (
    <div className="panel no-drag">
      <div className="panel-header">
        <span className="panel-title">股價小工具</span>
        <div className="panel-header-actions">
          <button title="收合成只顯示加權指數" onClick={onMinimize}>
            —
          </button>
          <button title="關閉" onClick={onQuit}>
            ×
          </button>
        </div>
      </div>

      {!fugleEnabled && <div className="panel-hint">請在 .env 設定 FUGLE_API_KEY 後重啟後端，才能顯示即時行情。</div>}

      {visibleSymbols.length === 0 && <div className="panel-hint">目前只有加權指數，在下面新增其他股票／指數（最多 5 檔）。</div>}

      <div className="panel-list">
        {visibleSymbols.map((code, index) => {
          const quote = quoteBySymbol.get(code);
          const isIndex = code.toUpperCase().startsWith("IX");
          return (
            <div className={`panel-item ${index > 0 ? "panel-item-separated" : ""}`} key={code}>
              <div className="panel-item-row">
                <span className="panel-item-name">{quote?.name || code}</span>
                <button className="remove-btn" title="移除" onClick={() => onRemove(code)}>
                  ×
                </button>
              </div>
              {quote ? (
                <>
                  <div className={`panel-item-row dir-${directionClass(quote)}`}>
                    <span className="panel-item-price">{formatPrice(quote.deal_price)}</span>
                    <span className="panel-item-arrow">{arrow(quote)}</span>
                    <span className="panel-item-change">{formatChange(quote)}</span>
                    <span className="panel-item-percent">({formatPercent(quote)})</span>
                  </div>
                  {!isIndex && <div className="panel-item-volume">成交量 {formatVolume(quote.total_volume)}</div>}
                </>
              ) : (
                <div className="panel-item-row">載入中…</div>
              )}
            </div>
          );
        })}
      </div>

      <SymbolAutocomplete disabled={allSymbols.length >= MAX_SYMBOLS} excludeCodes={allSymbols} onPick={onAdd} />
    </div>
  );
}
