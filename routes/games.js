const { v4: uuidv4 } = require('uuid');

var express = require('express');
var router = express.Router();

// 

const games = [];

router.get('/api/v1/games', function(request, response) {
  response.json(games);
});

router.get('/api/v1/games/:uuid', function(request, response) {
  const game = games.find(g => g.uuid === request.params.uuid);
  if (!game) {
    return response.status(404).json({ code: 404, message: "Game not found" });
  }
  response.json(game);
});

router.post('/api/v1/games', function(request, response) {
  const body = request.body;

  if (!body.name) {
    return response.status(400).json({
      code: 400,
      message: "Bad request: Name is required"
    });
  }

  const newGame = {
    "uuid": uuidv4(),
    "createdAt": 1,
    "updatedAt": 1,
    "name": body.name,
    "difficulty": body.difficulty,
    "gameState": "opening",
    "board": body.board,
  };

  games.push(newGame);

  response.status(201).json(newGame);
});

module.exports = router;
