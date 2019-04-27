(function() {

  const GAME_WIDTH = 700;
  const GAME_HEIGHT = 710;
  const PADDING = {
    LEFT: 30,
    RIGHT: 30,
    TOP: 80,
    BOTTOM: 95,
  };
  const LAYER = {
    DEBUG: 100,
    GUI: 10,
    DIALOG: 5,
    PREFAB: 2,
    FACTORY: 1,
  }
  const FACTORY_WIDTH = GAME_WIDTH - PADDING.LEFT - PADDING.RIGHT;
  const FACTORY_HEIGHT = GAME_HEIGHT - PADDING.TOP - PADDING.BOTTOM;
  const TILE_WIDTH = 32;
  const TILE_HEIGHT = 32;
  const Mode = {
    DEFAULT: 'default',
    BUILDING: 'building',
    ROTATING: 'rotating',
  };
  const CONFIGURABLE_BLOCKS = ['producer', 'forge', 'assembly', 'filter'];
  const gameScene = new Phaser.Scene('Game');

  gameScene.preload = function() {
    this.load.image('empty', 'assets/images/empty.png');
    this.load.image('producer', 'assets/images/producer.png');
    this.load.image('delivery', 'assets/images/delivery.png');
    this.load.image('forge', 'assets/images/forge.png');
    this.load.image('belt', 'assets/images/belt.png');
    this.load.image('assembly', 'assets/images/assembly.png');
    this.load.image('spliter', 'assets/images/spliter.png');
    this.load.image('inserter', 'assets/images/inserter.png');
    this.load.image('chest', 'assets/images/chest.png');
    this.load.image('filter', 'assets/images/filter.png');
    this.load.image('frame', 'assets/images/frame.png');
    this.load.image('build-icon', 'assets/images/build.png');
    this.load.image('buildmenu', 'assets/images/buildmenu.png');
  };

  gameScene.create = function() {
    this.mode = Mode.DEFAULT;
    this.kb = this.input.keyboard.createCursorKeys();
    // Background GUI
    this.add.sprite(0, 0, 'frame').setOrigin(0, 0).setDepth(LAYER.GUI);
    this.menuButtons = [];
    this.menuButtons.push(
      this.add.sprite(30, 640, 'build-icon')
        .setOrigin(0, 0).setDepth(LAYER.GUI));

    this.createGrid();

    // create prefabs
    this.prefabs = {};
    ['producer', 'delivery', 'forge', 'belt', 'assembly', 'spliter', 'inserter', 'chest', 'filter'].forEach((key) => {
      this.prefabs[key] =
        this.createGridSprite(key, 0, 0).setAlpha(0).setDepth(LAYER.PREFAB);
    });

    // top level UIs
    this.buildMenuBck =
      this.add.sprite(PADDING.LEFT, PADDING.TOP, 'buildmenu');
    this.buildMenuOptions = [
      this.add.sprite(80, 120, 'producer'),
      this.add.sprite(200, 120, 'delivery'),
      this.add.sprite(320, 120, 'forge'),
      this.add.sprite(80, 240, 'belt'),
      this.add.sprite(200, 240, 'assembly'),
      this.add.sprite(320, 240, 'spliter'),
      this.add.sprite(80, 360, 'inserter'),
      this.add.sprite(200, 360, 'chest'),
      this.add.sprite(320, 360, 'filter'),
    ].map((option) => option
       .setScale(4)
       .setScaleMode(Phaser.ScaleModes.NEAREST)
    );

    this.buildMenuContainer = [
      this.buildMenuBck,
      ...this.buildMenuOptions
    ].map((opt) => opt.setOrigin(0, 0).setAlpha(0).setDepth(LAYER.DIALOG));

    this.debugText = this.add.text(16, 16, '').setDepth(LAYER.DEBUG);
    this.input.on('pointerdown', this.handleMouseDown.bind(this));
    this.input.on('pointerup', this.handleMouseUp.bind(this));
  };

  gameScene.update = function() {
    this.mouseGridCoords = this.getMouseCoords();
    this.debugText.setText('Mouse: (X:' + this.mouseGridCoords.x +
      ', Y:' + this.mouseGridCoords.y + ')');

    switch (this.mode) {
      case Mode.BUILDING:
        const prefabPos = this.getScreenCoords(
          this.mouseGridCoords.x, this.mouseGridCoords.y);
        this.currentPrefab.setPosition(prefabPos.x , prefabPos.y);
        break;
      case Mode.ROTATING:
        // 4 quadrants around the tile. check where the mouse is to rotate
        // current tile
        this.rotateTile();
    }

  };

  gameScene.handleMouseDown = function(pointer) {
    if (this.mode === Mode.BUILDING &&
        this.mouseGridCoords.x > -1 &&
        this.mouseGridCoords.x < this.grid.length &&
        this.mouseGridCoords.y > -1 &&
        this.mouseGridCoords.y < this.grid[0].length) {
      const tile = this.grid[this.mouseGridCoords.x][this.mouseGridCoords.y];
      tile.block = this.createGridSprite(
        this.currentPrefab.texture.key, tile.x, tile.y);
      tile.configured = !CONFIGURABLE_BLOCKS.includes(this.currentPrefab.texture.key);
      if (!tile.configured) {
        tile.block.tint = 0.9 * 0xff0000; // red tint
      }
      this.mode = Mode.ROTATING;
      this.currentPrefab.setAlpha(0);
      delete(this.currentPrefab);
      this.rotatingTile = tile;
    }
  };

  gameScene.showBuildMenu = function() {
    this.buildMenuContainer.forEach((el) => el.setAlpha(1));
    this.showingBuildMenu = true;
  }

  gameScene.hideBuildMenu = function() {
    this.buildMenuContainer.forEach((el) => el.setAlpha(0));
    this.showingBuildMenu = false;
  }

  gameScene.findMenuButtonClicked = function(options) {
    return options.find((btn) =>
      this.input.activePointer.x > btn.x &&
      this.input.activePointer.y > btn.y &&
      this.input.activePointer.x < btn.x + btn.width * btn.scaleX &&
      this.input.activePointer.y < btn.y + btn.height * btn.scaleY
    );
  }

  gameScene.handleMouseUp = function(pointer) {
    if (this.mode === Mode.ROTATING) {
      this.mode = Mode.DEFAULT;
    } else if (this.mode === Mode.DEFAULT) {
      // first handle clicks on GUI
      const buttonClicked = this.findMenuButtonClicked(this.menuButtons);
      if (buttonClicked) {
        switch(buttonClicked.texture.key) {
          case 'build-icon':
            this.showBuildMenu();
            break;
        }
        return;
      }
      // if we're showing the build menu, handle that
      if (this.showingBuildMenu) {
        const buttonClicked = this.findMenuButtonClicked(this.buildMenuOptions);
        if (buttonClicked) {
          const key = buttonClicked.texture.key;
          this.hideBuildMenu();
          this.mode = Mode.BUILDING;
          this.currentPrefab = this.prefabs[key];
          this.currentPrefab.setAlpha(0.5);
          return;
        }
      }
      // finally handle clicking on blocks
      const tile = this.grid[this.mouseGridCoords.x][this.mouseGridCoords.y];
      if (tile.block && CONFIGURABLE_BLOCKS.includes(tile.block.texture.key)) {
        switch (tile.block.texture.key) {
          case 'producer':
            console.log("Clicked producer");
            break;
        }
      }
    }
  };

  gameScene.rotateTile = function() {
    const m = {
      x: this.input.activePointer.x,
      y: this.input.activePointer.y,
    };
    const t = this.getScreenCoords(this.rotatingTile);
    if (Math.abs(m.x-t.x) > this.rotatingTile.block.width ||
        Math.abs(m.y-t.y) > this.rotatingTile.block.height) { // don't make any changes if we're too close to where we want to put it
      if (Math.abs(m.x-t.x) > Math.abs(m.y-t.y)) {
        this.rotatingTile.block.rotation =
          Math.PI/2 * ((m.x - t.x > 0) ? -1 : 1);
      } else if (Math.abs(m.x-t.x) < Math.abs(m.y-t.y)) {
        this.rotatingTile.block.rotation =
          Math.PI * ((m.y - t.y > 0) ? 0 : 1);
      }
    }

  };

  gameScene.getScreenCoords = function(gridX, gridY) {
    if (gridY === undefined) return this.getScreenCoords(gridX.x, gridX.y);
    return {
      x: PADDING.LEFT + gridX * TILE_WIDTH + TILE_WIDTH / 2,
      y: PADDING.TOP + gridY * TILE_HEIGHT + TILE_HEIGHT / 2,
    };
  };

  gameScene.getMouseCoords = function() {
    return {
      x: Math.floor((this.input.activePointer.x - PADDING.LEFT) / TILE_WIDTH),
      y: Math.floor((this.input.activePointer.y - PADDING.TOP) / TILE_HEIGHT),
    };
  }

  gameScene.createGridSprite = function(name, gridX, gridY) {
    const coords = this.getScreenCoords(gridX, gridY);
    return this.add.sprite(coords.x, coords.y, name)
           .setScale(2)
           .setScaleMode(Phaser.ScaleModes.NEAREST)
           .setDepth(LAYER.FACTORY)
  };

  gameScene.createGrid = function() {
    this.grid = [];
    for (let i=0; i < FACTORY_WIDTH / TILE_WIDTH; i++) {
      if (!this.grid[i]) {
        this.grid[i] = [];
      }
      for (let j=0; j < FACTORY_HEIGHT / TILE_HEIGHT; j++) {
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
