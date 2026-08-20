import type { Request, Response } from 'express';
import * as checkinService from './checkin.service.ts';
import type { CheckinInput } from './checkin.schemas.ts';

export async function checkIn(req: Request, res: Response): Promise<void> {
  const result = await checkinService.checkIn(req.body as CheckinInput);

  // Every outcome is a successful validation attempt, including the rejections.
  res.status(200).json(result);
}
