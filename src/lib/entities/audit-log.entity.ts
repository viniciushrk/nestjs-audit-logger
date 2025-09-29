import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('audit_logs')
@Index('idx_audit_logs_timestamp', ['timestamp'])
@Index('idx_audit_logs_user_id', ['userId'])
@Index('idx_audit_logs_endpoint', ['endpoint'])
@Index('idx_audit_logs_service_name', ['serviceName'])
@Index('idx_audit_logs_status_code', ['statusCode'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({
    type: 'timestamp with time zone',
    nullable: false,
  })
  @Index()
  timestamp: Date;

  @Column({
    name: 'user_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  userId?: string;

  @Column({
    name: 'user_email',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  userEmail?: string;

  @Column({
    name: 'http_method',
    type: 'varchar',
    length: 10,
    nullable: false,
  })
  httpMethod: string;

  @Column({
    type: 'text',
    nullable: false,
  })
  endpoint: string;

  @Column({
    name: 'service_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  serviceName?: string;

  @Column({
    name: 'action_description',
    type: 'text',
    nullable: true,
  })
  actionDescription?: string;

  @Column({
    name: 'request_data',
    type: 'jsonb',
    nullable: true,
  })
  requestData?: any;

  @Column({
    name: 'response_data',
    type: 'jsonb',
    nullable: true,
  })
  responseData?: any;

  @Column({
    name: 'user_agent',
    type: 'text',
    nullable: true,
  })
  userAgent?: string;

  @Column({
    name: 'ip_address',
    type: 'inet',
    nullable: true,
  })
  ipAddress?: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  token?: string;

  @Column({
    name: 'status_code',
    type: 'integer',
    nullable: true,
  })
  statusCode?: number;

  @Column({
    name: 'execution_time_ms',
    type: 'integer',
    nullable: true,
  })
  executionTimeMs?: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
  })
  createdAt: Date;
}