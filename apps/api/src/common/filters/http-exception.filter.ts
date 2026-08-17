import { Catch, ExceptionFilter, ArgumentsHost, HttpException } from '@nestjs/common';
import { AppError } from '../errors/app-error';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception instanceof AppError) {
      response.status(exception.statusCode).json({
        error: {
          code: exception.code,
          message: exception.message,
          details: exception.details,
        },
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      response.status(status).json(
        typeof res === 'string'
          ? { error: { code: 'HTTP_ERROR', message: res } }
          : res,
      );
      return;
    }

    console.error('Unhandled exception:', exception);
    response.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
      },
    });
  }
}
