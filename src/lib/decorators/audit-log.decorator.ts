import { SetMetadata } from '@nestjs/common';
import 'reflect-metadata';
import { AuditLogOptions, AUDIT_LOG_METADATA } from '../interfaces/audit-logger.interface';

/**
 * Decorator to mark endpoints for audit logging
 * Only endpoints with this decorator will be audited by the AuditLoggerInterceptor
 *
 * @param options Configuration options for audit logging
 * @example
 * ```typescript
 * @Post('users')
 * @AuditLog({
 *   serviceName: 'UsersService',
 *   description: 'Create new user',
 *   logRequestBody: true,
 *   logResponseBody: false
 * })
 * createUser(@Body() userData: CreateUserDto) {
 *   return this.usersService.create(userData);
 * }
 * ```
 */
export const AuditLog = (options: AuditLogOptions = {}): MethodDecorator => {
  return SetMetadata(AUDIT_LOG_METADATA, options);
};

/**
 * Helper function to check if a handler has the AuditLog decorator
 * @param handler The route handler function
 * @returns true if the handler is decorated with @AuditLog
 */
export const isAuditLogEnabled = (handler: Function): boolean => {
  return Reflect.hasMetadata(AUDIT_LOG_METADATA, handler);
};

/**
 * Helper function to get AuditLog options from a handler
 * @param handler The route handler function
 * @returns AuditLogOptions if decorated, undefined otherwise
 */
export const getAuditLogOptions = (handler: Function): AuditLogOptions | undefined => {
  return Reflect.getMetadata(AUDIT_LOG_METADATA, handler);
};