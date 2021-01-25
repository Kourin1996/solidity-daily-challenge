# Day18 ERC-1155 Multi Token

## Description

A contract can handle only one token in ERC20, which is a standard interface for fungible token, and ERC721, which is a standard interface for NFT.  
In contrast, in ERC-1155, a contract can handle multiple tokens.  
A contract implemented ERC-1155 can consists of multiple tokens including fungible token and NFT.  
User can transfer multiple types of tokens in a transaction.  
In ERC1155 token, metadata function like name(), symbol() will be removed.  
Instead of these functions, contract can return uri by


### Interfaces of function in ERC1166



### Interfaces of Event in ERC1155

## References

- https://eips.ethereum.org/EIPS/eip-1155
