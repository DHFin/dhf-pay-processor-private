import { HttpService } from '@nestjs/axios';
import { Currency } from './currency';
import { MailerService } from '@nest-modules/mailer';
import { CurrencyType } from '../currency.enum';

class Casper extends Currency {
  constructor(private mailingModule: MailerService) {
    super();
  }

  async updateTransaction(transaction) {
    const httpService = new HttpService();

    const sendMail = async (transaction) => {
      if (transaction.email) {
        await this.mailingModule.sendMail({
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
    };

    if (transaction.status === 'fake_processing') {
      const updatedTransaction = {
        ...transaction,
        status: 'fake_success',
        updated: new Date(),
      };
      try {
        await sendMail(updatedTransaction);
      } catch (e) {
        console.log(e);
      }
      return updatedTransaction;
    }
    try {
      const res = await httpService
        .get(`${process.env.CASPER_TRX_MONITORING_API}${transaction.txHash}`)
        .toPromise();
      console.log(res.data.data);
      if (res.data.data.errorMessage) {
        const updatedTransaction = {
          ...transaction,
          status: res.data.data.errorMessage,
          updated: res.data.data.timestamp,
        };
        try {
          await sendMail(updatedTransaction);
        } catch (e) {
          console.log(e);
        }
        return updatedTransaction;
      }
      if (!res.data.data.errorMessage && res.data.data.blockHash) {
        const checkTransaction = await httpService
          .get(
            `${process.env.CASPER_TRX_CHECK_TRANSACTION}${res.data.data.deployHash}`,
          )
          .toPromise();
        console.log('checkTransaction', checkTransaction.data.data);
        if (
          checkTransaction.data.data.deploy.session.Transfer.args[1][1]
            .bytes !==
            transaction.payment.store.wallets.find(
              (el) => el.currency === CurrencyType.Casper,
            ).value ||
          checkTransaction.data.data.deploy.approvals[0].signer !==
            transaction.sender ||
          checkTransaction.data.data.deploy.session.Transfer.args[0][1]
            .parsed !== transaction.amount
        ) {
          const updatedTransaction = {
            ...transaction,
            status: 'failed',
            updated: res.data.data.timestamp,
          };
          try {
            await sendMail(updatedTransaction);
          } catch (e) {
            console.log(e);
          }
          return updatedTransaction;
        }

        const updatedTransaction = {
          ...transaction,
          status: 'success',
          updated: res.data.data.timestamp,
        };
        try {
          await sendMail(updatedTransaction);
        } catch (e) {
          console.log(e);
        }
        return updatedTransaction;
      }
    } catch (e) {
      const updatedTransaction = {
        ...transaction,
        status: 'deploy not found',
        updated: new Date(),
      };
      try {
        await sendMail(updatedTransaction);
      } catch (e) {
        console.log(e);
      }
      return updatedTransaction;
    }
  }
}

export { Casper };
