import * as Bitcoin from 'bitcore-lib';
import * as CryptoAccount from 'send-crypto';
import { Transaction } from '../../transaction/entities/transaction.entity';
import { Currency } from './currency';
import { MailerService } from '@nest-modules/mailer';

class Bitcoin extends Currency {
  constructor(private mailingModule: MailerService) {
    super();
  }

  async updateTransaction(transaction: Transaction) {
    // @ts-ignore
    const info = new CryptoAccount(
      transaction.walletForTransaction.privateKey,
      { network: 'testnet' },
    );
    const value = await info.getBalance('BTC');
    if (value >= +transaction.payment.amount / 1_000_000_000) {
      const walletForSend = transaction.payment.store.wallets.find((el) => el.currency === 'BTC')
      const txId = await info.send(walletForSend.value, value, 'BTC', {
        fee: 500,
        subtractFee: true,
      });
      console.log('txId', txId);
      return { ...transaction, status: 'success', txHash: txId };
    }
    return transaction;
  }
}

export { Bitcoin };
