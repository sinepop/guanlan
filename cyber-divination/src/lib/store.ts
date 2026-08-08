// sessionStorage 存取：跨页面传递输入与结果
import type { BaziInput, BaziResult, AiAnalysis, CompatInput, CompatScore, MeihuaResult } from "./types";

const KEY = {
  baziInput: "bazi-input",
  result: "bazi-result",
  ai: "bazi-ai",
  compatInput: "compat-input",
  compatResult: "compat-result",
  askResult: "ask-result",
};

export function get<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
export function set(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}
export function clear(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const store = {
  getBaziInput: () => get<BaziInput>(KEY.baziInput),
  setBaziInput: (v: BaziInput) => set(KEY.baziInput, v),
  getResult: () => get<BaziResult>(KEY.result),
  setResult: (v: BaziResult) => set(KEY.result, v),
  getAi: () => get<AiAnalysis>(KEY.ai),
  setAi: (v: AiAnalysis) => set(KEY.ai, v),
  getCompatInput: () => get<CompatInput>(KEY.compatInput),
  setCompatInput: (v: CompatInput) => set(KEY.compatInput, v),
  getCompatResult: () => get<CompatScore>(KEY.compatResult),
  setCompatResult: (v: CompatScore) => set(KEY.compatResult, v),
  getAskResult: () => get<MeihuaResult>(KEY.askResult),
  setAskResult: (v: MeihuaResult) => set(KEY.askResult, v),
};