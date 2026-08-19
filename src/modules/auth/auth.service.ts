import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.ts';
import { ConflictError, UnauthorizedError } from '../../middlewares/errorHandler.ts';
import * as usersRepository from '../users/users.repository.ts';
import type { LoginInput, RegisterInput } from './auth.schemas.ts';

const BCRYPT_ROUNDS = 10;
const JWT_EXPIRES_IN = '24h';

function toPublicUser(user: { id: string; name: string; email: string; role: string }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function register(input: RegisterInput) {
  const password_hash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  try {
    const user = await usersRepository.create({
      name: input.name,
      email: input.email,
      password_hash,
      role: input.role,
    });

    return toPublicUser(user);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictError('Email already in use');
    }

    throw err;
  }
}

export async function login(input: LoginInput) {
  const user = await usersRepository.findByEmail(input.email);

  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const passwordMatches = await bcrypt.compare(input.password, user.password_hash);

  if (!passwordMatches) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );

  return { token };
}
