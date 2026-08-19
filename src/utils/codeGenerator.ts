import { customAlphabet } from 'nanoid';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const nanoid = customAlphabet(ALPHABET, 10);

export function generateTicketCode(): string {
  return `TK-${nanoid()}`;
}
