function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) {
        for(var i = 0, arr2 = new Array(arr.length); i < arr.length; i++){
            arr2[i] = arr[i];
        }
        return arr2;
    }
}
function _defineProperty(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
function _iterableToArray(iter) {
    if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter);
}
function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance");
}
function _objectSpread(target) {
    for(var i = 1; i < arguments.length; i++){
        var source = arguments[i] != null ? arguments[i] : {
        };
        var ownKeys = Object.keys(source);
        if (typeof Object.getOwnPropertySymbols === "function") {
            ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function(sym) {
                return Object.getOwnPropertyDescriptor(source, sym).enumerable;
            }));
        }
        ownKeys.forEach(function(key) {
            _defineProperty(target, key, source[key]);
        });
    }
    return target;
}
function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread();
}
// constants
var MAX_INIT_VOLUME = 70;
var REPRODUCTION_CD = 50000;
//const MIN_REPRO_CD = 10000
var LVL0_REPLANT_CD = 1000;
var VOLUME_TRANSFER_SPEED = 0.01;
var MAX_GAME_SPEED = 35;
var BACT_SPEED = 0.05;
var MAX_SPEED = 0.05;
var BASE_RADIUS = 25;
var MAX_VOLUME = 100;
var METABOLISM_SPEED = 0.001;
var VOLUME_ACTION_THRESHOLD = MAX_VOLUME / 2;
var NEW_BACT_VOLUME_PERC = 0.5;
var BACTERIA_LEVELS = 3;
var BACT_COLORS = [
    "#00ff00",
    "#42b3f5",
    "#8742f5",
    "#b6f542",
    "#ff0000"
];
var BACTERIA_INITIAL_N = 50;
var MAX_BACTS = 500;
var CONTACT_DISTANCE = 18 // on big deltas it get buggy so it need big collision box - it flies throught the poing
;
var TEXT_PAD = 50;
var TEXT_Y_START = 40;
var SELECT_RECT_PADDING = 10;
// init canvas
var gameDiv = document.getElementById("game-div");
var canvas = document.createElement("canvas");
canvas.width = 1600;
canvas.height = 900;
gameDiv.appendChild(canvas);
var ctx = canvas.getContext("2d");
var popupDiv = document.createElement("div") //document.getElementById("popup")
;
popupDiv.id = "popup";
gameDiv.appendChild(popupDiv);
function onChange(event) {
    var val = event.target.value;
    gameSpeed = val;
}
function mouseMoveHandler(event) {
    mousePos.x = event.offsetX;
    mousePos.y = event.offsetY;
}
function mouseClickHandler(event) {
    mousePos.x = event.offsetX;
    mousePos.y = event.offsetY;
    newClick = true;
    showPopup();
}
function showPopup() {
    popupDiv.style.visibility = "visible";
}
function hidePopup() {
    popupDiv.style.visibility = "hidden";
}
function setPopup(text) {
    popupDiv.textContent = text;
}
document.addEventListener("keyup", function(e) {
    var keyName = e.key;
    if (keyName == " ") {
        console.log("pauza");
        pause = !pause;
    }
});
canvas.addEventListener("mousemove", mouseMoveHandler);
canvas.addEventListener("mouseup", mouseClickHandler);
popupDiv.onclick = hidePopup;
var inputRange = document.getElementById("input-speed");
inputRange.max = String(MAX_GAME_SPEED);
inputRange.onchange = onChange;
var inputWrapper = document.getElementById("input-range-wrapper");
inputWrapper.style.top = String(TEXT_Y_START + TEXT_PAD * (BACTERIA_LEVELS + 2));
var // types
State;
(function(State1) {
    State1[State1["idle"] = 0] = "idle";
    State1[State1["search"] = 1] = "search";
    State1[State1["eat"] = 2] = "eat";
    State1[State1["dead"] = 3] = "dead";
    State1[State1["consumed"] = 4] = "consumed";
})(State || (State = {
}));
// variables
var gameSpeed = 1;
var lastRenderTime = 0;
var bacterias;
var newBacterias;
var lastLvl0RespawnTime;
//let mouseMoved: boolean
var newClick;
var mousePos;
var pause;
var bactToShow;
// functions
function reset() {
    gameSpeed = 1;
    lastRenderTime = 0;
    bacterias = [];
    newBacterias = [];
    mousePos = {
        x: 0,
        y: 0
    };
    newClick = false;
    pause = false;
    lastLvl0RespawnTime = 0;
    bactToShow = null;
    //mouseMoved = false
    for(var level = 0; level < BACTERIA_LEVELS; level++){
        var arr = [];
        for(var i = 0; i < BACTERIA_INITIAL_N / (level + 1); i++){
            arr.push(generateBacteria(level));
        }
        bacterias[level] = arr;
        newBacterias[level] = [];
    }
    window.requestAnimationFrame(mainLoop);
}
function randomFrom0ToN(n) {
    return Math.floor(Math.random() * n);
}
function randBetween(a, b) {
    return Math.random() * (b - a) + a;
}
function distance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}
function getRandomPosition() {
    return {
        x: randomFrom0ToN(canvas.width),
        y: randomFrom0ToN(canvas.height)
    };
}
function generateBacteria(level) {
    return {
        state: State.idle,
        position: getRandomPosition(),
        volume: randBetween(0, MAX_INIT_VOLUME),
        destination: null,
        timeSinceReproduction: REPRODUCTION_CD,
        speed: BACT_SPEED,
        eating: null,
        level: level
    };
}
function actualRadius(bact) {
    return bact.volume / MAX_VOLUME * BASE_RADIUS;
}
function checkCollision(bact, colliders) {
    var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
    try {
        for(var _iterator = colliders[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
            var col = _step.value;
            if (col.state != State.dead && distance(bact.position, col.position) < actualRadius(bact) + actualRadius(col)) {
                return col;
            }
        }
    } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
    } finally{
        try {
            if (!_iteratorNormalCompletion && _iterator.return != null) {
                _iterator.return();
            }
        } finally{
            if (_didIteratorError) {
                throw _iteratorError;
            }
        }
    }
    return null;
}
function getMoveVector(p1, p2) {
    var x = p2.x - p1.x;
    var y = p2.y - p1.y;
    var len = distance(p1, p2);
    return {
        x: x / len,
        y: y / len
    };
}
function drawCircle(x, y, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0, radius), 0, Math.PI * 2, false);
    ctx.fill();
}
function drawEmptyRect(x, y, w, h, param) {
    var frameColor = param === void 0 ? "white" : param;
    ctx.strokeStyle = frameColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
}
function drawBackground() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}
function drawText(x, y, text, font, color) {
    ctx.fillStyle = color;
    if (font) {
        ctx.font = font;
    }
    ctx.fillText(text, x, y);
}
function reproduce(mother) {
    var newBacteria = generateBacteria(mother.level);
    newBacteria.position = _objectSpread({
    }, mother.position);
    newBacteria.volume = mother.volume * NEW_BACT_VOLUME_PERC;
    return newBacteria;
}
function doOneBacteriaTick(bact, delta) {
    if (delta == 0 || pause) {
        return;
    }
    if (bact.volume < 0) {
        bact.state = State.dead;
        return;
    }
    if (bact.level == 0) {
        if (bact.state != State.dead && bact.volume < MAX_INIT_VOLUME) {
            bact.volume += METABOLISM_SPEED * delta;
        }
        return;
    }
    console.assert(bact.level > 0, {
        msg: "level 0 shoudlnt be here"
    });
    bact.volume -= delta * METABOLISM_SPEED;
    switch(bact.state){
        case State.idle:
            {
                if (bact.volume < VOLUME_ACTION_THRESHOLD) {
                    bact.state = State.search;
                    bact.destination = getRandomPosition();
                } else {
                    bact.timeSinceReproduction += delta;
                    if (bact.timeSinceReproduction > REPRODUCTION_CD * bact.level) {
                        bact.timeSinceReproduction = 0;
                        if (bacterias[bact.level].length + newBacterias[bact.level].length < MAX_BACTS) {
                            var newBacteria = reproduce(bact);
                            bact.volume -= newBacteria.volume;
                            newBacterias[bact.level].push(newBacteria);
                        }
                    }
                }
                break;
            }
        case State.search:
            {
                if (distance(bact.position, bact.destination) < CONTACT_DISTANCE) {
                    bact.destination = getRandomPosition();
                } else {
                    var bactCollided = checkCollision(bact, bacterias[bact.level - 1]);
                    if (bactCollided) {
                        bact.state = State.eat;
                        bact.eating = bactCollided;
                        bactCollided.state = State.consumed;
                    } else {
                        var moveVector = getMoveVector(bact.position, bact.destination);
                        var speedFactor = delta * bact.speed //* Math.sqrt(bact.volume / MAX_VOLUME)
                        ;
                        bact.position.x += moveVector.x * speedFactor;
                        bact.position.y += moveVector.y * speedFactor;
                    }
                }
                break;
            }
        case State.eat:
            {
                var bactEaten = bact.eating;
                if (bactEaten.state == State.dead) {
                    bact.state = State.idle;
                } else if (bact.volume > MAX_VOLUME) {
                    bact.state = State.idle;
                    bactEaten.state = State.idle;
                } else {
                    var volChange = delta * VOLUME_TRANSFER_SPEED;
                    bact.volume += volChange;
                    bactEaten.volume -= volChange;
                }
                break;
            }
        default:
            {
                break;
            }
    }
}
function showMouseIntersectedBact() {
    for(var i = 0; i < BACTERIA_LEVELS; i++){
        var arr = bacterias[i];
        var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
        try {
            for(var _iterator = arr[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
                var bact = _step.value;
                if (distance(mousePos, bact.position) < actualRadius(bact)) {
                    console.log(bact);
                    return bact;
                }
            }
        } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
        } finally{
            try {
                if (!_iteratorNormalCompletion && _iterator.return != null) {
                    _iterator.return();
                }
            } finally{
                if (_didIteratorError) {
                    throw _iteratorError;
                }
            }
        }
    }
    return null;
}
function stringifyBacteria(bact) {
    return JSON.stringify(bact, function(key, val) {
        if (val != null) {
            if (key == "eating") {
                return undefined;
            }
            return val.toFixed ? val.toFixed(3) : val;
        }
        return undefined;
    });
}
function mainLoop(timestamp) {
    var _loop = function(i1) {
        bacterias[i1].forEach(function(b) {
            return drawCircle(b.position.x, b.position.y, actualRadius(b), BACT_COLORS[i1]);
        });
    };
    if (newClick) {
        bactToShow = showMouseIntersectedBact();
        newClick = false;
    } else if (bactToShow) {
        if (bactToShow.state == State.dead) {
            bactToShow = null;
            newClick = false;
        }
    }
    var text = "";
    if (bactToShow) {
        text = stringifyBacteria(bactToShow);
    }
    setPopup(text);
    var delta = timestamp - lastRenderTime;
    lastRenderTime = timestamp;
    var deltaWarped = delta * gameSpeed;
    if (pause) {
        deltaWarped = 0;
    }
    if (bacterias[0].length < MAX_BACTS) {
        lastLvl0RespawnTime += deltaWarped;
        if (lastLvl0RespawnTime > LVL0_REPLANT_CD) {
            newBacterias[0].push(generateBacteria(0));
            lastLvl0RespawnTime = 0;
        }
    }
    bacterias.forEach(function(arr) {
        return arr.forEach(function(b) {
            return doOneBacteriaTick(b, deltaWarped);
        });
    });
    for(var i = 0; i < BACTERIA_LEVELS; i++){
        bacterias[i] = bacterias[i].filter(function(b) {
            return b.state != State.dead;
        });
        bacterias[i] = _toConsumableArray(bacterias[i]).concat(_toConsumableArray(newBacterias[i]));
        newBacterias[i] = [];
    }
    var fps = 1000 / delta;
    drawBackground();
    for(var i1 = 0; i1 < BACTERIA_LEVELS; i1++)_loop(i1);
    if (bactToShow) {
        var radius = actualRadius(bactToShow) + SELECT_RECT_PADDING;
        drawEmptyRect(bactToShow.position.x - radius, bactToShow.position.y - radius, radius * 2, radius * 2);
    }
    var font = "35px serif";
    var textColor = "yellow";
    drawText(10, TEXT_Y_START, "fps: " + Math.floor(fps), font, textColor);
    var curY = 40;
    for(var l = 0; l < BACTERIA_LEVELS; l++){
        curY += TEXT_PAD;
        drawText(10, curY, "lvl".concat(l, " bacts:: ").concat(bacterias[l].length), font, BACT_COLORS[l]);
    }
    curY += TEXT_PAD;
    drawText(10, curY, "game speed: ".concat(gameSpeed), font, textColor);
    window.requestAnimationFrame(mainLoop);
}
reset();

