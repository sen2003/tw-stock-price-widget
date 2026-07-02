import { app } from "electron";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

export type WidgetState = {
  symbols: string[];
  windowX: number | null;
  windowY: number | null;
};

const DEFAULT_STATE: WidgetState = {
  symbols: ["IX0001"],
  windowX: null,
  windowY: null
};

function statePath(): string {
  return path.join(app.getPath("userData"), "widget-state.json");
}

export function loadState(): WidgetState {
  try {
    const raw = readFileSync(statePath(), "utf-8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveState(state: WidgetState): void {
  try {
    const dir = path.dirname(statePath());
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(statePath(), JSON.stringify(state), "utf-8");
  } catch (err) {
    console.error("Failed to persist widget state", err);
  }
}
