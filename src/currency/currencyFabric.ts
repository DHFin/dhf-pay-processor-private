import { Casper } from './currencies/casper';
import { Doge } from './currencies/doge';
import { CurrencyType } from './currency.enum';
import { MailerService } from '@nest-modules/mailer';
import { Bitcoin } from './currencies/bitcoin';
import { Injectable } from '@nestjs/common';

@Injectable()
class CurrencyFabric {
  constructor(private readonly mailerService: MailerService) {}
  create(type: CurrencyType) {
    console.log('__dirname', __dirname + '../mail-templates');
    switch (type) {
      case CurrencyType.Bitcoin: {
        return new Bitcoin(this.mailerService);
      }
      case CurrencyType.Ethereum: {
        return new Casper(this.mailerService);
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
