(function() {

  const GAME_WIDTH = 640;
  const GAME_HEIGHT = 480;
  const TILE_WIDTH = 32;
  const TILE_HEIGHT = 32;
  const Mode = {
    DEFAULT: 'default',
    BUILDING: 'building',
    ROTATING: 'rotating',
  };
  const gameScene = new Phaser.Scene('Game');

  gameScene.preload = function() {
    this.load.image('empty', 'assets/images/empty.png');
    this.load.image('producer', 'assets/images/producer.png');
  };

  gameScene.create = function() {
    this.kb = this.input.keyboard.createCursorKeys();
    this.createGrid();
    this.mode = Mode.DEFAULT;
    this.prefab = this.createGridSprite('producer', 0, 0).setAlpha(0);

    this.debugText = this.add.text(16, 16, '');
    this.input.on('pointerdown', this.handleMouseDown.bind(this));
    this.input.on('pointerup', this.handleMouseUp.bind(this));
  };

  gameScene.update = function() {
    this.mouseGridCoords = this.getMouseCoords();
    this.debugText.setText('Mouse: (X:' + this.mouseGridCoords.x +
      ', Y:' + this.mouseGridCoords.y + ')');

    this.prefab.setActive(this.mode === Mode.BUILDING);

    switch (this.mode) {
      case Mode.DEFAULT:
        if (this.kb.space.isDown) {
          this.mode = Mode.BUILDING;
          this.prefab.setActive(true).setAlpha(0.5);
        }
        break;
      case Mode.BUILDING:
        const prefabPos = this.getScreenCoords(
          this.mouseGridCoords.x, this.mouseGridCoords.y);
        this.prefab.setPosition(prefabPos.x , prefabPos.y);
        break;
      case Mode.ROTATING:
        // 4 quadrants around the tile. check where the mouse is to rotate
        // current tile
        this.rotateTile();
    }

  };

  gameScene.handleMouseDown = function(pointer) {
    if (this.mode === Mode.BUILDING) {
      const tile = this.grid[this.mouseGridCoords.x][this.mouseGridCoords.y];
      tile.block = this.createGridSprite('producer', tile.x, tile.y);
      this.mode = Mode.ROTATING;
      this.prefab.setActive(false);
      this.rotatingTile = tile;
    }
  };

  gameScene.handleMouseUp = function(pointer) {
    if (this.mode === Mode.ROTATING) {
      this.mode = Mode.DEFAULT;
    }
  };

  gameScene.rotateTile = function() {
    const m = {
      x: this.input.activePointer.x,
      y: this.input.activePointer.y,
    };
    const t = this.getScreenCoords(this.rotatingTile);
    if (Math.abs(m.x-t.x) > Math.abs(m.y-t.y)) {
      this.rotatingTile.block.rotation =
        Math.PI/2 * ((m.x - t.x > 0) ? -1 : 1);
    } else if (Math.abs(m.x-t.x) < Math.abs(m.y-t.y)) {
      this.rotatingTile.block.rotation =
        Math.PI * ((m.y - t.y > 0) ? 0 : 1);
    }

  };

  gameScene.getScreenCoords = function(gridX, gridY) {
    if (gridY === undefined) return this.getScreenCoords(gridX.x, gridX.y);
    return {
      x: gridX * TILE_WIDTH + TILE_WIDTH / 2,
      y: gridY * TILE_HEIGHT + TILE_HEIGHT / 2,
    };
  };

  gameScene.getMouseCoords = function() {
    return {
      x: Math.floor(this.input.activePointer.x / TILE_WIDTH),
      y: Math.floor(this.input.activePointer.y / TILE_HEIGHT),
    };
  }

  gameScene.createGridSprite = function(name, gridX, gridY) {
    const coords = this.getScreenCoords(gridX, gridY);
    return this.add.sprite(coords.x, coords.y, name)
           .setScale(2)
           .setScaleMode(Phaser.ScaleModes.NEAREST)
  };

  gameScene.createGrid = function() {
    this.grid = [];
    for (let i=0; i < GAME_WIDTH / TILE_WIDTH; i++) {
      if (!this.grid[i]) {
        this.grid[i] = [];
      }
      for (let j=0; j < GAME_HEIGHT / TILE_HEIGHT; j++) {
        this.grid[i][j] = {
          x: i,
          y: j,
          floor: this.createGridSprite('empty', i, j)
        }
      }
    }
  }


  new Phaser.Game({
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    pixelArt: true,
    physics: {
      default: 'arcade',
    },
    scene: [gameScene],
  });


})();
