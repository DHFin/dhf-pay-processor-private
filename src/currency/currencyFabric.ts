import { Casper } from './currencies/casper';
import { CurrencyType } from './currency.enum';
import { MailerService } from '@nest-modules/mailer';
import { Bitcoin } from './currencies/bitcoin';
import { Injectable } from '@nestjs/common';
import { Ethereum } from './currencies/ethereum';

@Injectable()
class CurrencyFabric {
  constructor(
    private readonly mailerService: MailerService,
  ) {}
  create(type: CurrencyType, rpcClient?: any) {
    switch (type) {
      case CurrencyType.Bitcoin: {
        return new Bitcoin(this.mailerService, rpcClient);
      }
      case CurrencyType.Ethereum: {
        return new Ethereum(this.mailerService);
      }
      // case CurrencyType.Doge: {
      //   return new Doge();
      // }
      // case CurrencyType.USDT: {
      //   return new Casper(mailingModule);
      // }
      case CurrencyType.Casper: {
        return new Casper(this.mailerService);
      }
      default: {
        throw new Error('Currency type does not exist');
      }
    }
  }
}

export { CurrencyFabric };
