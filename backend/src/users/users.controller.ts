// HTTP entry points for the users resource.
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { scaledThrottleLimit } from '../config/throttle.config';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserSummaryDto } from './dto/user-summary.dto';
import { PublicUserDto } from './dto/public-user.dto';
import { RefreshTokenService } from '../auth/refresh-token.service';
import { setRefreshCookie } from '../auth/refresh-cookie.util';

/**
 * Account CRUD (`/users`). Registration is public; every mutating route on
 * an existing profile requires the caller to own it (403 otherwise).
 */
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  // Registration is rare per real user; cap it hard to blunt sign-up
  // spam and (later) reset-email flooding from a single source.
  @Public()
  @Throttle({ default: { limit: scaledThrottleLimit(10), ttl: 3_600_000 } })
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  // Every user, as id and username only (subject III.4).
  @Get()
  async findAll() {
    const users = await this.usersService.findAll();
    return users.map((user) => new UserSummaryDto(user));
  }

  // The caller's own profile. Declared before the ':id' route on purpose:
  // Nest matches routes in declaration order, so with ':id' first a request
  // to /users/me would bind ":id" = "me" and ParseIdPipe would 400 before
  // this handler ran.
  @Get('me')
  findMe(@CurrentUser() user: AuthUser) {
    return this.usersService.findOne(user.id);
  }

  // Any profile can be read, but only the owner sees all of it: someone
  // else gets the public fields, never the email (subject III.1, III.4).
  // ParseIdPipe rejects a malformed or out-of-range :id with 400 before the
  // service runs, so no query is ever built from it.
  @Get(':id')
  async findOne(
    @Param('id', ParseIdPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    const found = await this.usersService.findOne(id);
    return user.id === id ? found : new PublicUserDto(found);
  }

  // A user may only edit or delete their own profile: 403 otherwise, per
  // the subject.
  // Checks a password when the email or the password changes, so it is
  // throttled like a login attempt, with room for ordinary profile edits.
  @Throttle({ default: { limit: scaledThrottleLimit(10), ttl: 60_000 } })
  @Patch(':id')
  async update(
    @Param('id', ParseIdPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    if (user.id !== id) {
      throw new ForbiddenException();
    }
    const { user: updated, credentialsChanged } =
      await this.usersService.update(id, updateUserDto);
    if (credentialsChanged) {
      await this.restartSessions(id, req);
    }
    return updated;
  }

  @Delete(':id')
  remove(@Param('id', ParseIdPipe) id: number, @CurrentUser() user: AuthUser) {
    if (user.id !== id) {
      throw new ForbiddenException();
    }
    return this.usersService.remove(id);
  }

  /**
   * After an email or password change, a session opened with the old
   * credentials must not survive: every refresh-token family of the user is
   * revoked, and the caller gets a fresh one in a new cookie so they stay
   * signed in. This route never sees the caller's own refresh cookie (it is
   * scoped to the auth routes), so "every session but this one" is done as
   * "every session, then a new one" (ADR-0011).
   */
  // Express hangs the response on `req.res`: setting the cookie there keeps
  // Nest's normal reply (no `@Res`) and the handler within its parameter budget.
  private async restartSessions(userId: number, req: Request) {
    await this.refreshTokens.revokeAllForUser(userId);
    const issued = await this.refreshTokens.issue(userId);
    if (req.res) {
      setRefreshCookie(req, req.res, issued);
    }
  }
}
