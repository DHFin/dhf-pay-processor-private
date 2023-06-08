import { Psbt } from 'bitcoinjs-lib';
import { ECPairAPI, ECPairFactory, TinySecp256k1Interface } from 'ecpair';
import { Transaction } from '../../transaction/entities/transaction.entity';
import { Currency } from './currency';
import { MailerService } from '@nest-modules/mailer';

const tinysecp: TinySecp256k1Interface = require('tiny-secp256k1');
const ECPair: ECPairAPI = ECPairFactory(tinysecp);

class Bitcoin extends Currency {
  constructor(private mailingModule: MailerService, private rpcClient?: any) {
    super();
  }

  async updateTransaction(transaction: Transaction) {
    try {

      const descriptor = `addr(${transaction.walletForTransaction.publicKey})`;

      const recipientAddress = transaction.payment.store.wallets.find(
        (el) => el.currency === 'BTC',
      ).value;

      const descriptorInfo = await this.rpcClient.command('getdescriptorinfo', descriptor);
      console.log('descriptorInfo', descriptorInfo);
      const listDescriptors = await this.rpcClient.command('listdescriptors');
      console.log('listDescriptors', listDescriptors);
      const imported = listDescriptors.descriptors.some(
        (desc) => desc.desc === descriptorInfo.descriptor,
      );
      if (imported) {
        if (transaction.txHash) {
          const txs = await this.rpcClient.command('gettransaction', transaction.txHash)
          console.log('txs транзакция с хешем из базы', txs);
          if (txs.confirmations >= 1) {
            console.log('return true');
            return { ...transaction, status: 'success' };
          }
          if (
            txs.confirmations === 0 &&
            transaction.status === 'processing'
          ) {
            console.log('here2');
            return { ...transaction, status: 'confirmed' };
          } else {
            return transaction;
          }
        } else {
          const listUnspent = await this.rpcClient.command('listunspent', 0, 99999, [
            transaction.walletForTransaction.publicKey,
          ])
          console.log('listUnspent если в базе нет хеша', listUnspent);

          if (listUnspent.length === 0) {
            return transaction;
          }
          if (listUnspent.length === 1) {
            const txs = await this.rpcClient.command('gettransaction', listUnspent[0].txid);
            console.log('txs если у нас есть utxo то создаем тразнакцию', txs);
            const tx = new Psbt();
            console.log(
              'blockchainTransaction',
              txs,
            );
            const senderPrivateKey =
              transaction.walletForTransaction.privateKey;
            const privateKey = ECPair.fromPrivateKey(
              Buffer.from(senderPrivateKey, 'hex'),
            );
            console.log('getPrivateKey', privateKey);
            const utxo = {
              hash: listUnspent[0].txid,
              index: 0,
              script: listUnspent.scriptpubkey,
              value: listUnspent[0].amount * 100_000_000,
              nonWitnessUtxo: Buffer.from(
                txs.hex,
                'hex',
              ),
            };
            tx.addInput(utxo);
            tx.addOutput({
              address: recipientAddress,
              value: +transaction.payment.amount / 10,
            });
            tx.setMaximumFeeRate(
              listUnspent[0].amount * 100_000_000 -
              +transaction.payment.amount / 10,
            );
            tx.signInput(0, privateKey);

            tx.finalizeInput(0);

            const rawHex = tx.extractTransaction(true).toHex();

            if (rawHex) {
              const txId = await this.rpcClient.command('sendrawtransaction', rawHex)
              console.log('txId', txId);
              if (txId) {
                return { ...transaction, txHash: txId, status: 'confirmed' };
              }
            }
          }
        }
      } else {
        console.log(
          'Дескриптор не найден в списке импортированных дескрипторов.',
        );
        const decoratorsImport = [
          {
            desc: `${descriptorInfo.descriptor}`,
            timestamp: 'now',
          },
        ];
        const importDecorators = await this.rpcClient.command('importdescriptors', decoratorsImport)
        if (importDecorators.success) {
          return transaction
        }
      }
            
        //     this.rpcClient
        // .command('getdescriptorinfo', descriptor)
        // .then((response) => {
        //   console.log('response getdescriptorinfo', response);
        //   this.rpcClient
        //     .command('listdescriptors')
        //     .then((descriptors) => {
        //       console.log('listdescriptors', descriptors);
        //       const imported = descriptors.descriptors.some(
        //         (desc) => desc.desc === response.descriptor,
        //       );
        //       if (imported) {
        //         if (transaction.txHash) {
        //           this.rpcClient
        //             .command('gettransaction', transaction.txHash)
        //             .then((txs) => {
        //               console.log('txs', txs);
        //               if (txs.confirmations >= 1) {
        //                 console.log('return true');
        //                 return Promise.resolve({ ...transaction, status: 'success' });
        //               }
        //               if (
        //                 txs.confirmations === 0 &&
        //                 transaction.status === 'processing'
        //               ) {
        //                 console.log('here2');
        //                 return Promise.resolve({ ...transaction, status: 'confirmed' });
        //               } else {
        //                 return Promise.resolve(transaction);
        //               }
        //             })
        //             .catch((err) => {
        //               console.log('err txs', err);
        //             });
        //         } else {
        //           console.log('else listunspent');
        //           this.rpcClient
        //             .command('listunspent', 0, 9999999, [
        //               transaction.walletForTransaction.publicKey,
        //             ])
        //             .then((response) => {
        //               console.log('List Unspent Response:', response);
        //               if (response.length === 1) {
        //                 this.rpcClient
        //                   .command('gettransaction', response[0].txid)
        //                   .then((blockchainTransaction) => {
        //                     const tx = new Psbt();
        //                     console.log(
        //                       'blockchainTransaction',
        //                       blockchainTransaction,
        //                     );
        //                     const senderPrivateKey =
        //                       transaction.walletForTransaction.privateKey;
        //                     const privateKey = ECPair.fromPrivateKey(
        //                       Buffer.from(senderPrivateKey, 'hex'),
        //                     );
        //                     console.log(
        //                       'satoshi',
        //                       response[0].amount * 100_000_000,
        //                     );
        //                     const utxo = {
        //                       hash: response[0].txid,
        //                       index: 0,
        //                       script: response.scriptpubkey,
        //                       value: response[0].amount * 100_000_000,
        //                       nonWitnessUtxo: Buffer.from(
        //                         blockchainTransaction.hex,
        //                         'hex',
        //                       ),
        //                     };
        //                     tx.addInput(utxo);
        //                     tx.addOutput({
        //                       address: recipientAddress,
        //                       value: +transaction.payment.amount / 10,
        //                     });
        //                     tx.setMaximumFeeRate(
        //                       response[0].amount * 100_000_000 -
        //                       +transaction.payment.amount / 10,
        //                     );
        //                     tx.signInput(0, privateKey);
        //
        //                     tx.finalizeInput(0);
        //
        //                     const rawHex = tx.extractTransaction(true).toHex();
        //
        //                     this.rpcClient
        //                       .command('sendrawtransaction', rawHex)
        //                       .then((sendResp) => {
        //                         console.log('sendResp', sendResp);
        //                         return Promise.resolve({ ...transaction, txHash: sendResp });
        //                       })
        //                       .catch((err) => {
        //                         console.log('sendErr', err);
        //                       });
        //
        //                     console.log('rawHex', rawHex);
        //                   })
        //                   .catch((err) => {
        //                     console.log('err in gettransaction', err);
        //                     return Promise.resolve(transaction);
        //                   });
        //                 // return { ...transaction, status: 'confirmed', txHash: response[0]?.txid };
        //               }
        //               if (response.length === 0) {
        //                 return Promise.resolve(transaction);
        //               }
        //             })
        //             .catch((err) => {
        //               if (err) {
        //                 console.error('Error: listUnspent', err.message);
        //                 return Promise.resolve(transaction);
        //               }
        //             });
        //         }
        //       } else {
        //         console.log(
        //           'Дескриптор не найден в списке импортированных дескрипторов.',
        //         );
        //         const decoratorsImport = [
        //           {
        //             desc: `${response.descriptor}`,
        //             timestamp: 'now',
        //           },
        //         ];
        //         this.rpcClient
        //           .command('importdescriptors', decoratorsImport)
        //           .then((response) => {
        //             console.log('Import Descriptors Response:', response);
        //             if (response.success) {
        //               this.rpcClient
        //                 .command('listunspent', 0, 9999999, [
        //                   transaction.walletForTransaction.publicKey,
        //                 ])
        //                 .then((response) => {
        //                   console.log('List Unspent Response:', response);
        //                 })
        //                 .catch((err) => {
        //                   if (err) {
        //                     console.error('Error: listUnspent', err.message);
        //                     return;
        //                   }
        //                 });
        //             }
        //           })
        //           .catch((err) => {
        //             if (err) {
        //               console.error('Error: importDescriptors', err.message);
        //               return;
        //             }
        //           });
        //       }
        //     })
        //     .catch((error) => {
        //       console.error('Ошибка при получении списка дескрипторов:', error);
        //     });
        // })
        // .catch((err) => {
        //   console.log('Error: getdescriptorinfo', err);
        // });

      // const httpService = new HttpService();
      //
      // const senderPrivateKey = transaction.walletForTransaction.privateKey;
      //
      // const recipientAddress = transaction.payment.store.wallets.find((el) => el.currency === 'BTC').value;
      //
      // const myTxsUtxoAddress = await addresses.getAddressTxs({ address: transaction.walletForTransaction.publicKey });
      //
      // function addHoursToDate(date: Date, hours: number): Date {
      //   return new Date(new Date(date).setHours(date.getHours() + hours));
      // }
      //
      // if (myTxsUtxoAddress.length === 0) {
      //   if (new Date() > addHoursToDate(transaction?.updated, 2)) {
      //     return { ...transaction, status: 'cancelled' };
      //   }
      //   return transaction;
      // }
      //
      // if (myTxsUtxoAddress.length > 1) {
      //   if (myTxsUtxoAddress[0].status.confirmed) {
      //     return { ...transaction, status: 'success', txHash: myTxsUtxoAddress[0].txid };
      //   } else if (transaction.status === 'processing' && transaction.txHash === null) {
      //     return { ...transaction, status: 'confirmed', txHash: myTxsUtxoAddress[0].txid };
      //   } else {
      //     return transaction
      //   }
      // }
      //
      // const myAddress = await addresses.getAddress({ address: transaction.walletForTransaction.publicKey });
      //
      // console.log('myAddress', myAddress);
      //
      // if (myAddress['mempool_stats'].funded_txo_sum > +transaction.payment.amount / 10) {
      //   if (transaction.status === 'processing' && transaction.txHash === null) {
      //     return { ...transaction, status: 'confirmed', txHash: myTxsUtxoAddress[0].txid };
      //   }
      // }
      //
      // const tx = new Psbt();
      //
      // const txHexMempool = await transactions.getTxHex({ txid: myTxsUtxoAddress[0]?.txid });
      //
      // const voutStatsForUtxo = myTxsUtxoAddress[0].vout.find((el) => el.scriptpubkey_address === myAddress.address);
      //
      // const privateKey = ECPair.fromPrivateKey(Buffer.from(senderPrivateKey, 'hex'));
      //
      // if (myAddress['chain_stats'].funded_txo_sum >= +transaction.payment.amount / 10) {
      //   const voutStatsForUtxo = myTxsUtxoAddress[0].vout.find((el) => el.scriptpubkey_address === myAddress.address);
      //   console.log('find voutStatsForUtxo', voutStatsForUtxo);
      //   const utxo = {
      //     hash: myTxsUtxoAddress[0].txid,
      //     index: 0,
      //     script: Buffer.from(voutStatsForUtxo.scriptpubkey, 'hex'),
      //     value: voutStatsForUtxo.value - 100,
      //     nonWitnessUtxo: Buffer.from(txHexMempool, 'hex'),
      //   };
      //
      //   tx.addInput(utxo);
      //
      //   tx.addOutput({
      //     address: recipientAddress,
      //     value: +transaction.payment.amount / 10,
      //   });
      //
      //   tx.setMaximumFeeRate((voutStatsForUtxo.value - 100) - (+transaction.payment.amount / 10));
      //
      //   tx.signInput(0, privateKey);
      //
      //   tx.finalizeInput(0);
      //
      //   const rawHex = tx.extractTransaction(true).toHex();
      //
      //   if (rawHex) {
      //     try {
      //       const formData = new FormData();
      //       formData.append('tx', rawHex);
      //       console.log('formData', formData);
      //       const resp = await httpService.post('https://blockchain.info/pushtx', formData, {
      //           headers: formData.getHeaders(),
      //         })
      //         .toPromise();
      //       console.log('resp', resp);
      //       if (resp.status === 200) {
      //         return { ...transaction, status: 'confirmed' };
      //       }
      //     } catch (e) {
      //       console.log('e', e);
      //     }
      //   }
      // }
      return transaction
    } catch (e) {
      console.log('e', e);
    }
  }
}

export { Bitcoin };
