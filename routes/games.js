const { v4: uuidv4 } = require('uuid');
var express = require('express');
var router = express.Router();

// Simulovaná databáza hier v pamäti
const games = [];

// Funkcia na validáciu herného poľa
function isValidBoard(board) {
  if (!Array.isArray(board) || board.length !== 15 || board.some(row => !Array.isArray(row) || row.length !== 15)) {
    return false;
  }
  return board.flat().every(cell => ['X', 'O', ''].includes(cell));
}

// Funkcia na určenie stavu hry
function determineGameState(game) {
  const moves = game.board.flat().filter(cell => cell !== '').length;
  if (moves <= 5) return "opening";
  if (checkEndgame(game.board)) return "endgame";
  return "midgame";
}

// Funkcia na kontrolu koncovky
function checkEndgame(board) {
  for (let i = 0; i < 15; i++) {
    for (let j = 0; j < 15; j++) {
      if (checkWin(board, i, j)) return true;
    }
  }
  return false;
}

// Funkcia na overenie výhry
function checkWin(board, row, col) {
  const player = board[row][col];
  if (player === '') return false;

  const directions = [
    [1, 0], [0, 1], [1, 1], [1, -1]
  ];
  for (const [dx, dy] of directions) {
    let count = 1;
    for (let step = 1; step < 5; step++) {
      const x = row + dx * step;
      const y = col + dy * step;
      if (x < 0 || x >= 15 || y < 0 || y >= 15 || board[x][y] !== player) break;
      count++;
    }
    if (count === 5) return true;
  }
  return false;
}

// Získanie všetkých hier
router.get('/api/v1/games', function(request, response) {
  response.json(games);
});

// Získanie konkrétnej hry podľa UUID
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
    return response.status(400).json({ code: 400, message: "Bad request: Name is required" });
  }

  const newBoard = body.board && isValidBoard(body.board) ? body.board : Array.from({ length: 15 }, () => Array(15).fill(''));
  const newGame = {
    uuid: uuidv4(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    name: body.name,
    difficulty: body.difficulty || "normal",
    board: newBoard,
  };

  newGame.gameState = determineGameState(newGame);
  games.push(newGame);
  response.status(201).json(newGame);
});

// Aktualizácia existujúcej hry podľa UUID
router.put('/api/v1/games/:uuid', function(request, response) {
  const game = games.find(g => g.uuid === request.params.uuid);
  if (!game) {
    return response.status(404).json({ code: 404, message: "Game not found" });
  }

  const body = request.body;
  if (body.board && !isValidBoard(body.board)) {
    return response.status(422).json({ code: 422, message: "Invalid board format" });
  }
  if (body.board) game.board = body.board;
  if (body.name !== undefined) game.name = body.name;
  if (body.difficulty !== undefined) game.difficulty = body.difficulty;

  game.updatedAt = Date.now();
  game.gameState = determineGameState(game);

  response.json(game);
});

// Vymazanie hry podľa UUID
router.delete('/api/v1/games/:uuid', function(request, response) {
  const index = games.findIndex(g => g.uuid === request.params.uuid);
  if (index === -1) {
    return response.status(404).json({ code: 404, message: "Game not found" });
  }

  games.splice(index, 1);
  response.status(204).send();
});

// Endpoint pre HTML zobrazenie hry
router.get('/game/:uuid', function(request, response) {
  const game = games.find(g => g.uuid === request.params.uuid);
  
  if (!game) {
    return response.status(404).send('<h1>Game not found</h1>');
  }

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
                body {
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
