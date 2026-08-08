import { Catch, HttpException, HttpStatus } from '@nestjs/common';

/**
 * Converts every thrown error into an RFC 7807 problem+json body
 * (docs/06-lld.md §12 / docs/08-api-contracts.md error shape).
 */
@Catch()
export class AllExceptionsFilter {
  catch(exception, host) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = isHttpException ? exception.getResponse() : null;

    const detail =
      typeof body === 'string'
        ? body
        : body && typeof body === 'object' && 'message' in body
          ? Array.isArray(body.message)
            ? body.message.join('; ')
            : body.message
          : 'Internal server error';

    const title = isHttpException
      ? exception.constructor.name.replace(/Exception$/, '')
      : 'InternalServerError';

    if (!isHttpException) {
      // Unexpected errors are logged server-side but never leak a stack trace to the client.
      console.error(exception);
    }

    response.status(status).json({
      type: `https://humble.app/errors/${title.toLowerCase()}`,
      title,
      status,
      detail,
      instance: request.originalUrl,
      requestId: request.id,
    });
  }
}
