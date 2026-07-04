import { useCallback, useEffect, useRef, useState } from "react";
import Badge from "./components/Badge";
import Panel from "./components/Panel";
import type { FlashDirection, SymbolHit, WidgetQuote } from "./types";

const DEFAULT_POLL_INTERVAL_MS = 5000;
const HOVER_PADDING_PX = 10; // forgiving margin so the hit-test doesn't miss by a pixel
const LEAVE_DELAY_MS = 250;
const FLASH_DURATION_MS = 600; // 閃爍動畫播完要清掉 flash 狀態，下次更新才能重新觸發

export default function App() {
  const [symbols, setSymbols] = useState<string[]>(["IX0001"]);
  // 面板是否展開：hover 進來就打開，但移開滑鼠不會自動關閉——只有使用者按
  // 面板上的「－」（handleCollapse）才會收合回只顯示徽章。不再有「縮小成小圓球」
  // 這個第三種狀態。
  const [panelOpen, setPanelOpen] = useState(false);
  const [quotes, setQuotes] = useState<WidgetQuote[]>([]);
  const [fugleEnabled, setFugleEnabled] = useState(true);
  const [rateLimited, setRateLimited] = useState(false);
  const [pollIntervalMs, setPollIntervalMs] = useState(DEFAULT_POLL_INTERVAL_MS);
  const [ready, setReady] = useState(false);
  // 只有加權指數（徽章）需要閃爍提示，個股清單不用。
  const [primaryFlash, setPrimaryFlash] = useState<FlashDirection | undefined>(undefined);
  const [now, setNow] = useState<Date>(new Date());
  const symbolsRef = useRef(symbols);
  symbolsRef.current = symbols;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const interactiveRef = useRef(false);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPrimaryPriceRef = useRef<number | null | undefined>(undefined);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Electron's forwarded mousemove (setIgnoreMouseEvents forward:true) does not
  // reliably drive native mouseenter/mouseleave — hit-test cursor position
  // against the visible content's bounding box on every mousemove instead.
  useEffect(() => {
    function onMove(event: MouseEvent) {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // 自動補全的下拉清單用 position:absolute 往下展開，視覺上會超出
      // hover-zone 自己的 layout box（getBoundingClientRect 不會把絕對定位、
      // 溢出的子元素算進父層的範圍）。滑鼠移進清單時要另外把它的範圍也算進去，
      // 不然選到一半清單所在的區域會被判定成「已經離開小工具」。
      const dropdown = el.querySelector(".autocomplete-list");
      const dropdownRect = dropdown ? dropdown.getBoundingClientRect() : null;
      const left = Math.min(rect.left, dropdownRect?.left ?? Infinity);
      const right = Math.max(rect.right, dropdownRect?.right ?? -Infinity);
      const top = Math.min(rect.top, dropdownRect?.top ?? Infinity);
      const bottom = Math.max(rect.bottom, dropdownRect?.bottom ?? -Infinity);
      const inside =
        event.clientX >= left - HOVER_PADDING_PX &&
        event.clientX <= right + HOVER_PADDING_PX &&
        event.clientY >= top - HOVER_PADDING_PX &&
        event.clientY <= bottom + HOVER_PADDING_PX;

      if (inside) {
        if (leaveTimerRef.current) {
          clearTimeout(leaveTimerRef.current);
          leaveTimerRef.current = null;
        }
        if (!interactiveRef.current) {
          interactiveRef.current = true;
          window.widgetAPI.setInteractive(true);
        }
        setPanelOpen(true);
      } else if (interactiveRef.current && !leaveTimerRef.current) {
        leaveTimerRef.current = setTimeout(() => {
          leaveTimerRef.current = null;
          interactiveRef.current = false;
          window.widgetAPI.setInteractive(false);
          // 離開只恢復滑鼠穿透，面板維持展開，等使用者自己按「－」收合。
        }, LEAVE_DELAY_MS);
      }
    }

    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // 主行程的保險機制：游標離開視窗矩形本身（往左/往上，超出視窗範圍後就再也
  // 收不到任何滑鼠事件，上面 onMove 完全等不到觸發時機）偵測到後會推事件過來，
  // 這裡只需要同步「已經不是互動狀態」，同樣不動 panelOpen。
  useEffect(() => {
    return window.widgetAPI.onForceLeave(() => {
      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = null;
      }
      interactiveRef.current = false;
    });
  }, []);

  // 徽章上的時間是持續走動的時鐘，跟報價輪詢無關——不是「最後更新時間」。
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    window.widgetAPI.loadState().then((state) => {
      if (cancelled) return;
      setSymbols(state.symbols.length ? state.symbols : ["IX0001"]);
      setPollIntervalMs(state.pollIntervalMs || DEFAULT_POLL_INTERVAL_MS);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 每次收到新報價都跟上一次加權指數的成交價比較，決定要不要閃一下（漲紅/
  // 跌綠/平盤白）。第一次拿到報價時還沒有基準可比，跳過閃爍。閃完固定時間
  // 後清掉 flash 狀態，class 被移除又重新加回去，CSS animation 才會在下次
  // 更新時重新播放。
  const applyPrimaryFlash = useCallback((newQuotes: WidgetQuote[]) => {
    const primary = newQuotes.find((quote) => quote.symbol === symbolsRef.current[0]);
    const prevPrice = prevPrimaryPriceRef.current;
    const currPrice = primary?.deal_price ?? null;
    if (prevPrice !== undefined && prevPrice !== null && currPrice !== null) {
      const direction: FlashDirection = currPrice > prevPrice ? "up" : currPrice < prevPrice ? "down" : "flat";
      setPrimaryFlash(direction);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => {
        flashTimerRef.current = null;
        setPrimaryFlash(undefined);
      }, FLASH_DURATION_MS);
    }
    prevPrimaryPriceRef.current = currPrice;
  }, []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    async function poll() {
      const response = await window.widgetAPI.getQuotes(symbolsRef.current);
      if (cancelled) return;
      setFugleEnabled(response.fugle_enabled);
      setRateLimited(Boolean(response.rate_limited));
      applyPrimaryFlash(response.quotes);
      setQuotes(response.quotes);
    }

    poll();
    const timer = setInterval(poll, pollIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [ready, symbols, pollIntervalMs, applyPrimaryFlash]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  const handleAdd = useCallback((hit: SymbolHit) => {
    setSymbols((prev) => {
      if (prev.includes(hit.code)) return prev;
      const next = [...prev, hit.code];
      window.widgetAPI.saveState({ symbols: next });
      return next;
    });
  }, []);

  const handleRemove = useCallback((code: string) => {
    setSymbols((prev) => {
      const next = prev.filter((item) => item !== code);
      window.widgetAPI.saveState({ symbols: next });
      return next;
    });
  }, []);

  const handleCollapse = useCallback(() => {
    setPanelOpen(false);
  }, []);

  const handleIntervalChange = useCallback((ms: number) => {
    setPollIntervalMs(ms);
    window.widgetAPI.saveState({ pollIntervalMs: ms });
  }, []);

  const handleQuit = useCallback(() => {
    window.widgetAPI.quit();
  }, []);

  if (!ready) return null;

  const primaryQuote = quotes.find((quote) => quote.symbol === symbols[0]);

  return (
    <div ref={containerRef} className="hover-zone">
      <div className="drag-handle">
        <Badge
          quote={primaryQuote}
          fugleEnabled={fugleEnabled}
          rateLimited={rateLimited}
          flash={primaryFlash}
          now={now}
        />
      </div>
      {panelOpen && (
        <Panel
          quotes={quotes}
          allSymbols={symbols}
          visibleSymbols={symbols.slice(1)}
          fugleEnabled={fugleEnabled}
          rateLimited={rateLimited}
          pollIntervalMs={pollIntervalMs}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onMinimize={handleCollapse}
          onQuit={handleQuit}
          onIntervalChange={handleIntervalChange}
        />
      )}
    </div>
  );
}
