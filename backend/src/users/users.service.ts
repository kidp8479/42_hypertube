import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

/**
 * Data access for {@link User} rows. Wraps the TypeORM repository so the
 * rest of the app never issues SQL directly.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * Builds a User from the DTO, then inserts it. `create()` runs no SQL -
   * it's the in-memory step where password hashing and defaults belong -
   * and `save()` performs the INSERT.
   */
  create(createUserDto: CreateUserDto) {
    const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);
  }

  findAll() {
    return this.usersRepository.find();
  }

  /** Looks a user up by id; resolves to `null` when there's no match. */
  findOne(id: number) {
    return this.usersRepository.findOneBy({ id });
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
