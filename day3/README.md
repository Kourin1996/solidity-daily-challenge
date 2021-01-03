# Day3 ERC20 Token

## Biding target

- To know ERC20

## ERC20

A interface specification of tokens.  
The reasons of using same interface for token
* Allow tokens to be handled in same wallet application

### Interfaces of function

#### name

Return the name of the token

```sol
function name() public view returns (string)
```

#### symbol

Return the symbol of the token like BTC, ETH

```sol
function symbol() public view returns (string)
```

#### decimals

Returns the number of decimals the token uses
  - e.g. if it returns 4 decimals and get 1 token as amount, which means the amount of token in contract is 1000

```sol
function decimals() public view returns (uint8)
```

#### totalSupply

Returns the total of supply

```sol
function totalSupply() public view returns (uint256)
```

#### balanceOf

Returns the account balance of given address

```sol
function balanceOf(address _owner) public view returns (uint256 balance)
```

#### transfer

Transfers _value amount of tokens to address _to
* Must fire the Transfer event
* Must throw if the caller does not have enough balance

```sol
function transfer(address _to, uint256 _value) public returns (bool success)
```

#### transferFrom

Transfers _value amount of tokens from address _from to address _to
* Must fire the Transfer event
* Must throw unless the _from account has deliberately authorized the sender of the message via some mechanism

```sol
function transferFrom(address _from, address _to, uint256 _value) public returns (bool success)
```

#### approve

Allows _spender to withdraw from your account multiple times, up to the _value amount

```sol
function approve(address _spender, uint256 _value) public returns (bool success)
```

#### allowance

Returns the amount which _spender is still allowed to withdraw from _owner

```sol
function allowance(address _owner, address _spender) public view returns (uint256 remaining)
```

### Interfaces of Event

#### Transfer

Be emitted when tokens are transferred, including zero value transfers
+ Transfer event with the _from address set to 0x0 when tokens are created

```sol
event Transfer(address indexed _from, address indexed _to, uint256 _value)
```

#### Approval

Be emitted on any successful call to approve

```sol
event Approval(address indexed _owner, address indexed _spender, uint256 _value)
```

## References
- https://eips.ethereum.org/EIPS/eip-20
- https://github.com/OpenZeppelin/openzeppelin-contracts/tree/master/contracts/token/ERC20
