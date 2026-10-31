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
import { Public } from '../common/decorators/public.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import {
  PROFILE_EDIT_THROTTLE,
  REGISTER_THROTTLE,
} from '../config/throttle.config';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserSummaryDto } from './dto/user-summary.dto';
import { RefreshTokenService } from '../sessions/refresh-token.service';
import { setRefreshCookie } from '../sessions/refresh-cookie.util';

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

  /** Registers an account (public). The response never carries the password hash. */
  @Public()
  @Throttle({ default: REGISTER_THROTTLE })
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  /** Every user, as id and username only (subject III.4). */
  @Get()
  async findAll() {
    const users = await this.usersService.findAll();
    return users.map((user) => new UserSummaryDto(user));
  }

  /**
   * The caller's own profile. Declared before the ':id' route on purpose:
   * Nest matches routes in declaration order, so with ':id' first a request
   * to /users/me would bind ":id" = "me" and ParseIdPipe would 400 before
   * this handler ran.
   */
  @Get('me')
  findMe(@CurrentUser() user: AuthUser) {
    return this.usersService.findOne(user.id);
  }

  /**
   * Any profile can be read, but only the owner sees all of it
   * (`UsersService.findOneForViewer`). ParseIdPipe rejects a malformed or out-of-range :id with 400 before the
   * service runs, so no query is ever built from it.
   */
  @Get(':id')
  findOne(@Param('id', ParseIdPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.usersService.findOneForViewer(id, user.id);
  }

  /**
   * Edits one's own profile: the registration fields plus `profilePicture`.
   * An email or password change needs `currentPassword`, then ends every
   * session and opens a new one for the caller
   * (`RefreshTokenService.restartSessions`).
   *
   * @throws {ForbiddenException} 403 on another user's id (the subject's
   * rule), or a wrong `currentPassword`.
   * @throws {BadRequestException} 400 when `currentPassword` is missing, or
   * the account has no password to confirm with.
   */
  @Throttle({ default: PROFILE_EDIT_THROTTLE })
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
      // On `req.res`, which keeps Nest's normal reply (no `@Res`).
      const session = await this.refreshTokens.restartSessions(id);
      if (req.res) {
        setRefreshCookie(req, req.res, session);
      }
    }
    return updated;
  }

  /**
   * Deletes one's own account.
   *
   * @throws {ForbiddenException} 403 on another user's id.
   * @throws {NotFoundException} 404 when the id matches no row.
   */
  @Delete(':id')
  remove(@Param('id', ParseIdPipe) id: number, @CurrentUser() user: AuthUser) {
    if (user.id !== id) {
      throw new ForbiddenException();
    }
    return this.usersService.remove(id);
  }
}
