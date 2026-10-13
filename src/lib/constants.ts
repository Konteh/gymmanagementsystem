export const DEMO_PASSWORD = "gymflow-demo";

export const COOKIE_ACCESS = "gf_access";
export const COOKIE_REFRESH = "gf_refresh";

export const ACCESS_TTL_SECONDS = 60 * 60 * 8;
export const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 7;

export const JWT_SECRET =
  process.env.JWT_SECRET ?? "gymflow-dev-secret-change-me";

export const WEBHOOK_SECRET =
  process.env.PAYMENT_WEBHOOK_SECRET ?? "gymflow-demo-webhook";

export const PLATFORM_FEE_DEFAULT = 49;

export const IDS = {
  superAdmin: "11111111-1111-4111-8111-111111111111",
  ironforgeOwner: "22222222-2222-4222-8222-222222222222",
  ironforgeGym: "33333333-3333-4333-8333-333333333333",
  peakOwner: "44444444-4444-4444-8444-444444444444",
  peakGym: "55555555-5555-4555-8555-555555555555",
  harborOwner: "66666666-6666-4666-8666-666666666666",
  harborGym: "77777777-7777-4777-8777-777777777777",
  northsideOwner: "88888888-8888-4888-8888-888888888888",
  northsideGym: "99999999-9999-4999-8999-999999999999",
  jordan: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  staffKai: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
} as const;
