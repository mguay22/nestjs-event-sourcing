import { Module } from '@nestjs/common';
import { AccountsService } from './accounts.service.js';
import { AccountsController } from './accounts.controller.js';

@Module({
  providers: [AccountsService],
  controllers: [AccountsController],
})
export class AccountsModule {}
