import { MailerService } from '@nest-modules/mailer';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrencyType } from '../currency/currency.enum';
import { Transaction } from './entities/transaction.entity';
import { CurrencyFabric } from "../currency/currencyFabric";

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private readonly repo: Repository<Transaction>,
    private httpService: HttpService,
    private mailerService: MailerService,
  ) {}

  async find(props) {
    return await this.repo.find(props);
  }

  /**
   * @description Send alerts. After the success of the transaction, a letter is sent to the mail specified by the payer when paying, with a notification of a status change.
   */
  async sendMail(transaction) {
    if (transaction.email) {
      await this.mailerService.sendMail({
        to: transaction.email,
        from: process.env.MAILER_EMAIL,
        subject: 'Transaction status changed',
        template: 'transaction-status-changed',
        context: {
          login: transaction.email,
          email: transaction.email,
          txHash: transaction.txHash,
          status: transaction.status,
        },
      });
    }
  }

  /**
   * @description Updating transactions. Every minute, all transactions with the processing status send a request to https://event-store-api-clarity-testnet.make.services/deploys/{transaction.txHash}, in response they receive an object of the format
   * {"data":{
   * "deployHash":"1c4E67848D6058FE85f3541C08d9B85f058959fb8C959Bf8A798235bc8614Bc5", - transaction hash
   * "blockHash":"6C51741Cd9Df2473d86ca81D6e1A2D1175171013C55715F7c85fFe7DB8Bc630d", - block hash
   * "account":"01a116eAe68beE00E558d57FC488f074E915b9Ba6533FC2423b04c78d0c9EF59D3", - sender's public key
   * "cost":"100000000", - transaction fee
   * "errorMessage":null, - transaction error
   * "timestamp":"2021-11-24T11:09:58.000Z", - last modified time
   * "status":"executed" - transaction status
   *}}
   * if there is an errorMessage in the response - it is written in the status field
   * if the transaction has a blockHash and no error, it means that it was successful and is saved with the success status
   */
  async updateTransactions() {
    const transactions = await this.repo.find({
      where: {
        status: 'processing',
      },
      relations: ['payment', 'payment.store', 'payment.store.wallets'],
    });
    const updateProcessingTransactions = await Promise.all(
      transactions.map(async (transaction) => {
        const updatedTransaction = new CurrencyFabric(this.mailerService).create(
          transaction.payment.currency,
        );
        if (updatedTransaction) {
          const updatedDataTransaction =
            await updatedTransaction.updateTransaction(transaction);
          if (updatedDataTransaction) {
            return updatedDataTransaction;
          }
        }
        return transaction;
      }),
    );

    await this.repo.save(updateProcessingTransactions);
  }
}
