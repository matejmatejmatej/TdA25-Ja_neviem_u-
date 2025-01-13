var express = require('express');
var router = express.Router();

const games = [];

router.get('/games', function(request, response) {
  response.json(games);
});

router.post('/games', function(request, response) {
  const body = request.body;

  if (!body.name) {
    return response.status(400).json({
      error: 'Name missing'
    });
  }

  const newGame = {
    "uuid": games.length + 1,
    "createdAt": null,
    "name": body.name,
    "board": [
      [
        "…"
      ]
    ]
  };

  games.push(newGame);

  response.status(201).json(newGame);
});

module.exports = router;
