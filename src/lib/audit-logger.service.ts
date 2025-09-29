import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from './entities/audit-log.entity';
import {
  AuditLogData,
  AuditLoggerModuleOptions,
  AUDIT_LOGGER_OPTIONS,
} from './interfaces/audit-logger.interface';

@Injectable()
export class AuditLoggerService {
  private readonly logger = new Logger(AuditLoggerService.name);

  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
    @Inject(AUDIT_LOGGER_OPTIONS)
    private readonly options: AuditLoggerModuleOptions,
  ) {}

  /**
   * Save audit log data to the database
   * @param auditData The audit log data to save
   */
  async saveAuditLog(auditData: AuditLogData): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        timestamp: auditData.timestamp,
        userId: auditData.userId,
        userEmail: auditData.userEmail,
        httpMethod: auditData.httpMethod,
        endpoint: auditData.endpoint,
        serviceName: auditData.serviceName,
        actionDescription: auditData.actionDescription,
        requestData: auditData.requestData,
        responseData: auditData.responseData,
        userAgent: auditData.userAgent,
        ipAddress: auditData.ipAddress,
        token: auditData.token,
        statusCode: auditData.statusCode,
        executionTimeMs: auditData.executionTimeMs,
      });

      await this.auditLogRepository.save(auditLog);

      if (this.options.logLevel === 'debug') {
        this.logger.debug(
          `Audit log saved: ${auditData.httpMethod} ${auditData.endpoint} - ${auditData.statusCode}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to save audit log: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Don't throw the error to avoid breaking the main application flow
      // Audit logging should be non-blocking
    }
  }

  /**
   * Retrieve audit logs with filtering and pagination
   * @param filters Filter criteria
   * @param options Pagination and sorting options
   */
  async getAuditLogs(
    filters: {
      userId?: string;
      serviceName?: string;
      httpMethod?: string;
      statusCode?: number;
      startDate?: Date;
      endDate?: Date;
      endpoint?: string;
    } = {},
    options: {
      page?: number;
      limit?: number;
      sortBy?: keyof AuditLogEntity;
      sortOrder?: 'ASC' | 'DESC';
    } = {},
  ): Promise<{ data: AuditLogEntity[]; total: number; page: number; limit: number }> {
    const queryBuilder = this.auditLogRepository.createQueryBuilder('audit');

    // Apply filters
    if (filters.userId) {
      queryBuilder.andWhere('audit.userId = :userId', { userId: filters.userId });
    }

    if (filters.serviceName) {
      queryBuilder.andWhere('audit.serviceName = :serviceName', {
        serviceName: filters.serviceName,
      });
    }

    if (filters.httpMethod) {
      queryBuilder.andWhere('audit.httpMethod = :httpMethod', {
        httpMethod: filters.httpMethod,
      });
    }

    if (filters.statusCode) {
      queryBuilder.andWhere('audit.statusCode = :statusCode', {
        statusCode: filters.statusCode,
      });
    }

    if (filters.endpoint) {
      queryBuilder.andWhere('audit.endpoint ILIKE :endpoint', {
        endpoint: `%${filters.endpoint}%`,
      });
    }

    if (filters.startDate) {
      queryBuilder.andWhere('audit.timestamp >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      queryBuilder.andWhere('audit.timestamp <= :endDate', {
        endDate: filters.endDate,
      });
    }

    // Apply sorting
    const sortBy = options.sortBy || 'timestamp';
    const sortOrder = options.sortOrder || 'DESC';
    queryBuilder.orderBy(`audit.${sortBy}`, sortOrder);

    // Apply pagination
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    // Execute query
    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Get audit log statistics
   */
  async getAuditStatistics(
    filters: {
      startDate?: Date;
      endDate?: Date;
      serviceName?: string;
    } = {},
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageExecutionTime: number;
    topEndpoints: { endpoint: string; count: number }[];
    topUsers: { userId: string; count: number }[];
  }> {
    const queryBuilder = this.auditLogRepository.createQueryBuilder('audit');

    // Apply date filters
    if (filters.startDate) {
      queryBuilder.andWhere('audit.timestamp >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      queryBuilder.andWhere('audit.timestamp <= :endDate', {
        endDate: filters.endDate,
      });
    }

    if (filters.serviceName) {
      queryBuilder.andWhere('audit.serviceName = :serviceName', {
        serviceName: filters.serviceName,
      });
    }

    // Get total requests
    const totalRequests = await queryBuilder.getCount();

    // Get successful requests (2xx status codes)
    const successfulRequests = await queryBuilder
      .clone()
      .andWhere('audit.statusCode >= 200 AND audit.statusCode < 300')
      .getCount();

    // Get failed requests (4xx and 5xx status codes)
    const failedRequests = await queryBuilder
      .clone()
      .andWhere('audit.statusCode >= 400')
      .getCount();

    // Get average execution time
    const avgResult = await queryBuilder
      .clone()
      .select('AVG(audit.executionTimeMs)', 'avg')
      .getRawOne();
    const averageExecutionTime = parseFloat(avgResult?.avg || '0');

    // Get top endpoints
    const topEndpoints = await queryBuilder
      .clone()
      .select('audit.endpoint', 'endpoint')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.endpoint')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    // Get top users
    const topUsers = await queryBuilder
      .clone()
      .select('audit.userId', 'userId')
      .addSelect('COUNT(*)', 'count')
      .where('audit.userId IS NOT NULL')
      .groupBy('audit.userId')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageExecutionTime,
      topEndpoints: topEndpoints.map(item => ({
        endpoint: item.endpoint,
        count: parseInt(item.count),
      })),
      topUsers: topUsers.map(item => ({
        userId: item.userId,
        count: parseInt(item.count),
      })),
    };
  }

  /**
   * Delete old audit logs based on retention policy
   * @param retentionDays Number of days to retain logs (default: 90 days)
   */
  async cleanupOldAuditLogs(retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await this.auditLogRepository
        .createQueryBuilder()
        .delete()
        .where('timestamp < :cutoffDate', { cutoffDate })
        .execute();

      const deletedCount = result.affected || 0;

      this.logger.log(
        `Cleaned up ${deletedCount} audit logs older than ${retentionDays} days`,
      );

      return deletedCount;
    } catch (error) {
      this.logger.error(
        `Failed to cleanup old audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Get audit logs count by date range
   */
  async getAuditLogsCount(startDate?: Date, endDate?: Date): Promise<number> {
    const queryBuilder = this.auditLogRepository.createQueryBuilder('audit');

    if (startDate) {
      queryBuilder.andWhere('audit.timestamp >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('audit.timestamp <= :endDate', { endDate });
    }

    return await queryBuilder.getCount();
  }
}