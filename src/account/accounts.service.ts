import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { EventStoreService } from '../event-store/event-store.service.js';
import { AccountEvent, evolve, initialState } from './account.js';
import { AppendStreamState, NO_STREAM } from '@kurrent/kurrentdb-client';
import { randomUUIDv7 } from 'bun';

const stream = (id: string) => `account-${id}`;

@Injectable()
export class AccountsService {
  constructor(private readonly eventStore: EventStoreService) {}

  async load(id: string, toRevision?: bigint) {
    let state = initialState;
    let revision: AppendStreamState = NO_STREAM;
    for await (const e of this.eventStore.read(stream(id))) {
      if (toRevision !== undefined && e.revision > toRevision) break;
      state = evolve(state, { type: e.type, data: e.data } as AccountEvent);
      revision = e.revision;
    }
    if (!state.exists) throw new NotFoundException(`Account ${id} not found`);
    return { state, revision };
  }

  async open(owner: string, actorId: string) {
    const accountId = randomUUIDv7();
    await this.append(
      accountId,
      { type: 'AccountOpened', data: { accountId, owner } },
      NO_STREAM,
      actorId,
    );
    return { accountId };
  }

  async deposit(id: string, amount: number, actorId: string) {
    const { revision } = await this.load(id);
    await this.append(id, { type: 'MoneyDeposited', data: { amount } }, revision, actorId);
  }

  async withdraw(id: string, amount: number, actorId: string) {
    const { state, revision } = await this.load(id);
    if (state.balance < amount) throw new UnprocessableEntityException('Insufficent funds');
    return this.append(id, { type: 'MoneyWithdrawn', data: { amount } }, revision, actorId);
  }

  async history(id: string) {
    const entries = [];
    for await (const e of this.eventStore.read(stream(id))) {
      entries.push({
        revision: Number(e.revision),
        type: e.type,
        data: e.data,
        metadata: e.metadata,
        at: e.created,
      });
    }
    return entries;
  }

  private async append(
    id: string,
    event: AccountEvent,
    expected: AppendStreamState,
    actorId: string,
  ) {
    const result = await this.eventStore.append(
      stream(id),
      [{ ...event, metadata: { actorId } }],
      expected,
    );
    return { revision: Number(result.nextExpectedRevision) };
  }
}
