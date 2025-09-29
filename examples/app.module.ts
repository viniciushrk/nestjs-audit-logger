import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuditLoggerModule } from '@viniciushrk/nestjs-audit-logger';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // Configuração de ambiente
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Configuração do PostgreSQL
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'password'),
        database: configService.get('DB_DATABASE', 'myapp'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),

    // Configuração do Audit Logger
    AuditLoggerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        logRequestBody: configService.get('AUDIT_LOG_REQUEST_BODY', true),
        logResponseBody: configService.get('AUDIT_LOG_RESPONSE_BODY', false),
        excludeRoutes: ['/health', '/metrics', '/docs'],
        logLevel: configService.get('AUDIT_LOG_LEVEL', 'info'),
        database: {
          connection: 'default',
        },
        // Extratores customizados para tokens da sua aplicação
        customTokenExtractor: (request) => {
          // Exemplo: token customizado no header
          return request.headers['x-app-token'] ||
                 request.headers['authorization']?.replace('Bearer ', '') ||
                 request.query.token;
        },
        customUserIdExtractor: (token) => {
          try {
            // Exemplo: token é um JSON simples
            if (token.startsWith('{')) {
              const parsed = JSON.parse(token);
              return parsed.userId || parsed.id;
            }
            // Exemplo: token é um JWT simples (sem verificação)
            if (token.includes('.')) {
              const payload = JSON.parse(
                Buffer.from(token.split('.')[1], 'base64url').toString()
              );
              return payload.sub || payload.userId;
            }
            return undefined;
          } catch {
            return undefined;
          }
        },
        customUserEmailExtractor: (token) => {
          try {
            if (token.startsWith('{')) {
              const parsed = JSON.parse(token);
              return parsed.email || parsed.userEmail;
            }
            if (token.includes('.')) {
              const payload = JSON.parse(
                Buffer.from(token.split('.')[1], 'base64url').toString()
              );
              return payload.email;
            }
            return undefined;
          } catch {
            return undefined;
          }
        },
      }),
      inject: [ConfigService],
    }),

    // Módulos da aplicação
    UsersModule,
  ],
})
export class AppModule {}