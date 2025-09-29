# 🔧 Troubleshooting - NestJS Audit Logger

## 🚀 Versão 1.1.0 com Sistema de Diagnóstico

A versão 1.1.0 inclui ferramentas de diagnóstico para identificar exatamente por que os logs não estão sendo salvos.

## 🔍 1. Ativar Endpoints de Diagnóstico

```typescript
// app.module.ts
AuditLoggerModule.forRoot({
  logRequestBody: true,
  logLevel: 'debug', // 👈 IMPORTANTE: ativar logs detalhados
  enableDiagnosticEndpoints: true, // 👈 NOVO: endpoints de diagnóstico
})
```

## 🩺 2. Testar o Sistema de Auditoria

### 2.1 Health Check
```bash
GET http://localhost:3000/audit-diagnostic/health
```

**Resposta esperada:**
```json
{
  "status": "healthy",
  "details": {
    "connected": true,
    "tableExists": true,
    "canWrite": true
  },
  "recommendations": [
    "✅ Sistema de auditoria funcionando corretamente"
  ]
}
```

### 2.2 Teste Simples
```bash
POST http://localhost:3000/audit-diagnostic/test-simple
Content-Type: application/json

{"test": "data"}
```

### 2.3 Verificar Logs
```bash
GET http://localhost:3000/audit-diagnostic/stats
```

## ❌ 3. Problemas Comuns e Soluções

### 3.1 "Repository not available"
**Problema:** TypeORM não foi configurado corretamente

**Solução:**
```typescript
// Verificar se TypeOrmModule está importado ANTES do AuditLoggerModule
@Module({
  imports: [
    TypeOrmModule.forRoot({
      // config postgres
    }),
    AuditLoggerModule.forRoot({
      // config audit
    }),
  ],
})
```

### 3.2 "Table audit_logs does not exist"
**Problema:** Tabela não foi criada

**Solução:** Execute a migration SQL:
```sql
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    user_id VARCHAR(255),
    user_email VARCHAR(255),
    http_method VARCHAR(10) NOT NULL,
    endpoint TEXT NOT NULL,
    service_name VARCHAR(255),
    action_description TEXT,
    request_data JSONB,
    response_data JSONB,
    user_agent TEXT,
    ip_address INET,
    token TEXT,
    status_code INTEGER,
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_timestamp ON audit_logs (timestamp);
CREATE INDEX idx_audit_logs_user_id ON audit_logs (user_id);
```

### 3.3 "No @AuditLog decorator found"
**Problema:** Endpoint não tem decorator

**Solução:**
```typescript
@Controller('users')
@UseInterceptors(AuditLoggerInterceptor) // 👈 Interceptor necessário
export class UsersController {

  @Post()
  @AuditLog({ serviceName: 'UsersService' }) // 👈 Decorator necessário
  create(@Body() data: any) {}
}
```

### 3.4 "Database connection not initialized"
**Problema:** PostgreSQL não conectado

**Verificar:**
- Servidor PostgreSQL rodando
- Credenciais corretas
- Rede acessível

## 🔍 4. Logs de Debug

Com `logLevel: 'debug'`, você verá logs como:

```bash
[AuditLoggerService] AuditLoggerService initialized successfully
[AuditLoggerInterceptor] 🔍 Endpoint POST /users - @AuditLog decorator found, will audit
[AuditLoggerInterceptor] 🔄 Creating audit log for POST /users
[AuditLoggerService] ✅ Audit log saved successfully with ID: 123
```

### Se NÃO ver esses logs:
1. **Nenhum log:** Interceptor não aplicado
2. **"No @AuditLog decorator":** Falta decorator no endpoint
3. **"Route excluded":** Endpoint está na lista excludeRoutes
4. **"Failed to save":** Problema no banco de dados

## 🧪 5. Teste Manual Completo

### 5.1 Configurar com debug:
```typescript
AuditLoggerModule.forRoot({
  logLevel: 'debug',
  enableDiagnosticEndpoints: true,
  logRequestBody: true,
  logResponseBody: true,
})
```

### 5.2 Criar controller de teste:
```typescript
@Controller('test')
@UseInterceptors(AuditLoggerInterceptor)
export class TestController {
  @Post()
  @AuditLog({ serviceName: 'TestService', description: 'Teste manual' })
  test(@Body() data: any) {
    return { received: data, timestamp: new Date() };
  }
}
```

### 5.3 Fazer requisição:
```bash
curl -X POST http://localhost:3000/test \
  -H "Content-Type: application/json" \
  -d '{"test": "manual"}'
```

### 5.4 Verificar no banco:
```sql
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5;
```

## 📊 6. Verificar Estatísticas

```bash
# Ver logs recentes
GET /audit-diagnostic/stats

# Teste direto no banco
POST /audit-diagnostic/test-direct-save
```

## 🆘 7. Se Nada Funcionar

1. **Verifique a versão:**
```bash
npm list @viniciushrk/nestjs-audit-logger
# Deve ser >= 1.1.0
```

2. **Atualize se necessário:**
```bash
npm update @viniciushrk/nestjs-audit-logger
```

3. **Logs completos:**
```typescript
// main.ts
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'], // 👈 Ativar todos os logs
  });

  await app.listen(3000);
}
```

4. **Teste sem outros interceptors:**
Temporariamente remova outros interceptors para isolar o problema.

## 📞 Suporte

Se ainda tiver problemas, abra uma issue com:
- Logs completos com `logLevel: 'debug'`
- Resposta do `/audit-diagnostic/health`
- Configuração do módulo
- Versão do NestJS e PostgreSQL