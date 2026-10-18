// Backs AppController; only the liveness-check greeting for now.
import { Injectable } from '@nestjs/common';

/** Behind the liveness route: a fixed greeting that proves the app is up. */
@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
