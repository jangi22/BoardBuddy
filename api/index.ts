import type { IncomingMessage, ServerResponse } from 'http';
import app from '../server.js';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    return app(req as any, res as any);
  } catch (err: any) {
    console.error('[Vercel API Handler Error]:', err);
    if (!res.headersSent) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      const message =
        typeof err?.message === 'string' && err.message.trim()
          ? err.message
          : 'API service is temporarily unavailable.';
      res.end(
        JSON.stringify({
          success: false,
          code: 'SERVER_HANDLER_ERROR',
          error: message,
        })
      );
    }
  }
}
