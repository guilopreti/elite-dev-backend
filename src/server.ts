import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.ts';
import { errorHandler } from './middlewares/errorHandler.ts';
import { router } from './routes/index.ts';

export const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use('/api/v1', router);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Server listening on port ${env.PORT}`);
});
