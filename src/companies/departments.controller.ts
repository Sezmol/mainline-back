import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../users/users.types';
import { DepartmentsService } from './departments.service';
import { MemberDto, toMemberDto } from './dto/company.dto';
import {
  CreateDepartmentDto,
  DepartmentDto,
  UpdateDepartmentDto,
  toDepartmentDto,
} from './dto/department.dto';

@ApiTags('companies')
@ApiCookieAuth('access_token')
@Controller('companies/:companyId/departments')
export class DepartmentsController {
  constructor(private readonly departments: DepartmentsService) {}

  @Get()
  @ApiOperation({ summary: 'Departments of the company; employees only' })
  @ZodResponse({ status: 200, type: [DepartmentDto] })
  async list(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentUser() user: User,
  ) {
    return (await this.departments.list(companyId, user.id)).map(
      toDepartmentDto,
    );
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a department; owner or HR' })
  @ZodResponse({ status: 201, type: DepartmentDto })
  async create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateDepartmentDto,
  ) {
    return toDepartmentDto(await this.departments.create(companyId, user, dto));
  }

  @Put(':departmentId')
  @ApiOperation({ summary: 'Rename a department or change its head' })
  @ZodResponse({ status: 200, type: DepartmentDto })
  async update(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return toDepartmentDto(
      await this.departments.update(companyId, departmentId, user, dto),
    );
  }

  @Delete(':departmentId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a department together with its chat' })
  remove(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
    @CurrentUser() user: User,
  ) {
    return this.departments.remove(companyId, departmentId, user);
  }

  @Get(':departmentId/members')
  @ApiOperation({ summary: 'People in the department, with their roles' })
  @ZodResponse({ status: 200, type: [MemberDto] })
  async members(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
    @CurrentUser() user: User,
  ) {
    const members = await this.departments.members(
      companyId,
      departmentId,
      user.id,
    );

    return members.map(toMemberDto);
  }

  @Delete(':departmentId/members/:userId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove somebody, or leave the department' })
  removeMember(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: User,
  ) {
    return this.departments.removeMember(companyId, departmentId, user, userId);
  }
}
