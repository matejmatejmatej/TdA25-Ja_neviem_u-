const { v4: uuidv4 } = require('uuid');
var express = require('express');
var router = express.Router();

// Simulovaná databáza hier v pamäti
const games = [];

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

  // Ak názov hry nie je poskytnutý, vrátime chybu
  if (!body.name) {
    return response.status(400).json({
      code: 400,
      message: "Bad request: Name is required"
    });
  }

  // Ak nie je poslané herné pole, nastavíme ho na prázdnu mriežku 15x15
  const newBoard = body.board && body.board.length ? body.board : Array.from({ length: 15 }, () => Array(15).fill(''));

  const newGame = {
    uuid: uuidv4(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    name: body.name,
    difficulty: body.difficulty || "normal",
    gameState: "opening",
    board: newBoard, // Priradíme vytvorené alebo poslané herné pole
  };

  games.push(newGame);
  response.status(201).json(newGame);
});

// **Aktualizácia existujúcej hry podľa UUID**
router.put('/api/v1/games/:uuid', function(request, response) {
  const game = games.find(g => g.uuid === request.params.uuid);
  if (!game) {
    return response.status(404).json({ code: 404, message: "Game not found" });
  }

  const body = request.body;

  // Ak je poslané nové herné pole, aktualizujeme ho
  if (body.board) {
    const updatedBoard = body.board.length ? body.board : Array.from({ length: 15 }, () => Array(15).fill(''));
    game.board = updatedBoard;
  }

  if (body.name !== undefined) game.name = body.name;
  if (body.difficulty !== undefined) game.difficulty = body.difficulty;

  game.updatedAt = Date.now();

  response.json(game);
});

// **Vymazanie hry podľa UUID**
router.delete('/api/v1/games/:uuid', function(request, response) {
  const index = games.findIndex(g => g.uuid === request.params.uuid);
  if (index === -1) {
    return response.status(404).json({ code: 404, message: "Game not found" });
  }

  games.splice(index, 1);
  response.status(204).send(); // 204 No Content
});

// **Nový endpoint pre zobrazenie HTML stránky hry s mriežkou**
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