import { Controller } from '@nestjs/common';
import { TransactionService } from './transaction.service';

@Controller('transaction')
export class TransactionController {
  constructor(public readonly service: TransactionService) {}
}
