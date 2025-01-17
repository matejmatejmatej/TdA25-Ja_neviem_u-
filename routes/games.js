const { v4: uuidv4 } = require('uuid');
var express = require('express');
var router = express.Router();

// Simulovaná databáza hier v pamäti
const games = [];

// Pomocné funkcie na validáciu a klasifikáciu
function validateGame(game) {
  const validSymbols = ['X', 'O', ''];
  const board = game.board;

  // Validácia veľkosti dosky
  if (board.length !== 15 || board.some(row => row.length !== 15)) {
    return { valid: false, message: "Invalid board size. The board must be 15x15." };
  }

  const flatBoard = board.flat();
  // Validácia symbolov
  if (flatBoard.some(cell => !validSymbols.includes(cell))) {
    return { valid: false, message: "Invalid symbols on the board. Only 'X', 'O', and '' are allowed." };
  }

  const xCount = flatBoard.filter(cell => cell === 'X').length;
  const oCount = flatBoard.filter(cell => cell === 'O').length;

  // Validácia počtu symbolov
  if (xCount !== oCount && xCount !== oCount + 1) {
    return { valid: false, message: "Invalid move sequence. 'X' must start and can only have one more move than 'O'." };
  }

  return { valid: true };
}

function classifyGameState(game) {
  const moves = game.board.flat().filter(cell => cell === 'X' || cell === 'O').length;

  if (isEndgame(game.board)) {
    return "endgame";
  } else if (moves <= 5) {
    return "opening";
  } else {
    return "midgame";
  }
}

function isEndgame(board) {
  const directions = [
    [0, 1], [1, 0], [1, 1], [1, -1]
  ];

  const isWinningSequence = (x, y, dx, dy, player) => {
    let count = 0;
    for (let i = 0; i < 5; i++) {
      const nx = x + i * dx;
      const ny = y + i * dy;
      if (nx >= 0 && nx < 15 && ny >= 0 && ny < 15 && board[nx][ny] === player) {
        count++;
      } else {
        break;
      }
    }
    return count === 5;
  };

  const isBlocked = (x, y, dx, dy, player) => {
    let leftBlocked = false;
    let rightBlocked = false;

    const checkCell = (nx, ny) => {
      return nx < 0 || ny < 0 || nx >= 15 || ny >= 15 || (board[nx][ny] !== '' && board[nx][ny] !== player);
    };

    if (checkCell(x - dx, y - dy)) leftBlocked = true;
    if (checkCell(x + 4 * dx + dx, y + 4 * dy + dy)) rightBlocked = true;

    return leftBlocked && rightBlocked;
  };

  for (let x = 0; x < 15; x++) {
    for (let y = 0; y < 15; y++) {
      if (board[x][y] === 'X' || board[x][y] === 'O') {
        for (const [dx, dy] of directions) {
          if (isWinningSequence(x, y, dx, dy, board[x][y]) && !isBlocked(x, y, dx, dy, board[x][y])) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

// Endpointy

// Získanie všetkých hier
router.get('/api/v1/games', function(request, response) {
  response.json(games);
});

// Získanie konkrétnej hry
router.get('/api/v1/games/:uuid', function(request, response) {
  const game = games.find(g => g.uuid === request.params.uuid);
  if (!game) {
    return response.status(404).json({ code: 404, message: "Game not found" });
  }
  response.json(game);
});

// Vytvorenie novej hry
router.post('/api/v1/games', function(request, response) {
  const body = request.body;

  if (!body.name) {
    return response.status(400).json({
      code: 400,
      message: "Bad request: Name is required"
    });
  }

  const newBoard = body.board && body.board.length ? body.board : Array.from({ length: 15 }, () => Array(15).fill(''));

  const newGame = {
    uuid: uuidv4(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    name: body.name,
    difficulty: body.difficulty || "normal",
    board: newBoard,
  };

  const validation = validateGame(newGame);
  if (!validation.valid) {
    return response.status(422).json({
      code: 422,
      message: validation.message
    });
  }

  newGame.gameState = classifyGameState(newGame);

  games.push(newGame);
  response.status(201).json(newGame);
});

// Aktualizácia hry
router.put('/api/v1/games/:uuid', function(request, response) {
  const game = games.find(g => g.uuid === request.params.uuid);
  if (!game) {
    return response.status(404).json({ code: 404, message: "Game not found" });
  }

  const body = request.body;

  if (body.board) {
    const validation = validateGame({ board: body.board });
    if (!validation.valid) {
      return response.status(422).json({ code: 422, message: validation.message });
    }
    game.board = body.board;
  }

  if (body.name !== undefined) game.name = body.name;
  if (body.difficulty !== undefined) game.difficulty = body.difficulty;

  game.updatedAt = Date.now();
  game.gameState = classifyGameState(game);

  response.json(game);
});

// Vymazanie hry
router.delete('/api/v1/games/:uuid', function(request, response) {
  const index = games.findIndex(g => g.uuid === request.params.uuid);
  if (index === -1) {
    return response.status(404).json({ code: 404, message: "Game not found" });
  }

  games.splice(index, 1);
  response.status(204).send(); // 204 No Content
});

// Nový endpoint pre zobrazenie HTML stránky hry s mriežkou
router.get('/game/:uuid', function(request, response) {
  const game = games.find(g => g.uuid === request.params.uuid);
  
  if (!game) {
    return response.status(404).send('<h1>Game not found</h1>');
  }

  // Konverzia mriežky na HTML tabuľku
  const boardHtml = game.board.map(row => 
    `<tr>${row.map(cell => `<td>${cell || '&nbsp;'}</td>`).join('')}</tr>`
  ).join('');

  response.send(`
    <html>
        <head>
            <title>${game.name}</title>
            <style>
                table { border-collapse: collapse; }
                td { width: 30px; height: 30px; border: 1px solid black; text-align: center; }
                Body{
                padding: 50px;
                font: 14px "Lucida Grande", Helvetica, Arial, sans-serif;
                display: grid;
                justify-content: center;
                background-color: #1E2328;
                color: #b1b1b1;
                }
            </style>
        </head>

        <body>
            <h1>Game: ${game.name}</h1>
            <p>Difficulty: ${game.difficulty}</p>
            <p>State: ${game.gameState}</p>
            <p>Created At: ${new Date(game.createdAt).toLocaleString()}</p>
            <p>Updated At: ${new Date(game.updatedAt).toLocaleString()}</p>
            <h2>Board:</h2>
            <table>${boardHtml}</table>
        </body>
    </html>
  `);
});

module.exports = router;
