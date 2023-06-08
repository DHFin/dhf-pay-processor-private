import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RpcClient = require('bitcoin-core');

const config = {
  protocol: 'http',
  username: 'btcuser',
  password: 'btcpwd',
  host: '127.0.0.1',
  port: '8332',
  wallet: 'main1',
};

@Injectable()
class RpcClientBtcService {
  getRpc() {
    return new RpcClient(config);
  }
}

export { RpcClientBtcService };
