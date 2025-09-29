import { Module, DynamicModule, Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogEntity } from './entities/audit-log.entity';
import { AuditLoggerService } from './audit-logger.service';
import { AuditLoggerInterceptor } from './audit-logger.interceptor';
import {
  AuditLoggerModuleOptions,
  AuditLoggerModuleAsyncOptions,
  AuditLoggerOptionsFactory,
  AUDIT_LOGGER_OPTIONS,
} from './interfaces/audit-logger.interface';

@Module({})
export class AuditLoggerModule {
  /**
   * Registers the AuditLoggerModule with synchronous configuration
   * @param options Configuration options for the audit logger
   * @returns DynamicModule
   *
   * @example
   * ```typescript
   * @Module({
   *   imports: [
   *     TypeOrmModule.forRoot(postgresConfig),
   *     AuditLoggerModule.forRoot({
   *       logRequestBody: true,
   *       logResponseBody: false,
   *       excludeRoutes: ['/health', '/metrics'],
   *       database: {
   *         connection: 'default'
   *       }
   *     })
   *   ]
   * })
   * export class AppModule {}
   * ```
   */
  static forRoot(options: AuditLoggerModuleOptions = {}): DynamicModule {
    const connectionName = options.database?.connection || 'default';

    return {
      module: AuditLoggerModule,
      imports: [
        TypeOrmModule.forFeature([AuditLogEntity], connectionName),
      ],
      providers: [
        {
          provide: AUDIT_LOGGER_OPTIONS,
          useValue: {
            logRequestBody: false,
            logResponseBody: false,
            excludeRoutes: [],
            logLevel: 'info',
            ...options,
          },
        },
        AuditLoggerService,
        AuditLoggerInterceptor,
      ],
      exports: [
        AuditLoggerService,
        AuditLoggerInterceptor,
        AUDIT_LOGGER_OPTIONS,
      ],
      global: true,
    };
  }

  /**
   * Registers the AuditLoggerModule with asynchronous configuration
   * @param options Async configuration options
   * @returns DynamicModule
   *
   * @example
   * ```typescript
   * @Module({
   *   imports: [
   *     AuditLoggerModule.forRootAsync({
   *       imports: [ConfigModule],
   *       useFactory: async (configService: ConfigService) => ({
   *         logRequestBody: configService.get('AUDIT_LOG_REQUEST_BODY', false),
   *         logResponseBody: configService.get('AUDIT_LOG_RESPONSE_BODY', false),
   *         excludeRoutes: configService.get('AUDIT_EXCLUDE_ROUTES', '').split(','),
   *         database: {
   *           connection: configService.get('AUDIT_DB_CONNECTION', 'default')
   *         }
   *       }),
   *       inject: [ConfigService]
   *     })
   *   ]
   * })
   * export class AppModule {}
   * ```
   */
  static forRootAsync(options: AuditLoggerModuleAsyncOptions): DynamicModule {
    const connectionName = 'default'; // Will be determined at runtime

    return {
      module: AuditLoggerModule,
      imports: [
        TypeOrmModule.forFeature([AuditLogEntity], connectionName),
        ...(options.imports || []),
      ],
      providers: [
        ...this.createAsyncProviders(options),
        AuditLoggerService,
        AuditLoggerInterceptor,
      ],
      exports: [
        AuditLoggerService,
        AuditLoggerInterceptor,
        AUDIT_LOGGER_OPTIONS,
      ],
      global: true,
    };
  }

  private static createAsyncProviders(
    options: AuditLoggerModuleAsyncOptions,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }

    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: options.useClass!,
        useClass: options.useClass!,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: AuditLoggerModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: AUDIT_LOGGER_OPTIONS,
        useFactory: async (...args: any[]) => {
          const config = await options.useFactory!(...args);
          return {
            logRequestBody: false,
            logResponseBody: false,
            excludeRoutes: [],
            logLevel: 'info' as const,
            ...config,
          };
        },
        inject: options.inject || [],
      };
    }

    return {
      provide: AUDIT_LOGGER_OPTIONS,
      useFactory: async (optionsFactory: AuditLoggerOptionsFactory) => {
        const config = await optionsFactory.createAuditLoggerOptions();
        return {
          logRequestBody: false,
          logResponseBody: false,
          excludeRoutes: [],
          logLevel: 'info' as const,
          ...config,
        };
      },
      inject: [options.useExisting || options.useClass!],
    };
  }

  /**
   * Creates a feature module for use in other modules
   * @param entities Additional entities to register (optional)
   * @param connection Database connection name (optional)
   * @returns DynamicModule
   *
   * @example
   * ```typescript
   * @Module({
   *   imports: [
   *     AuditLoggerModule.forFeature()
   *   ],
   *   controllers: [UsersController],
   *   providers: [UsersService]
   * })
   * export class UsersModule {}
   * ```
   */
  static forFeature(
    entities: any[] = [],
    connection?: string,
  ): DynamicModule {
    const connectionName = connection || 'default';

    return {
      module: AuditLoggerModule,
      imports: [
        TypeOrmModule.forFeature([AuditLogEntity, ...entities], connectionName),
      ],
      providers: [],
      exports: [],
    };
  }
}