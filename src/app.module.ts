import { Module } from '@nestjs/common';
import { EventStoreModule } from './event-store/event-store.module.js';
import { AccountsModule } from './account/accounts.module.js';

@Module({
  imports: [EventStoreModule, AccountsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
