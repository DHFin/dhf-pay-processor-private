import { BadRequestException, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { IUser } from './interfaces/user.interface';
import { TypeOrmCrudService } from "@nestjsx/crud-typeorm";
import { MailerService } from '@nest-modules/mailer';
import {Repository} from "typeorm";

function randomString(len) {
  const charSet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';
  for (let i = 0; i < len; i++) {
    const randomPoz = Math.floor(Math.random() * charSet.length);
    randomString += charSet.substring(randomPoz, randomPoz + 1);
  }
  return randomString;
}

@Injectable()
export class UserService {
  constructor(@InjectRepository(User)
              private readonly repo: Repository<User>,
              private mailerService: MailerService
  ) {}

  async findByToken(token) {
    return await this.repo.findOne({
      where: {
        token,
      },
    });
  }

  async findByEmail(email) {
    return await this.repo.findOne({
      where: {
        email,
      },
    });
  }

  async findByCode(restorePasswordCode) {
    return await this.repo.findOne({
      where: {
        restorePasswordCode,
      },
    });
  }

  async findAll() {
    return await this.repo.find();
  }

  public async verifyUser({code, email}) {
    const userVerified = await this.findByEmail(email);
    if (userVerified.emailVerification === code) {
      return await this.repo.save({ ...userVerified, emailVerification: null });
    } else {
      throw new BadRequestException('code', 'Wrong code');
    }
  }

  public async create(user): Promise<IUser> {
    const userExisted = await this.findByEmail(user.email);

    if (userExisted && userExisted.emailVerification === null) {
      throw new BadRequestException('email', 'User with this email exists');
    }

    try {
      const token = randomString(36);
      return await this.repo.save({ ...user, token });
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async sendCode(email) {
    const user = await this.findByEmail(email);

    if (!user) {
      throw new BadRequestException('email', 'User with this email does not exist');
    }
    const code = Math.floor(9999999 + Math.random() * (9999999 + 1 - 1000000));
    user.restorePasswordCode = code;
    await user.save();
    return await this.mailerService.sendMail({
      to: email,
      from: process.env.MAILER_EMAIL,
      subject: 'Password reset code',
      template: 'send-password-code',
      context: {
        login: email,
        email: email,
        code: code,
      },
    });
  }

  async checkCode(code, email) {
    const user = await this.findByEmail(email)
    if (!user || user.restorePasswordCode !== +code)  {
      throw new BadRequestException('code', 'Wrong restore code');
    }
    return user
  }

  async reAuth(token: string) {
    const user = await this.findByToken(token)
    if (!user && user.emailVerification === null)  {
      throw new BadRequestException('token', 'User not exist');
    }
    return user
  }

  async changePassword(password, email) {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new BadRequestException('email', 'User with this email does not exist');
    }
    user.restorePasswordCode = null;
    user.password = password;
    await user.save();
    return user
  }
}
