import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';

// Only the AuthService methods the controller calls need a type here.
type AuthServiceMock = {
  validateUser: jest.Mock;
  login: jest.Mock;
};

const buildUser = (overrides: Partial<User> = {}): User =>
  ({ id: 1, email: 'ada@example.com', username: 'ada', ...overrides }) as User;

const loginDto: LoginDto = {
  email: 'ada@example.com',
  password: 'correct horse battery staple',
};

describe('AuthController', () => {
  let controller: AuthController;
  let auth: AuthServiceMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: { validateUser: jest.fn(), login: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    auth = module.get(AuthService);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('returns the access token when credentials are valid', async () => {
      const user = buildUser();
      auth.validateUser.mockResolvedValue(user);
      auth.login.mockResolvedValue({ access_token: 'signed.jwt.token' });

      const result = await controller.login(loginDto);

      expect(result).toEqual({ access_token: 'signed.jwt.token' });
      expect(auth.validateUser).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(auth.login).toHaveBeenCalledWith(user);
    });

    it('throws 401 and never mints a token when credentials are rejected', async () => {
      auth.validateUser.mockResolvedValue(null);

      await expect(controller.login(loginDto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(auth.login).not.toHaveBeenCalled();
    });
  });
});
