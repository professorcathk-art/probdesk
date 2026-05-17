export const CURRENT_STATUS_KEYS = ["exploring", "ready_to_build", "fully_committed"] as const;
export type CurrentStatusKey = (typeof CURRENT_STATUS_KEYS)[number];
