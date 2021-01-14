# Day14 Payment Channel

## Description

Payment channels allow participants to transfer Ether off-chain.  
Only result will be committed on-chain.  

The processes through the following steps

- Payer creates contract (open payment channel) and deposit larger amount than the value it wants to send.  
- Payer creates signature from own private key and hash of contract address and transfer amount.  
- Payer sends to payee how much is transferred and signature (off-chain).  
- Payee can verify if signature comes from payer and the transfer amount is correct.  (off-chain)
- Payee call contract function to receive Ether with received signature and transfer amount  
- Contract verify from signature and amount, send ether to payee, and refund remaining deposit to payer  (on-chain)

## References

- https://solidity-jp.readthedocs.io/ja/latest/solidity-by-example.html#micropayment-channel
- https://solidity-by-example.org/app/uni-directional-payment-channel/
