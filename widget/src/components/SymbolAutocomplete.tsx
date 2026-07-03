import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { SymbolHit } from "../types";

type Props = {
  excludeCodes: string[];
  onPick: (hit: SymbolHit) => void;
};

export default function SymbolAutocomplete({ excludeCodes, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SymbolHit[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) {
      setHits([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const results = await window.widgetAPI.searchSymbols(trimmed);
      setHits(results.filter((hit) => !excludeCodes.includes(hit.code)));
      setHighlighted(0);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function pick(hit: SymbolHit) {
    onPick(hit);
    setQuery("");
    setHits([]);
  }

  // 直接按 Enter 新增只接受「看起來像代號」的輸入（英數字），避免使用者打中文
  // 名稱但清單沒對到任何結果時，把中文字誤當成代號送去查報價（一定查不到）。
  const looksLikeCode = /^[0-9A-Za-z]+$/.test(query.trim());

  function commitRaw() {
    const code = query.trim().toUpperCase();
    if (!code || !looksLikeCode || excludeCodes.includes(code)) return;
    pick({ code, name: "" });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      // 有比對結果時（不管是打代號還是中文名稱查到的）Enter 直接選第一筆／目前
      // 反白的那筆；完全沒結果時才走「把輸入當代號直接新增」的備援。
      if (hits.length > 0) {
        pick(hits[Math.min(highlighted, hits.length - 1)]);
      } else {
        commitRaw();
      }
    } else if (event.key === "ArrowDown" && hits.length > 0) {
      event.preventDefault();
      setHighlighted((prev) => (prev + 1) % hits.length);
    } else if (event.key === "ArrowUp" && hits.length > 0) {
      event.preventDefault();
      setHighlighted((prev) => (prev - 1 + hits.length) % hits.length);
    }
  }

  return (
    <div className="autocomplete no-drag">
      <input
        type="text"
        placeholder="輸入代號或名稱新增"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      {/* 自動補全清單抓不到資料時，輸入的若是英數字代號仍可直接按 Enter 新增；
          中文名稱查無結果時不提供這個備援（打的中文字不能拿去當代號查報價）。 */}
      {query.trim() && hits.length === 0 && looksLikeCode && (
        <div className="autocomplete-hint">查無比對結果，按 Enter 直接以代號新增</div>
      )}
      {query.trim() && hits.length === 0 && !looksLikeCode && (
        <div className="autocomplete-hint">查無符合的股票名稱，請確認輸入或改用代號查詢</div>
      )}
      {hits.length > 0 && (
        <ul className="autocomplete-list">
          {hits.map((hit, index) => (
            <li key={hit.code} className={index === highlighted ? "active" : ""} onMouseEnter={() => setHighlighted(index)} onClick={() => pick(hit)}>
              <span className="autocomplete-code">{hit.code}</span>
              <span className="autocomplete-name">{hit.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
