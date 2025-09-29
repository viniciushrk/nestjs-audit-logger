import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AuditLoggerService } from './audit-logger.service';
import { getAuditLogOptions, isAuditLogEnabled } from './decorators/audit-log.decorator';
import {
  AuditLoggerModuleOptions,
  AUDIT_LOGGER_OPTIONS,
  TokenExtractionResult,
  RequestInfo,
  ResponseInfo,
  AuditLogData,
} from './interfaces/audit-logger.interface';

@Injectable()
export class AuditLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLoggerInterceptor.name);

  constructor(
    private readonly auditService: AuditLoggerService,
    @Inject(AUDIT_LOGGER_OPTIONS)
    private readonly options: AuditLoggerModuleOptions,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();

    // Only process if the handler has @AuditLog decorator
    if (!isAuditLogEnabled(handler)) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();
    const timestamp = new Date();

    // Check if route should be excluded
    if (this.shouldExcludeRoute(request.url)) {
      return next.handle();
    }

    const auditOptions = getAuditLogOptions(handler) || {};
    const requestInfo = this.extractRequestInfo(request);
    const tokenInfo = this.extractTokenInfo(request);

    return next.handle().pipe(
      tap((responseData) => {
        const executionTime = Date.now() - startTime;
        const responseInfo: ResponseInfo = {
          statusCode: response.statusCode,
          data: responseData,
        };

        // Create audit log asynchronously to avoid blocking the response
        setImmediate(() => {
          this.createAuditLog(
            timestamp,
            requestInfo,
            responseInfo,
            tokenInfo,
            executionTime,
            auditOptions,
          );
        });
      }),
      catchError((error) => {
        const executionTime = Date.now() - startTime;
        const responseInfo: ResponseInfo = {
          statusCode: error.status || 500,
          data: error.message,
        };

        // Create audit log for errors as well
        setImmediate(() => {
          this.createAuditLog(
            timestamp,
            requestInfo,
            responseInfo,
            tokenInfo,
            executionTime,
            auditOptions,
          );
        });

        throw error;
      }),
    );
  }

  private shouldExcludeRoute(url: string): boolean {
    if (!this.options.excludeRoutes) return false;

    return this.options.excludeRoutes.some(route => {
      if (route.includes('*')) {
        const pattern = route.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(url);
      }
      return url.startsWith(route);
    });
  }

  private extractRequestInfo(request: Request): RequestInfo {
    return {
      method: request.method,
      url: request.url,
      headers: request.headers as Record<string, string>,
      query: request.query as Record<string, any>,
      body: request.body,
      ip: this.extractRealIp(request),
      userAgent: request.get('User-Agent') || '',
    };
  }

  private extractRealIp(request: Request): string {
    // Extract real IP considering proxies
    const forwarded = request.get('X-Forwarded-For');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    return (
      request.get('X-Real-IP') ||
      request.get('X-Client-IP') ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      'unknown'
    );
  }

  private extractTokenInfo(request: Request): TokenExtractionResult {
    let token: string | undefined;
    let userId: string | undefined;
    let userEmail: string | undefined;

    // Use custom token extractor if provided
    if (this.options.customTokenExtractor) {
      token = this.options.customTokenExtractor(request);
    } else {
      token = this.extractTokenFromRequest(request);
    }

    if (token) {
      // Use custom extractors if provided
      if (this.options.customUserIdExtractor) {
        userId = this.options.customUserIdExtractor(token);
      } else {
        userId = this.extractUserIdFromCustomToken(token);
      }

      if (this.options.customUserEmailExtractor) {
        userEmail = this.options.customUserEmailExtractor(token);
      } else {
        userEmail = this.extractEmailFromCustomToken(token);
      }
    }

    return { token, userId, userEmail };
  }

  private extractTokenFromRequest(request: Request): string | undefined {
    // 1. Authorization header (Bearer token)
    const authHeader = request.get('Authorization');
    if (authHeader) {
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      if (match) {
        return match[1];
      }
      // If not Bearer, return the whole auth header value
      return authHeader;
    }

    // 2. Custom headers
    const customHeaders = [
      'x-api-token',
      'x-auth-token',
      'x-access-token',
      'api-key',
      'apikey',
    ];

    for (const header of customHeaders) {
      const value = request.get(header);
      if (value) {
        return value;
      }
    }

    // 3. Query parameters
    const queryParams = ['token', 'apikey', 'api_key', 'access_token'];
    for (const param of queryParams) {
      const value = request.query[param] as string;
      if (value) {
        return value;
      }
    }

    return undefined;
  }

  private extractUserIdFromCustomToken(token: string): string | undefined {
    try {
      // For JWT tokens, try to decode (without verification)
      if (token.includes('.')) {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(
            Buffer.from(parts[1], 'base64url').toString(),
          );
          return payload.sub || payload.userId || payload.id || payload.user_id;
        }
      }

      // For custom tokens, try to parse as JSON
      if (token.startsWith('{')) {
        const parsed = JSON.parse(token);
        return parsed.userId || parsed.id || parsed.user_id || parsed.sub;
      }

      // For simple string tokens, could be the user ID itself
      // This is a fallback - customize based on your token format
      return undefined;
    } catch (error) {
      this.logger.debug(`Failed to extract user ID from token: ${error.message}`);
      return undefined;
    }
  }

  private extractEmailFromCustomToken(token: string): string | undefined {
    try {
      // For JWT tokens, try to decode (without verification)
      if (token.includes('.')) {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(
            Buffer.from(parts[1], 'base64url').toString(),
          );
          return payload.email || payload.user_email || payload.userEmail;
        }
      }

      // For custom tokens, try to parse as JSON
      if (token.startsWith('{')) {
        const parsed = JSON.parse(token);
        return parsed.email || parsed.user_email || parsed.userEmail;
      }

      return undefined;
    } catch (error) {
      this.logger.debug(`Failed to extract email from token: ${error.message}`);
      return undefined;
    }
  }

  private async createAuditLog(
    timestamp: Date,
    requestInfo: RequestInfo,
    responseInfo: ResponseInfo,
    tokenInfo: TokenExtractionResult,
    executionTime: number,
    auditOptions: any,
  ): Promise<void> {
    try {
      const shouldLogRequestBody =
        auditOptions.logRequestBody ?? this.options.logRequestBody ?? false;
      const shouldLogResponseBody =
        auditOptions.logResponseBody ?? this.options.logResponseBody ?? false;

      const auditData: AuditLogData = {
        timestamp,
        userId: tokenInfo.userId,
        userEmail: tokenInfo.userEmail,
        httpMethod: requestInfo.method,
        endpoint: requestInfo.url,
        serviceName: auditOptions.serviceName,
        actionDescription: auditOptions.description,
        requestData: shouldLogRequestBody ? {
          body: requestInfo.body,
          query: requestInfo.query,
          headers: this.sanitizeHeaders(requestInfo.headers),
        } : undefined,
        responseData: shouldLogResponseBody ? responseInfo.data : undefined,
        userAgent: requestInfo.userAgent,
        ipAddress: requestInfo.ip,
        token: tokenInfo.token,
        statusCode: responseInfo.statusCode,
        executionTimeMs: executionTime,
      };

      await this.auditService.saveAuditLog(auditData);
    } catch (error) {
      this.logger.error(
        `Failed to save audit log: ${error.message}`,
        error.stack,
      );
    }
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized = { ...headers };

    // Remove sensitive headers
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-token',
      'x-auth-token',
      'x-access-token',
      'api-key',
      'apikey',
    ];

    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
      if (sanitized[header.toLowerCase()]) {
        sanitized[header.toLowerCase()] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}