// HTTP entry points for profile pictures: upload, removal, and serving.
import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseFilePipe,
  Put,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrors } from '../common/decorators/api-errors.decorator';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { PROFILE_EDIT_THROTTLE } from '../config/throttle.config';
import { User } from './entities/user.entity';
import {
  PICTURE_UPLOAD_LIMITS,
  ProfilePictureStore,
} from './profile-picture.store';
import { UsersService } from './users.service';

/** A stored picture never changes: a new upload gets a new name. */
const IMMUTABLE = 'public, max-age=31536000, immutable';

/**
 * Profile pictures. Changing one is the owner's (403 otherwise), like any
 * profile edit. Reading one is public: an `<img>` cannot send the bearer
 * token, and the name is random, so knowing a user id does not reveal it.
 */
@ApiTags('users')
@Controller()
export class ProfilePictureController {
  constructor(
    private readonly usersService: UsersService,
    private readonly pictures: ProfilePictureStore,
  ) {}

  /**
   * Replaces one's own picture.
   *
   * @throws {ForbiddenException} 403 on another user's id.
   */
  @ApiOperation({
    summary: "Upload one's own profile picture",
    description: 'A `picture` file: JPEG, PNG or WebP, 2 MB at most.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['picture'],
      properties: { picture: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({ type: User })
  @ApiErrors(
    [400, 'No picture, or one that is not a JPEG, PNG or WebP image'],
    401,
    403,
    404,
    413,
    429,
  )
  @Throttle({ default: PROFILE_EDIT_THROTTLE })
  @UseInterceptors(
    FileInterceptor('picture', { limits: PICTURE_UPLOAD_LIMITS }),
  )
  @Put('users/:id/picture')
  setPicture(
    @Param('id', ParseIdPipe) id: number,
    @UploadedFile(new ParseFilePipe()) picture: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ) {
    if (user.id !== id) {
      throw new ForbiddenException();
    }
    return this.usersService.setPicture(id, picture.buffer);
  }

  /**
   * Back to the default avatar.
   *
   * @throws {ForbiddenException} 403 on another user's id.
   */
  @ApiOperation({ summary: "Remove one's own profile picture" })
  @ApiOkResponse({ type: User })
  @ApiErrors(401, 403, 404, 429)
  @Throttle({ default: PROFILE_EDIT_THROTTLE })
  @Delete('users/:id/picture')
  clearPicture(
    @Param('id', ParseIdPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    if (user.id !== id) {
      throw new ForbiddenException();
    }
    return this.usersService.clearPicture(id);
  }

  /**
   * A stored picture, by the name in `profilePicture`. Cached for good by
   * the browser, unlike the API's `no-store` answers: the bytes behind a
   * name never change.
   */
  @ApiOperation({ summary: 'A profile picture, by its name' })
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  @ApiErrors([404, 'No picture with this name'], 429)
  @Public()
  @Get('pictures/:name')
  async findOne(
    @Param('name') name: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.pictures.open(name);
    res.setHeader('Cache-Control', IMMUTABLE);
    return new StreamableFile(file.stream, {
      type: file.mime,
      length: file.size,
    });
  }
}
