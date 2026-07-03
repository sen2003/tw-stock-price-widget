import { useEffect, useRef } from "react";
import type { SymbolHit, WidgetQuote } from "../types";
import {
  arrow,
  directionClass,
  formatChange,
  formatPercent,
  formatPrice,
  formatVolume,
} from "../format";
import SymbolAutocomplete from "./SymbolAutocomplete";

const INTERVAL_OPTIONS_SEC = [3, 5, 10];

// 每次滾輪事件實際捲動的像素量，數字愈小手感愈細，避免預設的整頁幅度一次跳過太多檔。
const WHEEL_SCROLL_PX = 24;

type Props = {
  quotes: WidgetQuote[];
  allSymbols: string[]; // 完整觀察清單（含第一檔），只用來給自動補全排除已選的代號
  visibleSymbols: string[]; // 面板實際要列出的項目——不含第一檔，因為徽章已經顯示過了
  fugleEnabled: boolean;
  rateLimited: boolean;
  pollIntervalMs: number;
  onAdd: (hit: SymbolHit) => void;
  onRemove: (code: string) => void;
  onMinimize: () => void;
  onQuit: () => void;
  onIntervalChange: (ms: number) => void;
};

export default function Panel({
  quotes,
  allSymbols,
  visibleSymbols,
  fugleEnabled,
  rateLimited,
  pollIntervalMs,
  onAdd,
  onRemove,
  onMinimize,
  onQuit,
  onIntervalChange,
}: Props) {
  const quoteBySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));
  const listRef = useRef<HTMLDivElement | null>(null);

  // React attaches its delegated wheel listener as passive, so preventDefault()
  // in a JSX onWheel handler is silently ignored — a real (non-passive) native
  // listener is required to actually override the browser's scroll-per-tick amount.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    function onWheel(event: globalThis.WheelEvent) {
      event.preventDefault();
      el!.scrollTop += Math.sign(event.deltaY) * WHEEL_SCROLL_PX;
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div className="panel no-drag">
      <div className="panel-header">
        <div className="panel-title-group">
          <span className="panel-title">即時股價</span>
          <select
            className="interval-select"
            title="更新頻率"
            value={pollIntervalMs}
            onChange={(event) => onIntervalChange(Number(event.target.value))}
          >
            {INTERVAL_OPTIONS_SEC.map((sec) => (
              <option key={sec} value={sec * 1000}>
                {sec}秒
              </option>
            ))}
          </select>
          <span className="panel-title">更新</span>
        </div>
        <div className="panel-header-actions">
          <button title="收合成只顯示加權指數" onClick={onMinimize}>
            —
          </button>
          <button title="關閉" onClick={onQuit}>
            ×
          </button>
        </div>
      </div>

      {!fugleEnabled && (
        <div className="panel-hint">
          請在 .env 設定 FUGLE_API_KEY 後重啟後端，才能顯示即時行情。
        </div>
      )}

      {fugleEnabled && rateLimited && (
        <div className="panel-hint">
          已達 Fugle API
          每分鐘請求限制，資料可能是快取的舊值，建議拉長更新頻率或減少監看檔數。
        </div>
      )}

      {visibleSymbols.length === 0 && (
        <div className="panel-hint">
          目前只有加權指數，在下面新增其他股票／指數。
        </div>
      )}

      <div className="panel-list" ref={listRef}>
        {visibleSymbols.map((code, index) => {
          const quote = quoteBySymbol.get(code);
          const isIndex = code.toUpperCase().startsWith("IX");
          return (
            <div
              className={`panel-item ${index > 0 ? "panel-item-separated" : ""}`}
              key={code}
            >
              <div className="panel-item-row">
                <span className="panel-item-name">{quote?.name || code}</span>
                <button
                  className="remove-btn"
                  title="移除"
                  onClick={() => onRemove(code)}
                >
                  ×
                </button>
              </div>
              {quote ? (
                <>
                  <div
                    className={`panel-item-row dir-${directionClass(quote)}`}
                  >
                    <span className="panel-item-price">
                      {formatPrice(quote.deal_price)}
                    </span>
                    <span className="panel-item-arrow">{arrow(quote)}</span>
                    <span className="panel-item-change">
                      {formatChange(quote)}
                    </span>
                    <span className="panel-item-percent">
                      ({formatPercent(quote)})
                    </span>
                  </div>
                  {!isIndex && (
                    <div className="panel-item-volume">
                      成交量 {formatVolume(quote.total_volume)}
                    </div>
                  )}
                </>
              ) : (
                <div className="panel-item-row">載入中…</div>
              )}
            </div>
          );
        })}
      </div>

      <SymbolAutocomplete excludeCodes={allSymbols} onPick={onAdd} />
    </div>
  );
}
