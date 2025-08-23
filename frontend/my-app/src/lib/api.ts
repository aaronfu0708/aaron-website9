const ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN || "https://aaron-website.onrender.com";
// const PREFIX = process.env.NEXT_PUBLIC_API_PREFIX || "/api";

// export const API_BASE = `${ORIGIN}${PREFIX}`; // 例: http://.../api
export const ROOT_BASE = `${ORIGIN}`;         // 例: http://.../

import axios from "axios";

// export const api = axios.create({
//   baseURL: API_BASE,
//   withCredentials: true,
// });

export const rootApi = axios.create({
  baseURL: ROOT_BASE,
  withCredentials: true,
});

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  // 組合 URL：若 endpoint 已包含前導 '/' 則直接串接，否則補上 '/'
  const url = endpoint.startsWith("/") ? `${ROOT_BASE}${endpoint}` : `${ROOT_BASE}/${endpoint}`;
  const res = await fetch(url, {
    ...options,
    credentials: "include",
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
};

// Allow using `${apiFetch}` or `${rootApi}` inside template strings: coerce to ROOT_BASE
try {
  (apiFetch as any)[Symbol.toPrimitive] = () => ROOT_BASE;
  (apiFetch as any).toString = () => ROOT_BASE;
  (apiFetch as any).valueOf = () => ROOT_BASE;
} catch (e) {
  // noop
}

try {
  (rootApi as any)[Symbol.toPrimitive] = () => ROOT_BASE;
  (rootApi as any).toString = () => ROOT_BASE;
  (rootApi as any).valueOf = () => ROOT_BASE;
} catch (e) {
  // noop
}