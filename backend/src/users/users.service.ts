import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import * as argon2 from 'argon2';

/**
 * Data access for {@link User} rows. Wraps the TypeORM repository so the
 * rest of the app never issues SQL directly.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /**
   * Builds a User from the DTO, then inserts it. `create()` runs no SQL -
   * it's the in-memory step where password hashing and defaults belong -
   * and `save()` performs the INSERT.
   */
  async create(createUserDto: CreateUserDto) {
    const hashedPassword = await argon2.hash(createUserDto.password);
    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });
    return this.usersRepository.save(user);
  }

  findAll() {
    return this.usersRepository.find();
  }

  /** Looks a user up by id; resolves to `null` when there's no match. */
  findOne(id: number) {
    return this.usersRepository.findOneBy({ id });
  }

  /**
   * Looks a user up by email for the login flow. Uses a query builder
   * with `addSelect` so the `password` hash - hidden by `select: false`
   * on the entity - comes back alongside the normal columns; a plain
   * `findOneBy` would omit it. Resolves to `null` when there's no match.
   */
  findByEmail(email: string) {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  /** Applies a partial update by id, then returns the refreshed row. */
  async update(id: number, updateUserDto: UpdateUserDto) {
    await this.usersRepository.update(id, updateUserDto);
    return this.findOne(id);
  }

  remove(id: number) {
    return this.usersRepository.delete(id);
  }
}
