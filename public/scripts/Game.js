window.onload = function () {

	var game = new Phaser.Game(800, 480, Phaser.AUTO, "Game", {
		preload: preload,
		create: create,
		update: update,
		render: render
	});

	//preload function
	function preload() {

		game.load.image('Bar', 'Assets/Bar.png');
		game.load.spritesheet('Mbutton', 'Assets/Movebutton.png', 150, 100);
		game.load.spritesheet('Bbutton', 'Assets/Bombebutton.png', 100, 100);
		game.load.spritesheet('Player', 'Assets/Ball.png', 16, 16);
		game.load.spritesheet('Bomb', 'Assets/Bomb.png', 8, 8);
		game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
		game.scale.fullScreenScaleMode = Phaser.ScaleManager.EXACT_FIT;

	}



	var debug = {
		overlay: false
	};

	var life = 100;
	var lifeText;
	var player;
	var platforms;
	var bombs;
	var bombLifetime = 3000;
	var bombTime = 0; //storage var for bomb drop time
	var bombOffsetTime = 150; //var for bombDrop offset
	var BtnRight = false;
	var BtnLeft = false;
	var BtnBomb = false;


	//Initial creation of all game objects
	function create() {

		//go fullscreen if not running on Desktop
		if (!game.device.desktop) {
			game.input.onDown.add(gofull, this);
		}

		//dimensions
		//game.world.setBounds(0, -800, game.world.width, game.world.height);

		//Physics ON!!
		game.physics.startSystem(Phaser.Physics.ARCADE);

		//adding Background
		game.stage.backgroundColor = '#000';

		//Create and configure platforms a Group
		platforms = game.add.group();
		platforms.enableBody = true;


		//adding ground
		var Ground = platforms.create(0, game.world.height - 130, 'Bar');
		//var ledge1 = platforms.create(500, Ground.y - 30 - 45, 'Bar');
		//var ledge2 = platforms.create(-500, Ground.y - 30 - 45, 'Bar');
		platforms.forEach(function (obj) {
			obj.body.immovable = true;
		});

		//add Player
		player = game.add.sprite(32, Ground.y - 60, 'Player');

		//physics for the player on!!
		game.physics.arcade.enable(player);
		player.body.collideWorldBounds = true;
		player.health = life;
		player.body.bounce.y = 0.3;
		player.body.gravity.y = 400;
		player.scale.set(2);
		player.animations.add('move', null, 10, true);
		player.animations.play('move');
		player.events.onKilled.add(resetPlayer, player);

		//cammera follow
		game.camera.follow(player);

		//Life Text
		lifeText = game.add.text(16, 16, 'Life: ' + life, {
			font: "32px Arial",
			fill: '#fff'
		});
		lifeText.fixedToCamera = true;


		//Create and configure Bombs Group
		bombs = game.add.group();
		bombs.enableBody = true;
		bombs.createMultiple(3, 'Bomb', 0, false);
		bombs.forEach(function (bomb) {
			bomb.scale.set(2);
			bomb.anchor.x = 0.5;
			bomb.inputEnabled = true;
			bomb.events.onKilled.add(explodeBomb, bomb);
		});


		//add Game Controls
		buttonleft = game.add.button(0, game.world.height - 100, 'Mbutton', null, this, 1, 0, 1, 0);
		buttonleft.fixedToCamera = true;
		buttonleft.events.onInputOver.add(function () {
			BtnLeft = true;
		});
		buttonleft.events.onInputOut.add(function () {
			BtnLeft = false;
		});
		buttonleft.events.onInputDown.add(function () {
			BtnLeft = true;
		});
		buttonleft.events.onInputUp.add(function () {
			BtnLeft = false;
		});

		buttonright = game.add.button(250, game.world.height - 100, 'Mbutton', null, this, 1, 0, 1, 0);
		buttonright.fixedToCamera = true;
		buttonright.events.onInputOver.add(function () {
			BtnRight = true;
		});
		buttonright.events.onInputOut.add(function () {
			BtnRight = false;
		});
		buttonright.events.onInputDown.add(function () {
			BtnRight = true;
		});
		buttonright.events.onInputUp.add(function () {
			BtnRight = false;
		});

		buttonbomb = game.add.button(700, game.world.height - 100, 'Bbutton', null, this, 1, 0, 1, 0);
		buttonbomb.fixedToCamera = true;
		buttonbomb.events.onInputOver.add(function () {
			BtnBomb = true;
		});
		buttonbomb.events.onInputOut.add(function () {
			BtnBomb = false;
		});
		buttonbomb.events.onInputDown.add(function () {
			BtnBomb = true;
		});
		buttonbomb.events.onInputUp.add(function () {
			BtnBomb = false;
		});

		game.input.keyboard.addKeyCapture([Phaser.KeyCode.SPACEBAR, Phaser.KeyCode.A, Phaser.KeyCode.D]);





		//dat.GUI Stuff
		var gui = new dat.GUI();

		var f1 = gui.addFolder('Player');
		f1.open();
		f1.add(player, 'health').min(0).max(100).step(5).listen();
		f1.add(player, 'kill');
		f1.add(player, 'x').min(0).max(game.world.width - 32).listen();
		f1.add(player, 'y').min(0).max(318).listen();

		var f1 = gui.addFolder('Game');
		f1.open();
		f1.add(debug, 'overlay');


	}

	//update function
	//game mechanics go here
	function update() {



		game.physics.arcade.collide(platforms, player);



		var cursors = game.input.keyboard.createCursorKeys();

		var spaceIsDown = game.input.keyboard.isDown(Phaser.KeyCode.SPACEBAR);

		//Add A key for left alternative
		var A = game.input.keyboard.isDown(Phaser.KeyCode.A);

		//Add B key for right alternative
		var D = game.input.keyboard.isDown(Phaser.KeyCode.D);

		var left = (cursors.left.isDown || BtnLeft || A);
		var right = (cursors.right.isDown || BtnRight || D);

		//  Reset the players velocity (movement)
		player.body.velocity.x = 0;

		if (left) {
			//  Move to the left
			player.body.velocity.x = -150;
		} else if (right) {
			//  Move to the right
			player.body.velocity.x = 150;
		}

		//  Allow the player to jump if they are touching the ground.
		if (spaceIsDown || BtnBomb) {
			dropBomb();
		}

		if (game.input.currentPointers === 0 && game.input.activePointer.isMouse) {
			BtnRight = false;
			BtnLeft = false;
			BtnBomb = false;
		}
	}

	//render stuff
	function render() {

		lifeText.text = 'Life: ' + player.health;

		if (debug.overlay) {
			game.debug.body(player);
			bombs.forEach(function (bomb) {
				game.debug.spriteBounds(bomb);
			});
			game.debug.cameraInfo(game.camera, 500, 60);
			game.debug.spriteInfo(player, 32, 60);
		}


	}

	//Go fullscreen
	function gofull() {
		game.scale.startFullScreen(false);
	}

	//Well yeah drop a bomb :DD
	function dropBomb() {
		if (game.time.now > bombTime) {

			var bomb = bombs.getFirstExists(false);

			if (bomb) {
				bomb.reset(16 + player.x, 16 + player.y);
				bomb.lifespan = bombLifetime;
				bombTime = game.time.now + bombOffsetTime;
				bombCountdown(bomb);
			}
		}
	}

	//Make the player jump in the air when a bomb goes of
	function explodeBomb() {

		if (this.overlap(player)) {
			player.body.velocity.y -= 300;
			player.damage(5);
		}

		// game.physics.arcade.overlap(this, player,
		// function boom (a, b){
		//     b.body.velocity.y = -150;
		// });
	}

	//Bomb Count down Timer
	function bombCountdown(bomb) {

		var style = {
			font: "20px Arial",
			fill: '#f00',
			align: "center",
			stroke: 'black',
			strokeThickness: 5
		};

		function one() {
			one = game.add.text(bomb.x, bomb.y, '1', style);
			one.anchor.setTo(0.5, 0.5);
			tweenOne = game.add.tween(one)
			tweenOne.to({
				y: '-15',
				alpha: 0
			}, 1000, null, true)
		}

		function two() {
			two = game.add.text(bomb.x, bomb.y, '2', style);
			two.anchor.setTo(0.5, 0.5);
			tweenTwo = game.add.tween(two)
			tweenTwo.to({
				y: '-15',
				alpha: 0
			}, 1000, null, true)
			tweenTwo.onComplete.add(one, this)
		}

		function three() {
			three = game.add.text(bomb.x, bomb.y, '3', style);
			three.anchor.setTo(0.5, 0.5);
			tweenThree = game.add.tween(three)
			tweenThree.to({
				y: '-15',
				alpha: 0
			}, 1000, null, true)
			tweenThree.onComplete.add(two, this)
		}
		three();
	}

	//reset Player after Deth
	function resetPlayer() {
		this.reset(32, game.world.height - 190, 100);
	}
};
