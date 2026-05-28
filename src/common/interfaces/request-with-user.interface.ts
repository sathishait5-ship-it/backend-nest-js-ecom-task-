import { Request } from 'express';

export interface UserRole {
  name: string;

  permissions: string[];
}

export interface AuthUser {
  _id: string;

  email: string;

  role: UserRole;
}

export interface RequestWithUser extends Request {
  user: AuthUser;
}
