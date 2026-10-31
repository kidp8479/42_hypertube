// Validated input shape for creating an API key.
import { IsString, Length } from 'class-validator';
import { Trim } from '../../common/decorators/trim.decorator';

/** Payload of `POST /api-clients`: a label to tell one's keys apart. */
export class CreateApiClientDto {
  @Trim()
  @IsString()
  @Length(1, 50)
  readonly name!: string;
}
