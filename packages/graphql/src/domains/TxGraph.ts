import { gql } from 'graphql-request';
import { groupBy } from 'lodash';
import { Transaction } from '../sdk';
import { parseAddressParam } from '../utils/address';
import { Domain } from '../utils/domain';

export class TxGraphDomain extends Domain<any> {
  static createResolvers() {
    const domain = new TxGraphDomain();
    return {
      ...domain.createResolver('txGraph', 'createTxGraph'),
    };
  }

  async createTxGraph() {
    const address = parseAddressParam(this.args.address);
    const allTransactions = (await this.getTransactions(
      address,
    )) as Transaction[];

    const inputs = allTransactions.flatMap((t) =>
      t.inputs
        ?.map((i) => ({
          ...i,
          timestamp: (t.status as any)?.time,
          txHash: t.id,
        }))
        .filter(Boolean),
    );
    const outputs = allTransactions.flatMap((t) =>
      t.outputs
        ?.map((o) => ({
          ...o,
          timestamp: (t.status as any)?.time,
          txHash: t.id,
        }))
        .filter(Boolean),
    );

    const groupedInputsByOwner = groupBy(
      inputs,
      (i: any) => i?.owner || i?.sender || i?.contract?.id,
    );
    const _groupedOutputsByOwner = groupBy(
      outputs,
      (o: any) => o?.to || o?.recipient || o?.contract?.id,
    );

    const from = Object.entries(groupedInputsByOwner).map(([key, value]) => {
      return {
        __typename: 'TxGraphItemNode',
        id: key,
        transactions: value.map((v: any) => {
          const from = v.owner ?? v.sender ?? v.contract?.id;
          const to = address;
          const assetId = v.assetId;
          const amount = v.amount;
          const isContract = Boolean(v.contract);
          const isPredicate = Boolean(v.predicate);
          const timestamp = v.timestamp;
          const txHash = v.txHash;
          const utoxId = v.utxoId;
          return {
            __typename: 'TxGraphItem',
            from,
            to,
            assetId,
            amount,
            isContract,
            isPredicate,
            timestamp,
            txHash,
            utoxId,
          };
        }),
      };
    });

    const to = Object.entries(_groupedOutputsByOwner).map(([key, value]) => {
      return {
        id: key,
        transactions: value.map((v: any) => {
          const from = address;
          const to = v.to || v.recipient || v.contract?.id;
          const assetId = v.assetId;
          const amount = v.amount;
          const isContract = Boolean(v.contract);
          const timestamp = v.timestamp;
          const txHash = v.txHash;
          return {
            from,
            to,
            assetId,
            amount,
            isContract,
            timestamp,
            txHash,
          };
        }),
      };
    });

    return {
      transactions: allTransactions,
      from: from.filter((i) => i.id !== address),
      to: to.filter((i) => i.id !== address),
    };
  }

  private async getTransactions(address: String) {
    const query = gql`
      query addressTxs($address: Address!) {
        transactionsByOwner(owner: $address, first: 1000) {
          nodes {
            ...TransactionItem
          }
          pageInfo {
            hasNextPage
          }
        }
      }
      ${fragment}
    `;

    let txs = [] as any[];
    const data = await this.query<any>(query, {
      address: address,
    });

    if (data.transactionsByOwner.nodes.length > 0) {
      txs = data.transactionsByOwner.nodes;
    }
    if (data.transactionsByOwner.pageInfo.hasNextPage) {
      const res = await this.getTransactions(address);
      txs = txs.concat(res);
    }

    return txs;
  }
}

const fragment = `
fragment TransactionContractItem on Contract {
  __typename
  id
}

fragment TransactionInput on Input {
  __typename
  ... on InputCoin {
    amount
    assetId
    owner
    predicate
    predicateData
    txPointer
    utxoId
    witnessIndex
  }
  ... on InputContract {
    utxoId
    balanceRoot
    txPointer
    contract {
      ...TransactionContractItem
    }
  }
  ... on InputMessage {
    sender
    recipient
    amount
    nonce
    data
    predicate
    predicateData
  }
}

fragment TransactionOutput on Output {
  __typename
  ... on CoinOutput {
    to
    amount
    assetId
  }
  ... on ContractOutput {
    inputIndex
    balanceRoot
  }
  ... on ChangeOutput {
    to
    amount
    assetId
  }
  ... on VariableOutput {
    to
    amount
    assetId
  }
  ... on ContractCreated {
    contract {
      ...TransactionContractItem
    }
  }
}

fragment TransactionReceipt on Receipt {
  __typename
  contract {
    ...TransactionContractItem
  }
  to {
    ...TransactionContractItem
  }
  pc
  is
  toAddress
  amount
  assetId
  gas
  param1
  param2
  val
  ptr
  digest
  reason
  ra
  rb
  rc
  rd
  len
  receiptType
  result
  gasUsed
  data
  sender
  recipient
  nonce
  contractId
  subId
}

fragment TransactionStatus on TransactionStatus {
  __typename
  ... on SqueezedOutStatus {
    reason
  }
  ... on SuccessStatus {
    time
    block {
      id
      header {
        id
        height
        daHeight
        applicationHash
        messageReceiptRoot
        messageReceiptCount
        time
      }
    }
    programState {
      data
    }
  }
  ... on FailureStatus {
    time
    programState {
      data
    }
  }
  ... on SubmittedStatus {
    time
  }
}

fragment TransactionItem on Transaction {
  # Custom resolvers
  id
  __typename
  gasPrice
  maturity
  txPointer
  isScript
  isCreate
  isMint
  witnesses
  receiptsRoot
  script
  scriptData
  bytecodeWitnessIndex
  bytecodeLength
  salt
  storageSlots
  rawPayload
  mintAmount
  mintAssetId
  inputContract {
    contract {
      id
    }
  }
  outputContract {
    inputIndex
  }

  status {
    ...TransactionStatus
  }
  inputAssetIds
  inputContracts {
    ...TransactionContractItem
  }
  inputs {
    ...TransactionInput
  }
  outputs {
    ...TransactionOutput
  }
  receipts {
    ...TransactionReceipt
  }
}
`;