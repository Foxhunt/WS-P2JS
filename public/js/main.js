window.onload = function () {
	var canvas, ctx, w, h, box, world, planeBody, leftWallBody, rightWallBody, mouseConstraint, id,
		scaleX = 50,
		scaleY = -50,
		boxes = new Map,
		socket = io(),
		debug = false,
		gui = new dat.GUI();
		
	init();


	function init() {

		// Init canvas
		canvas = document.getElementById("myCanvas");
		w = canvas.width;
		h = canvas.height;

		ctx = canvas.getContext("2d");
		ctx.lineWidth = 0.05;

		// Init p2.js
		world = new p2.World({
            gravity: [0, -1]
		});
		
		const names = ["x", "y"]
		
		const worldGravity = Object.assign({}, world.gravity)
		const gravityFolder = gui.addFolder("gravity")
		
		Object.keys(worldGravity).forEach( key => {
			const controller = gravityFolder.add(worldGravity, key, -10, 10).name(names[key.valueOf()]).listen();
			controller.onChange(value => {
				world.gravity[key.valueOf()] = value
			})
		});
		
		gui.add(fs, "toggleFullScreen")
		
		window.addEventListener('deviceorientation', event => handleOrientation(event, worldGravity));

		// Add a plane
		planeShape = new p2.Plane();
		planeBody = new p2.Body();
		planeBody.addShape(planeShape);

		//wand links
		leftWallShape = new p2.Plane();
		leftWallBody = new p2.Body();
		leftWallBody.addShape(leftWallShape);

		//wand rechts
		rightWallShape = new p2.Plane();
		rightWallBody = new p2.Body();
		rightWallBody.addShape(rightWallShape);

		// planes hinzufügen
		world.addBody(planeBody);
		world.addBody(rightWallBody);
		world.addBody(leftWallBody);

		// positionen und rotationen setzten
		planeBody.position[1] = -15;

		leftWallBody.position[0] = -9.6;
		leftWallBody.angle = -(Math.PI / 2);


		rightWallBody.position[0] = 9.6;
		rightWallBody.angle = Math.PI / 2;


		// Create a body for the cursor
		mouseBody = new p2.Body();
		world.addBody(mouseBody);

		//Get mouse Position and create a mouse object
		canvas.addEventListener('mousedown', coursorDown);
		canvas.addEventListener('touchstart', coursorDown);
		//canvas.addEventListener('pointerdown', coursorDown);

		// Sync the mouse body to be at the cursor position
		canvas.addEventListener('mousemove', coursorMove);
		canvas.addEventListener('touchmove', coursorMove);
		//canvas.addEventListener('pointermove', coursorDown);


		// Remove the mouse constraint on mouse up
		canvas.addEventListener('mouseup', coursorUp);
		canvas.addEventListener('touchend', coursorUp);
		//canvas.addEventListener('pointerup', coursorDown);

		// Beim verlassen der Maus wird die Box an Position gehalten
		canvas.addEventListener('mouseleave', mouseLeave);


		//Neuen client und seine Box anlegen
		socket.on('new', box => {
			console.log("new! : " + box.id)
			boxes.set(box.id, new Box(box.id));
		});

		//Box eines Clients löschen der das Spiel verlassen hat
		socket.on('leave', box => {
			// Box löschen
			world.removeBody(boxes.get(box.id).boxBody);
			boxes.delete(box.id);
			console.log("left! : " + box.id);
		});

		//Box Informationen vom Server erhalten
		socket.on('toClient', boxUpdate => {
			// betroffene box ermitteln
			let box = boxes.get(boxUpdate.id);
			//erhaltenen Informationen verarbeiten
			if (box) {
				box.boxBody.position[0] = boxUpdate.x;
				box.boxBody.position[1] = boxUpdate.y;
				box.boxBody.angle = boxUpdate.angle;
				box.boxBody.velocity = boxUpdate.velocity;
			}
		});

		//Den server nach den bereits vorhandenen clients fragen
		//wenn die verbindung aufgebaut wurde.
		//das init event gibt eine callback funktion mit
		//die vom Server an den Client zurück gegeben wird.
		//Und beim client ausgeführt wird.
		socket.on('connect', () => {
			//get and set client ID
			id = socket.id;
			box = new Box(id);
			// Add a box
			boxes.set(id, box);

			//Vom Server die bereits verbundenen clients abrufen
			socket.emit('init', _boxes => {

				console.log(_boxes.length + " Boxen initialisiert");

				_boxes.forEach(_box => {
					if (_box.id !== id) {
						let box = new Box(
							_box.id,
							_box.x,
							_box.y,
							_box.angle
						);
						boxes.set(box.id, box);
					}
				});
			}); // ende emit init
		}); // ende onConnect
	} //ende init

	// neue Box mit id erstellen.
	function Box(id, x, y, angle) {
		x = x || 0;
		y = y || 5;
		angle = angle || 0;
		this.boxShape = new p2.Rectangle(2, 1);
		this.boxBody = new p2.Body({
			mass: 1,
			position: [x, y],
			angle: angle,
			angularVelocity: 1
		});
		this.id = id;
		this.boxBody.addShape(this.boxShape);
		this.lastUpdate = Date.now();
		world.addBody(this.boxBody);
	}

	//event handler für User Interaktion
	function coursorDown(event) {

		// Convert the canvas coordinate to physics coordinates
		var position = getPhysicsCoord(event);

		// Check if the cursor is inside the box
		var hitBodies = world.hitTest(position, [box.boxBody]);

		if (hitBodies.length) {

			// Move the mouse body to the cursor position
			mouseBody.position[0] = position[0];
			mouseBody.position[1] = position[1];

			// Create a RevoluteConstraint.
			// This constraint lets the bodies rotate around a common point
			mouseConstraint = new p2.RevoluteConstraint(mouseBody, box.boxBody, {
				worldPivot: position,
				collideConnected: false
			});
			world.addConstraint(mouseConstraint);
		}
	}

	function coursorMove(event) {
		var position = getPhysicsCoord(event);
		mouseBody.position[0] = position[0];
		mouseBody.position[1] = position[1];
	}

	function coursorUp(event) {
		world.removeConstraint(mouseConstraint);
		mouseConstraint = null;
	}

	function mouseLeave(event) {
		world.removeConstraint(mouseConstraint);
		mouseConstraint = null;
	}

	// Convert a canvas coordiante to physics coordinate
	function getPhysicsCoord(Event) {

		Event.preventDefault();


		var rect = canvas.getBoundingClientRect();

		if (Event.touches) {
			var x = Event.touches[0].clientX - rect.left;
			var y = Event.touches[0].clientY - rect.top;
		} else {
			var x = Event.clientX - rect.left;
			var y = Event.clientY - rect.top;
		}

		x = (x - w / 2) / scaleX;
		y = (y - h / 2) / scaleY;

		return [x, y];
	}

	//Boxes malen
	function drawBox(box) {
		ctx.beginPath();
		var x = box.boxBody.interpolatedPosition[0],
			y = box.boxBody.interpolatedPosition[1];
		ctx.save();
		ctx.translate(x, y); // Translate to the center of the box
		ctx.rotate(box.boxBody.interpolatedAngle); // Rotate to the box body frame
		if (box.id === id) {
			ctx.strokeStyle = "red";
		}
		ctx.rect(-box.boxShape.width / 2, -box.boxShape.height / 2, box.boxShape.width, box.boxShape.height);
		
		ctx.fillStyle = "blue";
		ctx.fill();
		ctx.stroke();
		ctx.restore();
	}

	//Boden malen
	function drawPlane() {
		var y = planeBody.position[1]
		ctx.moveTo(-w, y);
		ctx.lineTo(w, y);
		ctx.stroke();
	}

	//Boden wände
	function drawWalls() {

		var x = leftWallBody.position[0]
		ctx.moveTo(x, -h);
		ctx.lineTo(x, h);
		ctx.stroke();

		x = rightWallBody.position[0]
		ctx.moveTo(x, -h);
		ctx.lineTo(x, h);
		ctx.stroke();

	}

	//Render ?! LOL
	function render() {
		// Transform the canvas
		ctx.save();
		ctx.translate(w / 2, h / 2); // Translate to the center
		ctx.scale(scaleX, scaleY);

		// Draw all bodies
		boxes.forEach(drawBox);
		drawPlane();
		drawWalls();

		// Restore transform
		ctx.restore();
	}

	//LOL duno shit?!
	function normalizeAngle(angle) {
		angle = angle % (2 * Math.PI);
		if (angle < 0) {
			angle += (2 * Math.PI);
		}
		return angle;
	}


	//world interpolation variablen
	var fixedTimeStep = 1 / 60;
	var maxSubSteps = 1;
	var lastTimeSeconds;
	//var deltaTime;
	//var timeSeconds;

	// Animation loop
	function animate(t) {
		requestAnimationFrame(animate);

		timeSeconds = t / 1000;
		lastTimeSeconds = lastTimeSeconds || timeSeconds;

		deltaTime = timeSeconds - lastTimeSeconds;

		// Move physics bodies forward in time
		world.step(fixedTimeStep, deltaTime, maxSubSteps);

		// Render scene
		render();
	}

	requestAnimationFrame(animate);

	//Box informationen an server senden
	function toServer() {
		if (box) {
			socket.emit('toServer', {
				x: box.boxBody.interpolatedPosition[0],
				y: box.boxBody.interpolatedPosition[1],
				angle: box.boxBody.interpolatedAngle,
				velocity: box.boxBody.velocity
			});
		}
	}

	//Update loop
	setInterval(toServer, 50);
	
	function handleOrientation(event, worldGravity){
		var x = event.gamma;  // In degree in the range [-180,180]
		var y = event.beta; // In degree in the range [-90,90]

		// Because we don't want to have the device upside down
		// We constrain the x value to the range [-90,90]
		if (x >  90) { x =  90};
		if (x < -90) { x = -90};

		// To make computation easier we shift the range of 
		// x and y to [0,180]
		//x += 90;
		//y += 90;	
		
		worldGravity["0"] = x/7
		worldGravity["1"] = -y/8
		
		world.gravity[0] = worldGravity["0"]
		world.gravity[1] = worldGravity["1"]
	}
	
};

function toggleFullScreen() {
	
	console.log("toggleFS")
	
  var doc = window.document;
  var docEl = doc.documentElement;

  var requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
  var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

  if(!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
    requestFullScreen.call(docEl);
		screen.orientation.lock('portrait')
  }
  else {
    cancelFullScreen.call(doc);
  }
}

const fs = {}
fs.toggleFullScreen = toggleFullScreen
