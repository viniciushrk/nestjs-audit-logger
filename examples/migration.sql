-- Migration para criar a tabela de auditoria
-- Execute este script no seu banco PostgreSQL

CREATE TABLE IF NOT EXISTS audit_logs (
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

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_endpoint ON audit_logs (endpoint);
CREATE INDEX IF NOT EXISTS idx_audit_logs_service_name ON audit_logs (service_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status_code ON audit_logs (status_code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);

-- Comentários para documentação
COMMENT ON TABLE audit_logs IS 'Tabela para armazenar logs de auditoria da API';
COMMENT ON COLUMN audit_logs.id IS 'ID único do log de auditoria';
COMMENT ON COLUMN audit_logs.timestamp IS 'Timestamp da requisição';
COMMENT ON COLUMN audit_logs.user_id IS 'ID do usuário que fez a requisição';
COMMENT ON COLUMN audit_logs.user_email IS 'Email do usuário que fez a requisição';
COMMENT ON COLUMN audit_logs.http_method IS 'Método HTTP (GET, POST, PUT, DELETE, etc.)';
COMMENT ON COLUMN audit_logs.endpoint IS 'URL do endpoint acessado';
COMMENT ON COLUMN audit_logs.service_name IS 'Nome do serviço responsável pela ação';
COMMENT ON COLUMN audit_logs.action_description IS 'Descrição da ação realizada';
COMMENT ON COLUMN audit_logs.request_data IS 'Dados da requisição (JSON)';
COMMENT ON COLUMN audit_logs.response_data IS 'Dados da resposta (JSON)';
COMMENT ON COLUMN audit_logs.user_agent IS 'User Agent do cliente';
COMMENT ON COLUMN audit_logs.ip_address IS 'Endereço IP do cliente';
COMMENT ON COLUMN audit_logs.token IS 'Token de autenticação usado';
COMMENT ON COLUMN audit_logs.status_code IS 'Código de status HTTP da resposta';
COMMENT ON COLUMN audit_logs.execution_time_ms IS 'Tempo de execução em milissegundos';
COMMENT ON COLUMN audit_logs.created_at IS 'Timestamp de criação do registro';