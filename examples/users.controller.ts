import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  HttpStatus,
} from '@nestjs/common';
import { AuditLog, AuditLoggerInterceptor } from '@viniciushrk/nestjs-audit-logger';

interface CreateUserDto {
  name: string;
  email: string;
  role: string;
}

interface UpdateUserDto {
  name?: string;
  email?: string;
  role?: string;
}

interface UserQueryDto {
  page?: number;
  limit?: number;
  search?: string;
}

@Controller('users')
@UseInterceptors(AuditLoggerInterceptor) // Aplicar interceptor em todo o controller
export class UsersController {

  // Exemplo 1: Criação de usuário com auditoria completa
  @Post()
  @AuditLog({
    serviceName: 'UsersService',
    description: 'Criação de novo usuário',
    logRequestBody: true,  // Logar dados da requisição
    logResponseBody: true, // Logar dados da resposta
  })
  async createUser(@Body() userData: CreateUserDto) {
    // Simular criação de usuário
    const newUser = {
      id: Math.random().toString(36).substr(2, 9),
      ...userData,
      createdAt: new Date(),
    };

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Usuário criado com sucesso',
      data: newUser,
    };
  }

  // Exemplo 2: Busca por ID com auditoria seletiva
  @Get(':id')
  @AuditLog({
    serviceName: 'UsersService',
    description: 'Busca de usuário por ID',
    logRequestBody: false, // Não logar req (não há body)
    logResponseBody: true, // Logar resposta
  })
  async getUserById(@Param('id') id: string) {
    return {
      id,
      name: 'João Silva',
      email: 'joao@email.com',
      role: 'admin',
      createdAt: '2024-01-01T00:00:00Z',
    };
  }

  // Exemplo 3: Atualização com auditoria parcial
  @Put(':id')
  @AuditLog({
    serviceName: 'UsersService',
    description: 'Atualização de dados do usuário',
    logRequestBody: true,
    logResponseBody: false, // Não logar resposta (pode ser grande)
  })
  async updateUser(@Param('id') id: string, @Body() updateData: UpdateUserDto) {
    return {
      statusCode: HttpStatus.OK,
      message: 'Usuário atualizado com sucesso',
      data: { id, ...updateData, updatedAt: new Date() },
    };
  }

  // Exemplo 4: Exclusão com auditoria mínima
  @Delete(':id')
  @AuditLog({
    serviceName: 'UsersService',
    description: 'Exclusão de usuário',
    logRequestBody: false,
    logResponseBody: false,
  })
  async deleteUser(@Param('id') id: string) {
    return {
      statusCode: HttpStatus.OK,
      message: 'Usuário removido com sucesso',
    };
  }

  // Exemplo 5: Listagem com query parameters
  @Get()
  @AuditLog({
    serviceName: 'UsersService',
    description: 'Listagem de usuários com filtros',
    logRequestBody: false,
    logResponseBody: false, // Lista pode ser muito grande
  })
  async getUsers(@Query() query: UserQueryDto) {
    const { page = 1, limit = 10, search } = query;

    return {
      data: [
        { id: '1', name: 'João Silva', email: 'joao@email.com' },
        { id: '2', name: 'Maria Santos', email: 'maria@email.com' },
      ],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: 2,
      },
      filters: { search },
    };
  }

  // Exemplo 6: Endpoint sem auditoria (não tem @AuditLog)
  @Get('health')
  async healthCheck() {
    return { status: 'OK', timestamp: new Date() };
  }

  // Exemplo 7: Operação administrativa crítica
  @Post(':id/reset-password')
  @AuditLog({
    serviceName: 'UsersService',
    description: 'Reset de senha do usuário (OPERAÇÃO CRÍTICA)',
    logRequestBody: false, // Não logar dados sensíveis
    logResponseBody: false,
  })
  async resetPassword(@Param('id') id: string) {
    return {
      statusCode: HttpStatus.OK,
      message: 'Senha resetada com sucesso',
      data: { passwordResetAt: new Date() },
    };
  }

  // Exemplo 8: Operação que pode gerar erro
  @Post(':id/activate')
  @AuditLog({
    serviceName: 'UsersService',
    description: 'Ativação de conta do usuário',
    logRequestBody: false,
    logResponseBody: true,
  })
  async activateUser(@Param('id') id: string) {
    // Simular possível erro
    if (id === 'invalid') {
      throw new Error('Usuário não encontrado');
    }

    return {
      statusCode: HttpStatus.OK,
      message: 'Usuário ativado com sucesso',
      data: { activatedAt: new Date() },
    };
  }
}