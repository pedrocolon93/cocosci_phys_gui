// Based on code made
// By Simon Sarris
// www.simonsarris.com
// sarris@acm.org
//
// Last update December 2011
//
// Free to use and distribute at will
// So long as you are nice to people, etc
//
// Constructor for Shape objects to hold data for all drawn objects.
// For now they will just be defined as rectangles.
class Shape{
    constructor(x, y, w, h, fill,selectable,name){
        this.x = x || 0;
        this.y = y || 0;
        this.w = w || 1;
        this.h = h || 1;
        this.fill = fill || '#AAAAAA';
        this.selectable = selectable;
        this.visible=true;
        this.name = name||"default";
    }
    draw(ctx){
        ctx.fillStyle = this.fill;
        ctx.fillRect(this.x, this.y, this.w, this.h);

    }
    contains(mx, my) {
        // All we have to do is make sure the Mouse X,Y fall in the area between
        // the shape's X and (X + Width) and its Y and (Y + Height)
        return (this.x <= mx) && (this.x + this.w >= mx) &&
            (this.y <= my) && (this.y + this.h >= my);
    }
}

class Window extends Shape{
    constructor(x, y, w, h, fill,selectable,name){
       super(x,y,w,h,fill,selectable,name);
    }
    static fromJson(json){
        return new Window(json.x,json.y,json.w,json.h,0,json.visible)
    }
    draw(ctx){
        //Draw window background
        ctx.fillStyle = "white";
        ctx.fillRect(this.x, this.y, this.w, this.h);
        //Draw window borders
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x,this.y,this.w,this.h);
        //Draw top bar
        ctx.fillStyle = "#b2babd";
        ctx.fillRect(this.x, this.y, this.w, 13);

        //Draw management icons
        var radius = 3;
        var centerX = this.x+radius*2+2;
        var centerY = this.y+radius*2+1;

        function drawCircle(context,centerx,centery,radius,fill){
            context.beginPath();
            context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
            context.fillStyle = fill;
            context.fill();
            context.lineWidth = 1;
            context.strokeStyle = 'black';
            context.stroke();
        }


        drawCircle(ctx,centerX,centerY,radius,'red');
        centerX += 3*radius;
        drawCircle(ctx,centerX,centerY,radius,'yellow');
        centerX+=3*radius;
        drawCircle(ctx,centerX,centerY,radius,'green');
    }
}


function CanvasState(canvas) {
    // **** First some setup! ****
    this.falling = window.testConfig.falling;
    this.invertx = window.testConfig.invertx;
    this.inverty = window.testConfig.inverty;
    this.timeSinceUpdate = -1;
    this.skipframes = window.testConfig.skipframes;
    //
    this.canvas = canvas;
    this.width = canvas.width;
    this.height = canvas.height;
    this.ctx = canvas.getContext('2d');
    // This complicates things a little but but fixes mouse co-ordinate problems
    // when there's a border or padding. See getMouse for more detail
    var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;
    if (document.defaultView && document.defaultView.getComputedStyle) {
        this.stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10)      || 0;
        this.stylePaddingTop  = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10)       || 0;
        this.styleBorderLeft  = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10)  || 0;
        this.styleBorderTop   = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10)   || 0;
    }
    // Some pages have fixed-position bars (like the stumbleupon bar) at the top or left of the page
    // They will mess up mouse coordinates and this fixes that
    var html = document.body.parentNode;
    this.htmlTop = html.offsetTop;
    this.htmlLeft = html.offsetLeft;

    // **** Keep track of state! ****

    this.valid = false; // when set to false, the canvas will redraw everything
    this.shapes = [];  // the collection of things to be drawn
    this.dragging = false; // Keep track of when we are dragging
    // the current selected object. In the future we could turn this into an array for multiple selection
    this.selection = null;
    this.dragoffx = 0; // See mousedown and mousemove events for explanation
    this.dragoffy = 0;

    // **** Then events! ****

    // This is an example of a closure!
    // Right here "this" means the CanvasState. But we are making events on the Canvas itself,
    // and when the events are fired on the canvas the variable "this" is going to mean the canvas!
    // Since we still want to use this particular CanvasState in the events we have to save a reference to it.
    // This is our reference!
    var myState = this;

    //fixes a problem where double clicking causes text to get selected on the canvas
    canvas.addEventListener('selectstart', function(e) { e.preventDefault(); return false; }, false);
    // Up, down, and move are for dragging
    canvas.addEventListener('mousedown', function(e) {
        var mouse = myState.getMouse(e);

        var mx = mouse.x;
        var my = mouse.y;
        myState.mx = mx;
        myState.my = my;
        var shapes = myState.shapes;
        var l = shapes.length;
        for (var i = l-1; i >= 0; i--) {
            if (shapes[i].contains(mx, my) && shapes[i].selectable) {
                var mySel = shapes[i];
                // Keep track of where in the object we clicked
                // so we can move it smoothly (see mousemove)
                myState.dragoffx = mx - mySel.x;
                myState.dragoffy = my - mySel.y;
                myState.dragging = true;
                myState.selection = mySel;
                myState.valid = false;
                myState.origx = mySel.x;
                myState.origy = mySel.y;
                return;
            }
        }
        // havent returned means we have failed to select anything.
        // If there was an object selected, we deselect it
        if (myState.selection) {
            myState.selection = null;
            myState.valid = false; // Need to clear the old selection border
        }
    }, true);
    canvas.addEventListener('mousemove', function(e) {
        if (myState.dragging){
            var mouse = myState.getMouse(e);
            var mx = mouse.x;
            var my = mouse.y;
            myState.mx = mx;
            myState.my = my;
            // We don't want to drag the object by its top-left corner, we want to drag it
            // from where we clicked. Thats why we saved the offset and use it here
            var posorigx = myState.origx;
            var posnewx = mouse.x - myState.dragoffx;
            var posorigy = myState.origy;
            var posnewy = mouse.y - myState.dragoffy;
            if(myState.invertx)
                myState.selection.x = myState.origx - (posnewx-posorigx);
            else
                myState.selection.x = mouse.x - myState.dragoffx;
            if(myState.inverty)
                myState.selection.y = myState.origy - (posnewy - posorigy);
            else
                myState.selection.y = mouse.y - myState.dragoffy;


            // myState.selection.x = posnew;
            myState.valid = false; // Something's dragging so we must redraw
        }
        var mouse = myState.getMouse(e);
        var mx = mouse.x;
        var my = mouse.y;
        window.canvasState.mx = mx;
        window.canvasState.my = my;
    }, true);
    canvas.addEventListener('mouseup', function(e) {
        myState.dragging = false;
    }, true);
    try{
    document.getElementById('start').onclick = function(){
        var myState = window.canvasState;
        if(window.testConfig.selfguiding||false){
            function selfguiding() {
                /*
                1 left
                2 right
                3 up
                4 down
                 */
                var deltaX = 0;
                var deltaY = 0;
                var mag = 2;
                var decision = window.webgazeobs.targetDecision;
                // alert(decision);
                switch (decision) {
                    case 1:
                        deltaX = -1*mag;
                        break;
                    case 2:
                        deltaX = 1*mag;
                        break;
                    case 3:
                        deltaY = -1*mag;
                        break;
                    case 4:
                        deltaY = 1*mag;
                        break;
                }
                for (let i = 0; i < myState.shapes.length; i++) {
                    myState.shapes[i].selectable = false;
                }
                var i = 0;
                function replay(i, myState, deltaX, deltaY) {
                    myState.shapes[i].x += deltaX;
                    myState.shapes[i].y += deltaY;
                    myState.valid = false;
                    myState.draw()
                    if(!(myState.shapes[myState.shapes.length-1].contains(myState.shapes[i].x,myState.shapes[i].y))){
                        setTimeout(replay, 30, i, myState, deltaX, deltaY)
                    }
                    else{
                        i++;
                        if(myState.shapes[i] instanceof Window){
                            setTimeout(replay, 30, i,myState, deltaX, deltaY)
                        }
                    }
                }
                setTimeout(replay, 30, i,myState, deltaX, deltaY)
            }
            setTimeout(selfguiding,100)

        }
    };}
    catch (e) {
        console.log(e);
    }
    // double click for making new shapes
    // canvas.addEventListener('dblclick', function(e) {
    //     var mouse = myState.getMouse(e);
    //     myState.addShape(new Shape(mouse.x - 10, mouse.y - 10, 20, 20, 'rgba(0,255,0,.6)'));
    // }, true);

    // **** Options! ****

    this.selectionColor = '#CC0000';
    this.selectionWidth = 1;
    this.interval = 10;
    // setTimeout(function () {
    //     var offset = 10;
    //     document.getElementById('webgazerVideoFeed').style.left = document.getElementById('webgazerVideoFeed').style.left + offset;
    //     document.getElementById('webgazerVideoCanvas').style.left = document.getElementById('webgazerVideoCanvas').style.left + offset;
    //     document.getElementById('webgazerFaceOverlay').style.left = document.getElementById('webgazerFaceOverlay').style.left + offset;
    //     document.getElementById('webgazerFaceFeedbackBox').style.left = document.getElementById('webgazerFaceFeedbackBox').style.left + offset;
    // },100);
    if(myState.falling){
        myState.falling = false;
        document.getElementById('start').onclick = function(){
           myState.falling=true;
        };
    }
    myState.drawinterval = setInterval(function() {
        if (myState.falling){
            for(let i=0;i<myState.shapes.length;i++){
                if(myState.shapes[i] instanceof Window && !Object.is(myState.shapes[i],myState.selection) && myState.shapes[i].visible) {
                    var diff = 0.9;
                    if (myState.shapes[i].x + myState.shapes[i].w + diff <= myState.width &&
                        myState.shapes[i].y + myState.shapes[i].h + diff <= myState.height)
                    {
                        // console.log("Going down!");
                        // myState.shapes[i].x += diff;
                        myState.shapes[i].y += diff;
                    }
                }
            }
            myState.valid=false;
            myState.draw()
        }
        if (myState.skipframes >= 0){
            if (myState.dragging) {
                if (myState.timeSinceUpdate % myState.skipframes === 0 && myState.timeSinceUpdate !== 0 && myState.timeSinceUpdate !== -1) {
                    myState.timeSinceUpdate = 0;
                    myState.valid=false;
                    myState.selection.visible=true;
                    myState.draw();
                }
                else {
                    myState.timeSinceUpdate += 1;
                    myState.valid = true;
                    myState.selection.visible = false;
                    return;
                }
            }
            else
                myState.draw();
        }
        else
            myState.draw();
    }, myState.interval);
    myState.finishinterval  = setInterval(function () {
        //check that they are in red area
        var l = myState.shapes.length;
        for (var i = l-2; i >= 0; i--) {
            if (!(myState.shapes[l-1].contains(myState.shapes[i].x, myState.shapes[i].y))) {
                return
            }
        }
        clearInterval(myState.finishinterval);
        // clearInterval(myState.drawinterval);
        alert("")
        document.getElementById('done').onclick = function() {
            var replaytime = 1;
            if (window.replayEnabled) {
                replaytime = 50;
                var files = evt.target.files; // FileList object
                for (var i = 0, f; f = files[i]; i++) {

                    // Only process image files.
                    if (!f.type.match('scene*')) {
                        continue;
                    }
                    var reader = new FileReader();

                    // Closure to capture the file information.
                    reader.onload = (function(theFile) {
                        return function(e) {
                            // Render thumbnail.
                           console.log(e.target);
                        };
                    })(f);

                    // Read in the image file as a data URL.
                    reader.readAsText(f);
                }
            }
            myState.falling=false;
            var replay = function (i) {
                if (i >= window.webgazeobs.x.length) {
                    var url = window.location.pathname;
                    var filename = url.substring(url.lastIndexOf('/')+1);
                    window.webgazeobs.name = filename;
                    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(window.webgazeobs));
                    var dlAnchorElem = document.getElementById('downloadAnchorElem');
                    dlAnchorElem.setAttribute("href",     dataStr     );
                    dlAnchorElem.setAttribute("download", "scene.json");
                    dlAnchorElem.click();
                    var newUrl = "index.html";
                    window.location = newUrl;
                    return;
                }
                if(window.replayEnabled) {
                    //clear
                    myState.shapes = [];
                    myState.valid = false;
                    myState.draw();
                    //redraw
                    for (let o of window.webgazeobs.shapeStates[i]) {
                        myState.addShape(o);
                    }
                    myState.addShape(new Shape(window.webgazeobs.x[i], window.webgazeobs.y[i], 3, 3, 'purple'));
                    myState.valid = false;
                    myState.draw();
                }
                i++;
                setTimeout(replay,replaytime,i)
            };
            setTimeout(replay,replaytime,0);
        };
        try {
            webgazer.end();
        }
        catch (e) {
            console.log(e);
        }

    }, 500);
}

CanvasState.prototype.addShape = function(shape) {
    this.shapes.push(shape);
    this.valid = false;
}

CanvasState.prototype.clear = function() {
    this.ctx.clearRect(0, 0, this.width, this.height);
}

// While draw is called as often as the INTERVAL variable demands,
// It only ever does something if the canvas gets invalidated by our code
CanvasState.prototype.draw = function() {
    // if our state is invalid, redraw and validate!
    if (!this.valid) {
        var ctx = this.ctx;
        var shapes = this.shapes;
        this.clear();

        // ** Add stuff you want drawn in the background all the time here **

        // draw all shapes
        var l = shapes.length;
        for (var i = 0; i < l; i++) {
            var shape = shapes[i];
            // We can skip the drawing of elements that have moved off the screen:
            if (shape.x > this.width || shape.y > this.height ||
                shape.x + shape.w < 0 || shape.y + shape.h < 0 || !shape.visible) continue;
            shapes[i].draw(ctx);
        }

        // draw selection
        // right now this is just a stroke along the edge of the selected Shape
        if (this.selection != null) {
            ctx.strokeStyle = this.selectionColor;
            ctx.lineWidth = this.selectionWidth;
            var mySel = this.selection;
            ctx.strokeRect(mySel.x,mySel.y,mySel.w,mySel.h);
        }

        // ** Add stuff you want drawn on top all the time here **

        this.valid = true;
    }
}


// Creates an object with x and y defined, set to the mouse position relative to the state's canvas
// If you wanna be super-correct this can be tricky, we have to worry about padding and borders
CanvasState.prototype.getMouse = function(e) {
    var element = this.canvas, offsetX = 0, offsetY = 0, mx, my;

    // Compute the total offset
    if (element.offsetParent !== undefined) {
        do {
            offsetX += element.offsetLeft;
            offsetY += element.offsetTop;
        } while ((element = element.offsetParent));
    }

    // Add padding and border style widths to offset
    // Also add the <html> offsets in case there's a position:fixed bar
    offsetX += this.stylePaddingLeft + this.styleBorderLeft + this.htmlLeft;
    offsetY += this.stylePaddingTop + this.styleBorderTop + this.htmlTop;

    mx = e.pageX - offsetX;
    my = e.pageY - offsetY;

    // We return a simple javascript object (a hash) with x and y defined
    return {x: mx, y: my};
};

// If you dont want to use <body onLoad='init()'>
// You could uncomment this init() reference and place the script reference inside the body tag
window.onload=init;

function start_web_gaze_tracking() {
    window.ready = false;
    // webgazer.clearData();
    webgazer.setRegression('ridge') /* currently must set regression and tracker */
    .setTracker('clmtrackr').setGazeListener(function(data, elapsedTime) {
        if (data == null) {
            console.log("Nodata, returning");
            return;
        }
        if(!window.ready){
            window.ready = true;
            alert("Begin!");
        }
        var offsetX = window.canvasState.stylePaddingLeft + window.canvasState.styleBorderLeft + window.canvasState.htmlLeft;
        var offsetY = window.canvasState.stylePaddingTop + window.canvasState.styleBorderTop + window.canvasState.htmlTop;
        window.webgazeobs["x"].push(data.x+offsetX);
        window.webgazeobs["y"].push(data.y+offsetY);
        window.webgazeobs["mx"].push(window.canvasState.mx||0);
        window.webgazeobs["my"].push(window.canvasState.my||0);
        window.webgazeobs["time"].push(elapsedTime);
        window.webgazeobs["dragging"].push(window.canvasState.dragging);
        var shapestates = [];
        for(let o of window.canvasState.shapes){
            if(o instanceof Window){
                var wi = new Window(o.x,o.y,o.w,o.h,o.fill,o.selectable,o.name);
                wi.visible = o.visible;
                shapestates.push(wi)
            }
        }
        window.webgazeobs["shapeStates"].push(shapestates)
    }).begin();
}


function init() {
    if(window.testConfig.selfguiding||false) {
        alert("Your task is to watch the windows as they move to inside the red zone. " +
            "The site will be recording your expressions. Align the face model in the image to your face. " +
            "When it is aligned click anywhere on the screen and a begin alert will pop up.  Close it and you can begin the task. " +
            "When you are done click on the Finished button below. The screen may freeze occasionally while starting up just give " +
            "it some seconds.");
    }
    else {
        alert("Your task is to move the windows from the center of the screen to inside the red zone. " +
            "The site will be recording your expressions. Align the face model in the image to your face. " +
            "When it is aligned click anywhere on the screen and a begin alert will pop up.  Close it and you can begin the task. " +
            "When you are done click on the Finished button below. The screen may freeze occasionally while starting up just give " +
            "it some seconds.");
    }
    window.webgazeobs = {x:[],y:[],time:[],shapeStates:[],mx:[],my:[],dragging:[]};
    if (!window.testConfig.replayEnabled) {
        start_web_gaze_tracking();
    }
    var s = new CanvasState(document.getElementById('canvas1'));
    window.canvasState = s;
    var wIndow = new Window(window.innerWidth/2,300,200,100,0,true,"window1");
    s.addShape(wIndow);
    wIndow = new Window(window.innerWidth/2+10,400,200,100,0,true,"window2");
    s.addShape(wIndow);
    wIndow = new Window(window.innerWidth/2,500,200,100,0,true,"window3");
    s.addShape(wIndow);
    // var redarea = new Shape(s.width*(3/4),0,s.width*(1/4),s.height,'red',false);
    if(window.testConfig.randomtarget||false){
        /*
        1 left
        2 right
        3 up
        4 down
         */
        var decision = parseInt(Math.floor(Math.random()*4+1));
        // alert(decision);
        switch (decision) {
            case 1:
                var redarea = new Shape(0,0,s.width*(1/4),s.height,'red',false);
                s.addShape(redarea);
                break;
            case 2:
                var redarea = new Shape(s.width*(3/4),0,s.width*(1/4),s.height,'red',false);
                s.addShape(redarea);
                break;
            case 3:
                var redarea = new Shape(0,0,s.width,s.height*(1/4),'red',false);
                s.addShape(redarea);
                break;
            case 4:
                var redarea = new Shape(0,s.height*(3/4),s.width,s.height*(1/4),'red',false);
                s.addShape(redarea);
                break;

        }
        window.webgazeobs.targetDecision = decision;
    }
    else{
        var redarea = new Shape(s.width*(3/4),0,s.width*(1/4),s.height,'red',false);
        s.addShape(redarea);
    }
    function handleFileSelect(evt) {
        var files = evt.target.files; // FileList object

        // Loop through the FileList and render image files as thumbnails.
        for (var i = 0, f; f = files[i]; i++) {
            var reader = new FileReader();

            // Closure to capture the file information.
            reader.onload = (function(theFile) {
                return function(e) {
                    // Render thumbnail.
                    window.webgazeobs = JSON.parse(e.target.result);
                    // print(e)
                };
            })(f);

            // Read in the image file as a data URL.
            reader.readAsText(f);
        }
    }
    try {
        document.getElementById('files').addEventListener('change', handleFileSelect, false);
        document.getElementById('replay').onclick = function() {
            var replaytime = 1;
            if (window.testConfig.replayEnabled) {
                replaytime = 50;

                var replay = function (i) {
                    if (i >= window.webgazeobs.x.length) {
                        return;
                    }
                    //clear
                    var myState = window.canvasState;
                    myState.shapes = [];
                    myState.valid = false;
                    myState.draw();
                    //redraw
                    for (let o of window.webgazeobs.shapeStates[i]) {
                        if(o.visible)
                            myState.addShape(Window.fromJson(o));
                    }
                    myState.addShape(new Shape(window.webgazeobs.x[i], window.webgazeobs.y[i], 3, 3, 'purple'));
                    myState.addShape(new Shape(window.webgazeobs.mx[i], window.webgazeobs.my[i], 4, 4, 'red'));

                    myState.valid = false;
                    myState.draw();

                    i++;
                    setTimeout(replay,replaytime,i)
                };
                setTimeout(replay,replaytime,0);


            }
        };
    }
    catch (e) {
        console.log(e);
    }
}



// Now go make something amazing!