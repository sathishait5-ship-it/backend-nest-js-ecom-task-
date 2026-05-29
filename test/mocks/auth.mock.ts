export const mockJwtService = {
  signAsync: jest.fn(),
};

export const mockUserModel = {
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
};
