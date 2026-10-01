import 'reflect-metadata';
import { Logger, StandardSchemaValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { env } from './config.js';

const app = await NestFactory.create(AppModule);

// NestJS 12 validates any Standard Schema (Zod, Valibot, ArkType) attached via
// @Body({ schema }), @Query({ schema }) or @Param('id', { schema }).
app.useGlobalPipes(new StandardSchemaValidationPipe());
app.enableShutdownHooks();

await app.listen(env.PORT);
new Logger('Bootstrap').log(`Listening on ${await app.getUrl()}`);
