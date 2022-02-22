import {Test, TestingModule} from '@nestjs/testing';
import { Connection, Repository } from 'typeorm'
import {UserService} from './user.service';
import {TypeOrmModule} from "@nestjs/typeorm";
import {User} from "./entities/user.entity";
import {MailerModule, MailerService} from "@nest-modules/mailer";
import {ConfigModule, ConfigService} from "nestjs-config";
import * as path from "path";

const dotEnvPath = path.resolve(__dirname, '..', '.env');

const user = {
  name:"1",
  lastName:"1",
  email:"mail@gmail.com",
  // token:"$2b$07$PUx7RK/NjXwo7i9xpYT2vejPjU3A4hxCCvYYkDbZ/fcfgyFnCw9f.",
  role:"customer",
  // id: 60,
  password:"5ZlEqFyVD4XMnxJsSFZf2Yra1k3m44o1E59v",
  company:"mail.ru",
  blocked: false
};

describe('UserService',() => {
  let service: UserService;
  let mailerService: MailerService;
  let connection: Connection;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.load(
            path.resolve(__dirname, 'config', '**!(*.d).config.{ts,js}'),
            {
              path: dotEnvPath,
            },
        ), //ci
        TypeOrmModule.forRootAsync({
          useFactory: (config: ConfigService) => {
            return {
              ...config.get('../config/database.config.ts'),
              entities: [path.join(__dirname,'**', '*.entity.{ts,js}')],
              keepConnectionAlive: true
            };
          },
          inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([User]),
        MailerModule,
      ],
      providers: [
        UserService,
        {
          provide: MailerService,
          useValue: {
            get: jest.fn(async () => {
            }),
            // really it can be anything, but the closer to your actual logic the better
          }
        }
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    mailerService = module.get<MailerService>(MailerService);

    mailerService.sendMail = jest.fn();

  });

  it('should created user',  async () => {
   const createdUser = await service.create({ ...user });
   expect(createdUser).toHaveProperty("email","mail@gmail.com");
  });

  it('should get error the same users', () => {
   const foundedUser = service.findByEmail(user.email);
   if (foundedUser) expect(async ()=> await service.create({ ...foundedUser })).rejects.toThrow();
  });

  it('should get error at verifying user', () => {
   expect(async () => await service.verifyUser({email:user.email, code:5454})).rejects.toThrow();
  });

  it('find user by email',async () => {
   const foundedUser = await service.findByEmail(user.email);

   expect(foundedUser).toHaveProperty("email","mail@gmail.com");

  });

  afterAll(async ()=>{
   const foundedUser = await service.findByEmail(user.email);
   //@ts-ignore
   await User.remove({...foundedUser});
  })
});