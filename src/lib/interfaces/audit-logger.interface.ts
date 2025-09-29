import { ModuleMetadata, Type } from '@nestjs/common';

export interface AuditLogConfig {
  logRequestBody?: boolean;
  logResponseBody?: boolean;
  excludeRoutes?: string[];
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  database?: {
    connection?: string;
  };
  customTokenExtractor?: (request: any) => string | undefined;
  customUserIdExtractor?: (token: string) => string | undefined;
  customUserEmailExtractor?: (token: string) => string | undefined;
}

export interface AuditLogOptions {
  serviceName?: string;
  description?: string;
  logRequestBody?: boolean;
  logResponseBody?: boolean;
}

export interface AuditLogData {
  timestamp: Date;
  userId?: string;
  userEmail?: string;
  httpMethod: string;
  endpoint: string;
  serviceName?: string;
  actionDescription?: string;
  requestData?: any;
  responseData?: any;
  userAgent?: string;
  ipAddress?: string;
  token?: string;
  statusCode?: number;
  executionTimeMs?: number;
}

export interface AuditLoggerModuleOptions {
  logRequestBody?: boolean;
  logResponseBody?: boolean;
  excludeRoutes?: string[];
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  database?: {
    connection?: string;
  };
  customTokenExtractor?: (request: any) => string | undefined;
  customUserIdExtractor?: (token: string) => string | undefined;
  customUserEmailExtractor?: (token: string) => string | undefined;
}

export interface AuditLoggerModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<AuditLoggerOptionsFactory>;
  useClass?: Type<AuditLoggerOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<AuditLoggerModuleOptions> | AuditLoggerModuleOptions;
  inject?: any[];
}

export interface AuditLoggerOptionsFactory {
  createAuditLoggerOptions(): Promise<AuditLoggerModuleOptions> | AuditLoggerModuleOptions;
}

export interface TokenExtractionResult {
  token?: string;
  userId?: string;
  userEmail?: string;
}

export interface RequestInfo {
  method: string;
  url: string;
  headers: Record<string, string>;
  query: Record<string, any>;
  body?: any;
  ip: string;
  userAgent: string;
}

export interface ResponseInfo {
  statusCode: number;
  data?: any;
}

export const AUDIT_LOGGER_OPTIONS = 'AUDIT_LOGGER_OPTIONS';
export const AUDIT_LOG_METADATA = 'audit-log-metadata';