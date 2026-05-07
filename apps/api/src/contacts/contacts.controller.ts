import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../common/auth/supabase-auth.guard';
import { WorkspaceGuard } from '../common/auth/workspace.guard';
import { WorkspaceId } from '../common/auth/current-user.decorator';
import { ContactsService } from './contacts.service';

@Controller('contacts')
@UseGuards(SupabaseAuthGuard, WorkspaceGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  list(
    @WorkspaceId() workspaceId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.contactsService.list(workspaceId, parseInt(page, 10), parseInt(limit, 10));
  }

  @Get(':id')
  getById(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.contactsService.getById(workspaceId, id);
  }
}
