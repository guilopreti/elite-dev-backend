import { prisma } from '../../config/prisma.ts';
import type { Role } from '../../types/auth.ts';

export interface CreateUserData {
  name: string;
  email: string;
  password_hash: string;
  role: Role;
}

export async function findByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function create(data: CreateUserData) {
  return prisma.user.create({ data });
}
