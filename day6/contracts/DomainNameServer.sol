pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/math/SafeMath.sol";

contract DomainNameServer {
    using SafeMath for uint256;

    struct Domain {
        address owner;
        string name;
        uint256 expiredAt;
    }

    struct SubDomain {
        string path;
        address value;
    }

    uint256 DOMAIN_REGISTER_PRICE = 1 ether;
    uint256 DOMAIN_RENEW_PRICE = 0.5 ether;
    uint256 DOMAIN_EXPIRATION_DATE = 365 days;

    address owner;

    mapping(string => Domain) domains;
    mapping(string => mapping(string => SubDomain)) subDomains;

    event Register(string domainName, address owner);
    event SetPath(string domainName, string path, address target);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call");
        _;
    }

    modifier onlyDomainOwner(string memory domainName) {
        Domain memory domain = domains[domainName];
        require(
            domain.owner == msg.sender && block.timestamp < domain.expiredAt,
            "Not owner"
        );
        _;
    }

    constructor() public {
        owner = msg.sender;
    }

    function register(string memory domainName) public payable {
        require(msg.value >= DOMAIN_REGISTER_PRICE, "Not enough to register");

        Domain memory domain = domains[domainName];
        require(
            domain.owner == address(0) || block.timestamp > domain.expiredAt,
            "Already registered"
        );

        domains[domainName] = Domain({
            owner: msg.sender,
            name: domainName,
            expiredAt: block.timestamp + DOMAIN_EXPIRATION_DATE
        });
        //todo: need clear paths previous account has registered
        emit Register(domainName, msg.sender);
    }

    function renew(string memory domainName)
        public
        payable
        onlyDomainOwner(domainName)
    {
        require(msg.value >= DOMAIN_RENEW_PRICE, "Not enough to renew");

        Domain storage domain = domains[domainName];
        domain.expiredAt = domain.expiredAt.add(DOMAIN_EXPIRATION_DATE);
    }

    function setPath(
        string memory domainName,
        string memory path,
        address target
    ) public onlyDomainOwner(domainName) {
        subDomains[domainName][path] = SubDomain({path: path, value: target});
        emit SetPath(domainName, path, target);
    }

    function lookUp(string memory domainName, string memory path)
        public
        view
        returns (address)
    {
        Domain memory domain = domains[domainName];
        require(domain.owner != address(0), "Not found");
        require(block.timestamp < domain.expiredAt, "Expired Already");

        SubDomain memory subDomain = subDomains[domainName][path];
        require(
            keccak256(abi.encodePacked(subDomain.path)) ==
                keccak256(abi.encodePacked(path)),
            "Not found"
        );

        return subDomain.value;
    }
}
