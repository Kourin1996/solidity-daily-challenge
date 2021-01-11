# Day11 ERC223 Token

## Target

- To know ERC223

## ERC223

ERC223 is contract for token. The difference of ERC20 is that ERC223 has fallback function. In ERC20, cannot prevent sending tokens to wrong address. ERC223 has same interrace of ERC20 and new functions for fallback.

### Interfaces of new function

#### transfer

Transfer tokens with payload (transfer in ERC20 is also defined in ERC223)

```sol
function transfer(address _to, uint _value, bytes _data) returns (bool)
```

### Interface of function in Receiver contract of ERC223

In ERC20, contract cannot handle tokens when it receives tokens if the contract doesn't define function for tokens. That's the reason ERC20 tokens are lost on sending tokens to contract.  
In ERC223, the receiver contract must implement tokenFallback function. If the contract doesn't implement it, transfer fails.

```sol
function tokenFallback(address _from, uint _value, bytes _data)
```

## References
- https://eips.ethereum.org/EIPS/eip-20
- https://github.com/OpenZeppelin/openzeppelin-contracts/tree/master/contracts/token/ERC20
