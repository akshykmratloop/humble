import { v4 as uuidv4 } from 'uuid';

/**
 * Functional Express middleware: assigns/propagates a request correlation ID
 * (docs/05-hld.md §5) so every log line and error response can be traced back
 * to a single request.
 */
export function correlationIdMiddleware(req, res, next) {
  const incoming = req.headers['x-request-id'];
  req.id = typeof incoming === 'string' && incoming.length > 0 ? incoming : uuidv4();
  res.setHeader('x-request-id', req.id);
  next();
}
