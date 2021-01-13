# Day13 ERC-721 NFT

## Description

ERC721 is a standard interface for NFT (Non-fungible token).  
NFTs can represent ownership over digital or physical assets.


### Interfaces of function

#### balanceOf

Returns all NFTs assigned to an owner

```.sol
function balanceOf(address _owner) external view returns (uint256);
```

#### ownerOf

Returns the owner of NFT with given tokenId

```.sol
function ownerOf(uint256 _tokenId) external view returns (address);
```

#### safeTransferFrom

Transfers the ownership of an NFT from one address to another address.  
Throws in the following cases
+ unless msg.sender is the current owner, an authorized operator, or the approved address for this NFT
+ _from is not the current owner
+ _to is zero address
+ `_tokenId` is not a valid NFT
+ When transfer is complete, calls onERC721Received on _to if _to is contract, then throws if return valus is not bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))

```.sol
function safeTransferFrom(address _from, address _to, uint256 _tokenId, bytes data) external payable;

function safeTransferFrom(address _from, address _to, uint256 _tokenId) external payable;
```

#### transferFrom

Transfers ownership of an NFT  
Throws the following cases
+ unless msg.sender is the current owner, an authorized operator, or the approved address for this NFT
+ _from is not the current owner
+ _to is zero address
+ `_tokenId` is not a valid NFT

```.sol
function transferFrom(address _from, address _to, uint256 _tokenId) external payable;
```

#### approve

Changes or reaffirms the approved address for an NFT.  
Throws unless msg.sender is the current owner, an authorized operator, or the approved address for this NFT

```.sol
function approve(address _approved, uint256 _tokenId) external payable;
```

#### setApprovalForAll

Enable or disable approval for a third party ("operator") to manage all of `msg.sender`'s assets

```.sol
function setApprovalForAll(address _operator, bool _approved) external;
```

#### getApproved

Returns the approved address for a single NFT

```.sol
function getApproved(uint256 _tokenId) external view returns (address);
```

#### isApprovedForAll

Returns if an address is an authorized operator for another address

```.sol
function isApprovedForAll(address _owner, address _operator) external view returns (bool);
```


### Interfaces of Event

#### Transfer

Emitted when ownership of any NFT changes by any mechanism

```.sol
event Transfer(address indexed _from, address indexed _to, uint256 indexed _tokenId);
```

#### Approval

Emitted when the approved address for an NFT is changed or reaffirmed

```.sol
event Approval(address indexed _owner, address indexed _approved, uint256 indexed _tokenId);
```


#### ApprovalForAll

Emitted when an operator is enabled or disabled for an owner

```.sol
event ApprovalForAll(address indexed _owner, address indexed _operator, bool _approved);
```

## References

- https://eips.ethereum.org/EIPS/eip-721
- https://github.com/0xcert/ethereum-erc721
