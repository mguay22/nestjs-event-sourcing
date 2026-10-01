import {
  AppendResult,
  AppendStreamState,
  jsonEvent,
  JSONRecordedEvent,
  KurrentDBClient,
  StreamNotFoundError,
  WrongExpectedVersionError,
} from '@kurrent/kurrentdb-client';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { env } from '../config.js';

export interface NewEvent<T extends string = string> {
  type: T;
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export class ConcurrencyError extends Error {
  constructor(
    readonly streamName: string,
    readonly expected: AppendStreamState,
    readonly actual: unknown,
  ) {
    super(
      `Concurrency conflict on ${streamName}: expected ${String(expected)}, actual ${String(actual)}`,
    );
    this.name = 'ConcurrencyError';
  }
}

@Injectable()
export class EventStoreService implements OnModuleDestroy {
  private readonly logger = new Logger(EventStoreService.name);
  readonly client = KurrentDBClient.connectionString(env.KURRENTDB_CONNECTION_STRING);

  async onModuleDestroy() {
    this.logger.log('Closing KurrentDB client');
    await this.client.dispose();
  }

  async append(
    streamName: string,
    events: NewEvent[],
    expectedState: AppendStreamState,
  ): Promise<AppendResult> {
    const payload = events.map((e) =>
      jsonEvent({ type: e.type, data: e.data, metadata: e.metadata }),
    );
    try {
      return await this.client.appendToStream(streamName, payload, { streamState: expectedState });
    } catch (err) {
      if (err instanceof WrongExpectedVersionError) {
        throw new ConcurrencyError(streamName, err.expectedState, err.actualState);
      }
      throw err;
    }
  }

  async *read(
    streamName: string,
    opts: { fromRevision?: bigint; maxCount?: number } = {},
  ): AsyncGenerator<JSONRecordedEvent> {
    const iterator = this.client.readStream(streamName, {
      fromRevision: opts.fromRevision,
      maxCount: opts.maxCount,
    });
    try {
      for await (const resolved of iterator) {
        if (resolved?.event?.isJson) yield resolved.event;
      }
    } catch (error) {
      if (error instanceof StreamNotFoundError) return;
      throw error;
    }
  }
}
