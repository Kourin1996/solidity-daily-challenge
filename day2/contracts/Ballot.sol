pragma solidity 0.8.0;

contract Ballot {
    struct Voter {
        uint256 weight;
        bool voted;
        address delegate;
        uint256 vote;
    }

    struct Proposal {
        bytes32 name;
        uint256 voteCount;
    }

    address public chairperson;

    bool isClosed;

    mapping(address => Voter) public voters;

    Proposal[] public proposals;

    constructor(bytes32[] memory proposalNames) {
        chairperson = msg.sender;
        voters[chairperson].weight = 1;
        isClosed = false;

        for (uint256 i = 0; i < proposalNames.length; i++) {
            proposals.push(Proposal({name: proposalNames[i], voteCount: 0}));
        }
    }

    modifier onlyChairperson {
        require(
            msg.sender == chairperson,
            "Only chairperson can call this function."
        );
        _;
    }

    modifier onlyOpened {
        require(!isClosed, "Already closed");
        _;
    }

    event Close();
    event Delegate(address indexed from, address indexed to);
    event Vote(address indexed from, uint256 proposal, uint256 voteCount);

    function close() public onlyChairperson onlyOpened {
        isClosed = true;

        emit Close();
    }

    function giveRightToVote(address voter) public onlyChairperson onlyOpened {
        // There is no undefined nor null in solidity, will get default value instead of returning null value
        require(!voters[voter].voted, "The voter already voted");
        require(voters[voter].weight == 0);

        voters[voter].weight = 1;
    }

    function delegate(address to) public onlyOpened {
        Voter storage sender = voters[msg.sender];
        require(!sender.voted, "You already voted.");

        require(to != msg.sender, "Self-delegation is disallowed");

        // Find the voter that has not delegated
        while (voters[to].delegate != address(0)) {
            require(to != msg.sender, "Found loop in delegation");
        }

        // sender is decleared as storage, therefore assigned value will be set in chain
        sender.voted = true;
        sender.delegate = to;

        Voter storage delegate_ = voters[to];
        if (delegate_.voted) {
            proposals[delegate_.vote].voteCount += sender.weight;
        } else {
            delegate_.weight += sender.weight;
        }

        emit Delegate(msg.sender, to);
    }

    function vote(uint256 proposal) public onlyOpened {
        Voter storage sender = voters[msg.sender];
        require(sender.weight != 0, "Has no right to vote");
        require(!sender.voted, "Already voted");
        sender.voted = true;
        sender.vote = proposal;

        proposals[proposal].voteCount += sender.weight;

        emit Vote(msg.sender, proposal, proposals[proposal].voteCount);
    }

    function winningProposal() public view returns (uint256 winningProposal_) {
        require(isClosed, "Voting is ongoing");

        uint256 winningVoteCount = 0;
        for (uint256 p = 0; p < proposals.length; p++) {
            if (proposals[p].voteCount > winningVoteCount) {
                winningVoteCount = proposals[p].voteCount;
                winningProposal_ = p;
            }
        }
    }

    function winnerName() public view returns (bytes32 winnerName_) {
        require(isClosed, "Voting is ongoing");

        winnerName_ = proposals[winningProposal()].name;
    }
}
