import { readClerkTestUserRows } from "../test-data/excel";

export type TestUser = {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  password: string;
  otp: string;
  storageStatePath: string;
};

const TEST_USER_KEYS = [
  "user1",
  "user2",
  "user3",
  "user4",
  "user5",
  "user6",
  "user7",
] as const;

export type TestUsersRegistry = {
  [K in (typeof TEST_USER_KEYS)[number]]: TestUser;
};

function buildTestUsersRegistry(): TestUsersRegistry {
  const rows = readClerkTestUserRows();
  const byId = new Map<string, TestUser>();
  for (const r of rows) {
    byId.set(r.id, {
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      password: r.password,
      otp: r.otp,
      storageStatePath: r.storageStatePath,
    });
  }
  const out = {} as TestUsersRegistry;
  for (const key of TEST_USER_KEYS) {
    const u = byId.get(key);
    if (!u) {
      throw new Error(
        `Missing row with id "${key}" in playwright/test-data/data_test_users.xlsx`,
      );
    }
    out[key] = u;
  }
  return out;
}

export const TEST_USERS: TestUsersRegistry = buildTestUsersRegistry();
