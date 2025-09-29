# 📦 Instalação da Biblioteca

## NPM (Publicado)

```bash
npm install @viniciushrk/nestjs-audit-logger
```

## Dependências necessárias no seu projeto:

```bash
npm install @nestjs/common @nestjs/core @nestjs/typeorm typeorm pg reflect-metadata rxjs
```

## Setup rápido:

### 1. Criar tabela no PostgreSQL:
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
```

### 2. Configurar no módulo:
```typescript
import { AuditLoggerModule } from '@viniciushrk/nestjs-audit-logger';

@Module({
  imports: [
    AuditLoggerModule.forRoot({
      logRequestBody: true,
      excludeRoutes: ['/health'],
    }),
  ],
})
export class AppModule {}
```

### 3. Usar no controller:
```typescript
import { AuditLog, AuditLoggerInterceptor } from '@viniciushrk/nestjs-audit-logger';

@Controller('users')
@UseInterceptors(AuditLoggerInterceptor)
export class UsersController {
  @Post()
  @AuditLog({ serviceName: 'UsersService', description: 'Criar usuário' })
  create(@Body() data: any) {
    return data;
  }
}
```

🚀 **Pronto para usar!**