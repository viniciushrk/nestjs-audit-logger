import { Controller, Get, Post, Body, UseInterceptors } from '@nestjs/common';
import { AuditLoggerService } from './audit-logger.service';
import { AuditLoggerInterceptor } from './audit-logger.interceptor';
import { AuditLog } from './decorators/audit-log.decorator';

@Controller('audit-diagnostic')
export class AuditLoggerDiagnosticController {
  constructor(private readonly auditService: AuditLoggerService) {}

  /**
   * Health check do sistema de auditoria
   * GET /audit-diagnostic/health
   */
  @Get('health')
  async checkHealth() {
    const result = await this.auditService.testConnection();

    return {
      status: result.connected && result.tableExists && result.canWrite ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
      details: result,
      recommendations: this.generateRecommendations(result),
    };
  }

  /**
   * Teste de auditoria simples
   * POST /audit-diagnostic/test-simple
   */
  @Post('test-simple')
  @UseInterceptors(AuditLoggerInterceptor)
  @AuditLog({
    serviceName: 'AuditDiagnostic',
    description: 'Teste simples de auditoria',
    logRequestBody: true,
    logResponseBody: true,
  })
  async testSimple(@Body() data: any) {
    return {
      message: 'Teste de auditoria executado',
      timestamp: new Date(),
      receivedData: data,
      status: 'success',
    };
  }

  /**
   * Teste de auditoria com erro simulado
   * POST /audit-diagnostic/test-error
   */
  @Post('test-error')
  @UseInterceptors(AuditLoggerInterceptor)
  @AuditLog({
    serviceName: 'AuditDiagnostic',
    description: 'Teste de auditoria com erro',
    logRequestBody: true,
    logResponseBody: false,
  })
  async testError(@Body() data: { shouldFail?: boolean }) {
    if (data?.shouldFail) {
      throw new Error('Erro simulado para teste de auditoria');
    }

    return {
      message: 'Teste sem erro',
      timestamp: new Date(),
    };
  }

  /**
   * Endpoint sem auditoria (para comparação)
   * GET /audit-diagnostic/no-audit
   */
  @Get('no-audit')
  async noAudit() {
    return {
      message: 'Este endpoint não possui auditoria',
      timestamp: new Date(),
      note: 'Não deveria aparecer logs de auditoria para esta requisição',
    };
  }

  /**
   * Estatísticas dos logs de auditoria
   * GET /audit-diagnostic/stats
   */
  @Get('stats')
  async getStats() {
    try {
      const total = await this.auditService.getAuditLogsCount();
      const recent = await this.auditService.getAuditLogsCount(
        new Date(Date.now() - 24 * 60 * 60 * 1000) // últimas 24h
      );

      const recentLogs = await this.auditService.getAuditLogs(
        {},
        { limit: 10, sortBy: 'timestamp', sortOrder: 'DESC' }
      );

      return {
        totalLogs: total,
        last24Hours: recent,
        recentLogs: recentLogs.data,
        lastUpdate: new Date(),
      };
    } catch (error) {
      return {
        error: 'Failed to get stats',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Teste direto de salvamento no banco
   * POST /audit-diagnostic/test-direct-save
   */
  @Post('test-direct-save')
  async testDirectSave(@Body() data: any) {
    const testData = {
      timestamp: new Date(),
      httpMethod: 'POST',
      endpoint: '/audit-diagnostic/test-direct-save',
      serviceName: 'AuditDiagnosticDirect',
      actionDescription: 'Teste direto de salvamento',
      requestData: data,
      statusCode: 200,
      executionTimeMs: 0,
    };

    const result = await this.auditService.saveAuditLogWithDiagnostics(testData);

    return {
      message: 'Teste direto de salvamento',
      result,
      timestamp: new Date(),
    };
  }

  private generateRecommendations(result: any): string[] {
    const recommendations: string[] = [];

    if (result.error && result.error.includes('not registered in TypeORM')) {
      recommendations.push('❌ PROBLEMA ENCONTRADO: AuditLogEntity não está registrada no TypeORM');
      recommendations.push('🔧 SOLUÇÃO: Adicione AuditLogEntity ao array de entities');
      recommendations.push('💻 CÓDIGO: import { AuditLogEntity } from "@viniciushrk/nestjs-audit-logger"');
      recommendations.push('💻 CÓDIGO: entities: [...yourEntities, AuditLogEntity]');
      return recommendations;
    }

    if (!result.connected) {
      recommendations.push('❌ Verificar configuração do TypeORM e conexão com PostgreSQL');
      recommendations.push('❌ Verificar se o AuditLoggerModule foi importado corretamente');
    }

    if (!result.tableExists) {
      recommendations.push('❌ Executar a migration SQL para criar a tabela audit_logs');
      recommendations.push('📋 SQL: CREATE TABLE audit_logs (...)');
    }

    if (!result.canWrite) {
      recommendations.push('❌ Verificar permissões de escrita no banco de dados');
      recommendations.push('❌ Verificar se a entidade AuditLogEntity está configurada corretamente');
    }

    if (result.connected && result.tableExists && result.canWrite) {
      recommendations.push('✅ Sistema de auditoria funcionando corretamente');
      recommendations.push('💡 Para debugar logs, configure logLevel: "debug" no módulo');
      recommendations.push('💡 Use @AuditLog() nos endpoints que deseja auditar');
    }

    return recommendations;
  }
}