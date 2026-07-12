export function safeReturnTo(value: string | null | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/scan";
  try {
    const base = new URL("https://equipqr.internal");
    const target = new URL(value, base);
    return target.origin === base.origin ? `${target.pathname}${target.search}${target.hash}` : "/scan";
  } catch { return "/scan"; }
}
