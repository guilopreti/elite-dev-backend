import type { Request, Response } from 'express';
import { getAuthUser } from '../../middlewares/authenticate.ts';
import type { CreatePaymentInput } from './payments.schemas.ts';
import * as paymentsService from './payments.service.ts';

export async function create(req: Request, res: Response): Promise<void> {
  const { userId } = getAuthUser(req);
  const result = await paymentsService.processPayment(req.body as CreatePaymentInput, userId);

  // Both outcomes are successful transactions — a decline is a business result,
  // not an HTTP error.
  res.status(200).json(result);
}
