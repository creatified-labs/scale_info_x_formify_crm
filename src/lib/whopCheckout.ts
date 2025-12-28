import { detectWhopContext } from "./embed";

type PlanOption = "solo" | "pro";

export const openWhopCheckout = async (plan: PlanOption) => {
  const response = await fetch("/api/whop/create-checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ plan }),
  });

  if (!response.ok) {
    console.error("Failed to create checkout", await response.text());
    return false;
  }

  const payload = await response.json();
  if (!payload?.url) {
    console.error("Checkout response missing URL");
    return false;
  }

  const newWindow = window.open(payload.url, "_blank", "noopener,noreferrer");
  if (!newWindow && !detectWhopContext()) {
    window.location.href = payload.url;
  }

  return true;
};
