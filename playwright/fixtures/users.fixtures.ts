export type TestUser = {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  password: string;
  otp: string;
  storageStatePath: string;
};

export const TEST_USERS = {
  user1: {
    id: 'user1',
    email: 'call1+clerk_test@linky.now',
    password: 'Call1@2003',
    otp: '424242',
    storageStatePath: 'playwright/.auth/user1.json',
  },
  user2: {
    id: 'user2',
    email: 'call2+clerk_test@linky.now',
    password: 'Call2@2003',
    otp: '424242',
    storageStatePath: 'playwright/.auth/user2.json',
  },
  user3: {
    id: 'user3',
    email: 'invalid-email',
    password: 'invalid-password',
    otp: 'invalid-otp',
    storageStatePath: 'playwright/.auth/user3.json',
  },
  user4: {
    id: 'user4',
    email: 'wrong+clerk_test@linky.now',
    password: 'Wrong@2003',
    otp: '424242',
    storageStatePath: 'playwright/.auth/user4.json',
  },
  user5: {
    id: 'user5',
    email: 'user5+clerk_test@linky.now',
    password: 'Call5@2003',
    otp: '424242',
    storageStatePath: 'playwright/.auth/user5.json',
  },
  user6: {
    id: 'user6',
    email: 'user6+clerk_test@linky.now',
    password: '12345678',
    otp: '424242',
    storageStatePath: 'playwright/.auth/user6.json',
  },
  user7: {
    id: 'user7',
    email: 'user7+clerk_test@linky.now',
    firstName: 'User',
    lastName: '7',
    password: 'User7@2003',
    otp: '424242',
    storageStatePath: 'playwright/.auth/user7.json',
  },
} as const;

