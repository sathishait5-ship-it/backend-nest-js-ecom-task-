import { Injectable, NestMiddleware, Logger } from '@nestjs/common';

import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CorsMiddleware implements NestMiddleware {
  private readonly logger = new Logger('API_Request_Log');

  use(req: Request, res: Response, next: NextFunction) {
    // API Logs
    this.logger.log(`${req.method} ${req.originalUrl}`);

    // Allowed Origins
    const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173'];

    const origin = req.headers.origin;

    // Allow Only Configured Origins
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }

    // Allowed HTTP Methods
    res.header(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    );

    // Allowed Headers
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    );

    // Allow Credentials
    res.header('Access-Control-Allow-Credentials', 'true');

    // Handle Preflight Requests
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    next();
  }
}
