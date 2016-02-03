window.onload = function () {

    var canvas, ctx, w, h, world, planeBody, mouseConstraint, id;
    var scaleX = 50,
        scaleY = -50,
        Boxes = [],
        socket = io(),
        debug = false;

    io.connect();
    init();


    function init() {

        // Init canvas
        canvas = document.getElementById("myCanvas");
        w = canvas.width;
        h = canvas.height;

        ctx = canvas.getContext("2d");
        ctx.lineWidth = 0.05;

        // Init p2.js
        world = new p2.World();

        // Add a box
        Boxes.push(new Box(id));

        // Add a plane
        planeShape = new p2.Plane();
        planeBody = new p2.Body();
        planeBody.addShape(planeShape);
        world.addBody(planeBody);
        planeBody.position[1] = -2;

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
        socket.on('new', function (data) {
            console.log("new! : " + data.id)
            Boxes.push(new Box(data.id));
        });

        //Box eines Clients löschen der das Spiel verlassen hat
        socket.on('leave', function (data) {

            console.log("left! : " + data.id);

            Boxes.forEach(function (box) {
                if (box.id === data.id) {
                    Boxes.splice(Boxes.indexOf(box), 1);
                    world.removeBody(box.boxBody);
                }

            });
        });

        //Box Informationen vom Server erhalten
        socket.on('toClient', function (data) {

            Boxes.forEach(function (box) {

                //data.boxes.forEach(function (data_box) {
                if (box.id === data.box.id) {
                    box.boxBody.position[0] = data.box.x;
                    box.boxBody.position[1] = data.box.y;
                    box.boxBody.angle = data.box.angle;
                    box.boxBody.velocity = data.box.velocity;
                }
                //});

            });

            /*
            console.log(
                'id: ' + data.id,
                'x: ' + data.x,
                'y: ' + data.y,
                'angle: ' + data.angle
            );
            */
            //Boxes[].boxBody.position[0] = data.x;
            //Boxes[].boxBody.position[1] = data.y;
            //Boxes[].boxBody.angle = data.angle;


        });

        //Den server nach den bereits vorhandenen clients fragen
        //wenn die verbindung aufgebaut wurde.
        //das init event gibt eine callback funktion mit
        //die vom Server an den Client zurück gegeben wird.
        //Und beim client ausgeführt wird.
        socket.on('connect', function () {


            //get and set client ID
            id = socket.id;
            document.getElementById("sioid").insertAdjacentHTML('beforeend', id);

            console.log('id: ' + id);

            //set id to own box
            Boxes[0].id = id;

            socket.emit('init', function (boxes) {

                    console.log("init!  " + boxes.length);

                    boxes.forEach(function (box) {
                        if (box.id !== id) {

                            console.log("Box pushed box.id: " + box.id + "  x: " + box.x + " y: " + box.y);

                            Boxes.push(
                                new Box(
                                    box.id,
                                    box.x,
                                    box.y,
                                    box.angle
                                )
                            );
                        }
                    });



                    console.log((boxes.length - 1) + ' boxe(s) added');
                }

            );
        });

    }

    // neue Box mit id erstellen.
    function Box(id, x, y, angle) {

        x = typeof x !== 'undefined' ? x : 0;
        y = typeof y !== 'undefined' ? y : 5;
        angle = typeof angle !== 'undefined' ? angle : 0;

        this.boxShape = new p2.Rectangle(2, 1);
        this.boxBody = new p2.Body({
            mass: 1,
            position: [x, y],
            angle: angle,
            angularVelocity: 1
        });
        this.id = id;
        this.boxBody.addShape(this.boxShape);
        world.addBody(this.boxBody);
    }

    //event handler für User Interaktion
    function coursorDown(event) {
        if (debug)
            console.log("Down!!");

        // Convert the canvas coordinate to physics coordinates
        var position = getPhysicsCoord(event);

        // Check if the cursor is inside the box
        var hitBodies = world.hitTest(position, [Boxes[0].boxBody]);

        if (hitBodies.length) {

            // Move the mouse body to the cursor position
            mouseBody.position[0] = position[0];
            mouseBody.position[1] = position[1];

            // Create a RevoluteConstraint.
            // This constraint lets the bodies rotate around a common point
            mouseConstraint = new p2.RevoluteConstraint(mouseBody, Boxes[0].boxBody, {
                worldPivot: position,
                collideConnected: false
            });
            world.addConstraint(mouseConstraint);
        }
    }

    function coursorMove(event) {
        if (debug)
            console.log("Move!!");

        var position = getPhysicsCoord(event);
        mouseBody.position[0] = position[0];
        mouseBody.position[1] = position[1];
    }

    function coursorUp(event) {
        if (debug)
            console.log("Up!!");

        world.removeConstraint(mouseConstraint);
        mouseConstraint = null;
    }

    function mouseLeave(event) {
        if (debug)
            console.log("Mouse leaved!!");

        var position = getPhysicsCoord(event);
        mouseBody.position[0] = position[0];
        mouseBody.position[1] = position[1];
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

        if (debug) {
            console.log('x: ' + x);
            console.log('y: ' + y);

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

    //Render ?! LOL
    function render() {
        // Clear the canvas
        ctx.clearRect(0, 0, w, h);

        // Transform the canvas
        ctx.save();
        ctx.translate(w / 2, h / 2); // Translate to the center
        ctx.scale(scaleX, scaleY);

        // Draw all bodies
        Boxes.forEach(drawBox);
        drawPlane();

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
        socket.emit('toServer', {
            x: Boxes[0].boxBody.interpolatedPosition[0],
            y: Boxes[0].boxBody.interpolatedPosition[1],
            angle: Boxes[0].boxBody.interpolatedAngle,
            velocity: Boxes[0].boxBody.velocity
        });

        console.log(
            'x: ' + Boxes[0].boxBody.interpolatedPosition[0],
            'y: ' + Boxes[0].boxBody.interpolatedPosition[1]
        );

    }

    //Update loop
    setInterval(toServer, 10);
};
