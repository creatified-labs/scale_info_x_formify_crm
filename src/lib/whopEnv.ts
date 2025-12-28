import { WhopEnv, WhopEnvStore } from "@whop-apps/core";

const appId = process.env.NEXT_PUBLIC_WHOP_APP_ID;

if (typeof window !== "undefined" && appId) {
  WhopEnvStore.set({
    [WhopEnv.APP_ID]: appId,
  });
}
