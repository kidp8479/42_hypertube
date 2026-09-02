import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { envValidationSchema } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Compose (dev) and the deploy environment (prod) inject every var
      // into the process directly; there is no .env file to read here.
      ignoreEnvFile: true,
      validationSchema: envValidationSchema,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DATABASE_HOST'),
        port: config.get<number>('DATABASE_PORT'),
        username: config.get<string>('DATABASE_USER'),
        password: config.get<string>('DATABASE_PASSWORD'),
        database: config.get<string>('DATABASE_NAME'),
        autoLoadEntities: true,
        // Log every generated SQL statement in dev - useful while learning
        // the ORM and for spotting N+1 queries. Silent in production.
        logging: config.get<string>('NODE_ENV') !== 'production',
        // Auto-syncs the schema from entities - convenient in dev, but can
        // drop/alter columns (and their data) without asking. Never in prod.
        synchronize: config.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    // Baseline abuse ceiling for every route (per client IP, in-process
    // counter). Auth endpoints tighten this further with @Throttle.
    // A shared Redis store is a nice-to-have once there is more than one
    // backend instance - not needed for a single-instance deploy.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
