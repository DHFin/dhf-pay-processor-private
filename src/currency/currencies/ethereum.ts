import { HttpService } from '@nestjs/axios';
import { Transaction } from '../../transaction/entities/transaction.entity';
import { Currency } from './currency';
import { MailerService } from '@nest-modules/mailer';

class Ethereum extends Currency {
  constructor(private mailingModule: MailerService) {
    super();
  }
  async updateTransaction(transaction: Transaction) {
    const httpService = new HttpService();

    const res = await httpService
      .get(
        `https://api-sepolia.etherscan.io/api?module=transaction&action=getstatus&txhash=${transaction.txHash}&apikey=DB5Q3DVC15D5Y17FUXT4DWP4B4YEDMNQG1`,
      )
      .toPromise();
    if (res.data.result.isError === '0') {
      return {
        ...transaction,
        status: 'success',
        updated: new Date().toISOString(),
      };
    }
    if (res.data.result.isError === '1' && res.data.result.errDescription) {
      return {
        ...transaction,
        status: res.data.result.errDescription,
        updated: new Date().toISOString(),
      };
    }
  }
}

export { Ethereum };
