export const loginDtoMock = {
  email: 'john@test.com',
  password: '123456',
};

export const mockRole = {
  name: 'admin',
  permissions: ['manage_users'],
};

export const mockUser = {
  _id: '1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@test.com',
  password: 'hashedPassword',
  isActive: true,
  role: mockRole,
  currentToken: null,
  tokenExpiresAt: null,
  image: null,
};
