import { Currency } from './currency';

class Doge extends Currency {
  constructor() {
    super();
  }

  async updateTransaction(transaction) {
    return {
      ...transaction,
      status: 'success',
      updated: new Date(),
    };
  }
}

export { Doge };
