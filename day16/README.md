# Day16 ERC777

## Description

ERC777 defines standard interfaces and behaviors for token contracts.  
ERC777 has new functionalities compared with ERC20

## Advantages

- Can send tokens by send(dest, value, data), which is similar interface to function for Ether
- Both contracts and EOAs can approve and reject which tokens they send by calling tokensToSend
- Both contracts and EOAs can approve and reject which tokens they receive by calling tokensReceived
- The tokensReceived hook allows to send tokens to a contract and notify it in a single transaction
  + ERC20 requires 2 transactions, approve/transferFrom
- The holder can “authorize” and “revoke” operators which can send tokens on their behalf. These operators are intended to be verified contracts such as an exchange, a cheque processor or an automatic charging system.
- Every token transaction contains data and operatorData bytes fields to be used freely to pass data from the holder and the operator, respectively
- It is backward compatible with wallets that do not contain the tokensReceived hook function by deploying a proxy contract implementing the tokensReceived hook for the wallet.

## References

- https://eips.ethereum.org/EIPS/eip-777
- https://github.com/OpenZeppelin/openzeppelin-contracts/tree/master/contracts/token/ERC777
