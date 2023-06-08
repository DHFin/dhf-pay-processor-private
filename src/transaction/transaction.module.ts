import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletOrmEntity } from '../wallet/wallet.entity';
import { Transaction } from './entities/transaction.entity';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { RpcClientBtcService } from "../rpcClientBtc/rpcClientBtc";

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, WalletOrmEntity]),
    HttpModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [TransactionController],
  providers: [TransactionService, RpcClientBtcService],
  exports: [TransactionService],
})
export class TransactionModule {}
