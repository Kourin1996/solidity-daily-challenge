pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/math/SafeMath.sol";

contract TicTacToe {
    using SafeMath for uint256;

    enum Turn {NotStart, Circle, Cross, End}
    enum Piece {Empty, Circle, Cross}

    struct Game {
        address payable circlePlayer;
        address payable crossPlayer;
        uint256 deposit;
        Turn turn;
        uint32 size;
        mapping(uint32 => mapping(uint32 => Piece)) fields;
    }

    mapping(bytes32 => Game) games;

    event Create(bytes32 gameAddress, address owner, uint32 size);
    event Join(bytes32 indexed gameAddress, address challenger);
    event Put(
        bytes32 indexed gameAddress,
        address player,
        Piece piece,
        uint32 x,
        uint32 y
    );
    event End(bytes32 indexed gameAddress, address winner, uint256 prize);

    modifier exists(bytes32 gameAddress) {
        require(
            games[gameAddress].circlePlayer != address(0),
            "Game doesn't exist"
        );
        _;
    }

    constructor() {}

    function create(uint32 size) public payable returns (bytes32) {
        bytes32 gameAddress = getGameAddress(block.timestamp, msg.sender);
        Game storage game = games[gameAddress];
        game.circlePlayer = msg.sender;
        game.deposit = msg.value;
        game.turn = Turn.NotStart;
        game.size = size;
        emit Create(gameAddress, msg.sender, size);
        return gameAddress;
    }

    function join(bytes32 gameAddress) public payable exists(gameAddress) {
        Game storage game = games[gameAddress];
        require(game.crossPlayer == address(0), "Player has already joined");

        game.crossPlayer = msg.sender;
        game.deposit = game.deposit.add(msg.value);
        game.turn = Turn.Circle;
        emit Join(gameAddress, msg.sender);
    }

    function put(
        bytes32 gameAddress,
        uint32 x,
        uint32 y
    ) public exists(gameAddress) {
        Game storage game = games[gameAddress];

        require(game.turn != Turn.NotStart, "This game is not started");
        require(game.turn != Turn.End, "This game has already ended");
        require(
            (game.turn == Turn.Circle && msg.sender == game.circlePlayer) ||
                (game.turn == Turn.Cross && msg.sender == game.crossPlayer),
            "Not your turn"
        );
        require(
            x >= 0 && y >= 0 && x < game.size && y < game.size,
            "Out of field"
        );
        require(
            game.fields[x][y] == Piece.Empty,
            "This square is already filled"
        );

        Piece piece =
            msg.sender == game.circlePlayer ? Piece.Circle : Piece.Cross;
        game.fields[x][y] = piece;
        emit Put(gameAddress, msg.sender, piece, x, y);

        if (isGameEnded(gameAddress, piece, x, y)) {
            address winner = msg.sender;
            game.turn = Turn.End;

            uint256 prize = game.deposit;
            game.deposit = 0;
            game.turn = Turn.End;
            payable(winner).transfer(prize);
            emit End(gameAddress, winner, prize);
        } else {
            game.turn = game.turn == Turn.Circle ? Turn.Cross : Turn.Circle;
            emit Put(gameAddress, msg.sender, piece, x, y);
        }
    }

    function isGameEnded(
        bytes32 gameAddress,
        Piece piece,
        uint32 x,
        uint32 y
    ) internal view returns (bool) {
        uint32 size = games[gameAddress].size;

        bool shouldCheckDiagonal =
            (x == 0 && y == 0) ||
                (x == 0 && y == size - 1) ||
                (x == size - 1 && y == 0) ||
                (x == size - 1 && y == size - 1);
        uint32 pieceCount1 = 0; // horizontal
        uint32 pieceCount2 = 0; // vertical
        uint32 pieceCount3 = 0; // lower right
        uint32 pieceCount4 = 0; // upper right

        for (uint32 i = 0; i < games[gameAddress].size; ++i) {
            pieceCount1 += games[gameAddress].fields[i][y] == piece ? 1 : 0;
            pieceCount2 += games[gameAddress].fields[x][i] == piece ? 1 : 0;
            if (shouldCheckDiagonal) {
                pieceCount3 += games[gameAddress].fields[i][i] == piece ? 1 : 0;
                pieceCount4 += games[gameAddress].fields[i][size - 1 - i] ==
                    piece
                    ? 1
                    : 0;
            }
        }

        return
            pieceCount1 == size ||
            pieceCount2 == size ||
            (shouldCheckDiagonal &&
                (pieceCount3 == size || pieceCount4 == size));
    }

    function getGameAddress(uint256 timestamp, address owner)
        internal
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(timestamp, owner));
    }
}
