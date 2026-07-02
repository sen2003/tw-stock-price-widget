import { useCallback, useEffect, useRef, useState } from "react";
import Badge from "./components/Badge";
import Panel from "./components/Panel";
import type { SymbolHit, WidgetQuote } from "./types";

const POLL_INTERVAL_MS = 5000;
const MAX_SYMBOLS = 5;
const HOVER_PADDING_PX = 10; // forgiving margin so the hit-test doesn't miss by a pixel
const LEAVE_DELAY_MS = 250;

export default function App() {
  const [symbols, setSymbols] = useState<string[]>(["IX0001"]);
  // 面板是否展開：hover 進來就打開，但移開滑鼠不會自動關閉——只有使用者按
  // 面板上的「－」（handleCollapse）才會收合回只顯示徽章。不再有「縮小成小圓球」
  // 這個第三種狀態。
  const [panelOpen, setPanelOpen] = useState(false);
  const [quotes, setQuotes] = useState<WidgetQuote[]>([]);
  const [fugleEnabled, setFugleEnabled] = useState(true);
  const [ready, setReady] = useState(false);
  const symbolsRef = useRef(symbols);
  symbolsRef.current = symbols;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const interactiveRef = useRef(false);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    window.widgetAPI.loadState().then((state) => {
      if (cancelled) return;
      setSymbols(state.symbols.length ? state.symbols : ["IX0001"]);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    async function poll() {
      const response = await window.widgetAPI.getQuotes(symbolsRef.current);
      if (cancelled) return;
      setFugleEnabled(response.fugle_enabled);
      setQuotes(response.quotes);
    }

    poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [ready, symbols]);

  const handleAdd = useCallback((hit: SymbolHit) => {
    setSymbols((prev) => {
      if (prev.includes(hit.code) || prev.length >= MAX_SYMBOLS) return prev;
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

  const handleQuit = useCallback(() => {
    window.widgetAPI.quit();
  }, []);

  if (!ready) return null;

  const primaryQuote = quotes.find((quote) => quote.symbol === symbols[0]);

  return (
    <div ref={containerRef} className="hover-zone">
      <div className="drag-handle">
        <Badge quote={primaryQuote} fugleEnabled={fugleEnabled} />
      </div>
      {panelOpen && (
        <Panel
          quotes={quotes}
          allSymbols={symbols}
          visibleSymbols={symbols.slice(1)}
          fugleEnabled={fugleEnabled}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onMinimize={handleCollapse}
          onQuit={handleQuit}
        />
      )}
    </div>
  );
}
