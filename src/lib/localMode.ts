const getWindow = () => (typeof window !== "undefined" ? window : undefined);

export function isLocalMode(): boolean {
  if (process.env.NEXT_PUBLIC_LOCAL_MODE === "true") return true;
  if (process.env.NEXT_PUBLIC_LOCAL_MODE === "false") return false;
  return false;
}
