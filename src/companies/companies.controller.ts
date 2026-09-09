import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { User } from '../users/users.types';
import { CompaniesService } from './companies.service';
import {
  CompaniesQueryDto,
  SlugAvailabilityDto,
  SlugQueryDto,
} from './dto/companies-query.dto';
import {
  CompanyCardDto,
  CompanyDto,
  CompanyListDto,
  CompanyPageDto,
  toCompanyCardDto,
  toCompanyDto,
  toCompanyPageDto,
} from './dto/company.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@ApiTags('companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Directory of companies, newest first' })
  @ZodResponse({ status: 200, type: CompanyListDto })
  async list(@Query() query: CompaniesQueryDto) {
    const page = await this.companies.list(query);

    return {
      items: page.items.map(toCompanyCardDto),
      nextCursor: page.nextCursor,
    };
  }

  @Public()
  @Get('availability')
  @ApiOperation({ summary: 'Check whether a company address is still free' })
  @ZodResponse({ status: 200, type: SlugAvailabilityDto })
  availability(@Query() query: SlugQueryDto) {
    return this.companies.availability(query.slug);
  }

  @Get('mine')
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Companies the signed-in user works for' })
  @ZodResponse({ status: 200, type: [CompanyCardDto] })
  async mine(@CurrentUser() user: User) {
    return (await this.companies.mine(user.id)).map(toCompanyCardDto);
  }

  @Post()
  @HttpCode(201)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Create a company; the creator becomes its owner' })
  @ZodResponse({ status: 201, type: CompanyDto })
  async create(@CurrentUser() user: User, @Body() dto: CreateCompanyDto) {
    return toCompanyDto(await this.companies.create(user, dto));
  }

  @Public()
  @Get(':slug')
  @ApiOperation({
    summary: 'Company page; the private half is filled in for employees',
  })
  @ZodResponse({ status: 200, type: CompanyPageDto })
  async bySlug(@Param('slug') slug: string, @CurrentUser() user?: User) {
    return toCompanyPageDto(await this.companies.page(slug, user?.id));
  }

  @Put(':companyId')
  @ApiCookieAuth('access_token')
  @ApiOperation({
    summary: 'Edit a company, owner only',
    description:
      'Replaces the record: a field left out of the body is cleared.',
  })
  @ZodResponse({ status: 200, type: CompanyDto })
  async update(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateCompanyDto,
  ) {
    return toCompanyDto(await this.companies.update(companyId, user, dto));
  }
}
