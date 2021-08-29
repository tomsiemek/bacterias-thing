// constants
const MAX_INIT_VOLUME = 70
const REPRODUCTION_CD = 50000
//const MIN_REPRO_CD = 10000
const LVL0_REPLANT_CD  = 1000
const VOLUME_TRANSFER_SPEED = 0.01
const MAX_GAME_SPEED = 35
const BACT_SPEED = 0.05
const MAX_SPEED = 0.05
const BASE_RADIUS = 25
const MAX_VOLUME = 100
const METABOLISM_SPEED = 0.001
const VOLUME_ACTION_THRESHOLD = MAX_VOLUME / 2

const NEW_BACT_VOLUME_PERC = 0.5

const BACTERIA_LEVELS = 3

const BACT_COLORS = ["#00ff00", "#42b3f5", "#8742f5", "#b6f542", "#ff0000"]

const BACTERIA_INITIAL_N = 50
const MAX_BACTS = 500
const CONTACT_DISTANCE = 18 // on big deltas it get buggy so it need big collision box - it flies throught the poing

const TEXT_PAD = 50
const TEXT_Y_START = 40
// init canvas
const gameDiv = document.getElementById("game-div")
const canvas = document.createElement("canvas")
canvas.width = 1600
canvas.height = 900
gameDiv.appendChild(canvas)
const ctx = canvas.getContext("2d")

const popupDiv = document.createElement("div")//document.getElementById("popup")
popupDiv.id = "popup"
gameDiv.appendChild(popupDiv)
function onChange(event) {
    const val = event.target.value
    gameSpeed = val
}

function mouseMoveHandler(event) {
    // popupActive = false
    // hidePopup()
}
function mouseClickHandler(event) {
    mousePos.x = event.offsetX
    mousePos.y = event.offsetY
    popupActive = true
    showPopup()
}

function showPopup() {
    popupDiv.style.visibility = "visible"
}

function hidePopup() {
    popupDiv.style.visibility = "hidden"
}

function setPopup(text:string) {
    popupDiv.textContent = text
}
document.addEventListener("keyup", e => { 
    const keyName = e.key
    if (keyName == " ") {
        console.log("pauza")
        pause = !pause
    }
})
  
canvas.addEventListener("mousemove", mouseMoveHandler)
canvas.addEventListener("mouseup", mouseClickHandler)
popupDiv.onclick = hidePopup
const inputRange = document.getElementById("input-speed") as HTMLInputElement
inputRange.max = String(MAX_GAME_SPEED)
inputRange.onchange = onChange

const inputWrapper = document.getElementById("input-range-wrapper")
inputWrapper.style.top = String(TEXT_Y_START + TEXT_PAD * (BACTERIA_LEVELS + 2))


// types

enum State {
    idle,
    search,
    eat,
    dead,
    consumed
}

interface Position {
    x: number,
    y: number
}

interface Bacteria {
    state: State,
    position: Position,
    volume: number,
    destination: Position,
    timeSinceReproduction: number,
    speed: number,
    eating: Bacteria,
    level: number
}


// variables
let gameSpeed = 1
let lastRenderTime = 0
let bacterias: Bacteria[][]
let newBacterias: Bacteria[][]
let lastLvl0RespawnTime: number
//let mouseMoved: boolean
let popupActive:boolean
let mousePos: Position
let pause:boolean
// functions

function reset() {
    gameSpeed = 1
    lastRenderTime = 0
    bacterias = []
    newBacterias = []
    mousePos = { x: 0, y: 0 }
    popupActive = false
    pause = false
    lastLvl0RespawnTime = 0
    //mouseMoved = false
    for (let level = 0; level < BACTERIA_LEVELS; level++) {
        const arr = []
        for (let i = 0; i < BACTERIA_INITIAL_N / (level+1); i++) {
            arr.push(generateBacteria(level))
        }
        bacterias[level] = arr
        newBacterias[level] = []
    }

    window.requestAnimationFrame(mainLoop)
}

function randomFrom0ToN(n: number): number {
    return Math.floor(Math.random() * n)
}
function randBetween(a: number, b: number): number {
    return Math.random() * (b - a) + a
}
function distance(p1: Position, p2: Position): number {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2))
}
function getRandomPosition(): Position {
    return {
        x: randomFrom0ToN(canvas.width),
        y: randomFrom0ToN(canvas.height)
    }
}

function generateBacteria(level: number): Bacteria {
    return {
        state: State.idle,
        position: getRandomPosition(),
        volume: randBetween(0, MAX_INIT_VOLUME),
        destination: null,
        timeSinceReproduction: REPRODUCTION_CD,
        speed: BACT_SPEED,
        eating: null,
        level
    }
}

function actualRadius(bact: Bacteria): number {
    return bact.volume / MAX_VOLUME * BASE_RADIUS
}

function checkCollision(bact: Bacteria, colliders: Bacteria[]): Bacteria {
    for (const col of colliders) {
        if (col.state != State.dead &&
            distance(bact.position, col.position) < actualRadius(bact) + actualRadius(col)) {
            return col
        }
    }
    return null
}

function getMoveVector(p1: Position, p2: Position): Position {
    const x = p2.x - p1.x
    const y = p2.y - p1.y
    const len = distance(p1, p2)
    return {
        x: x / len,
        y: y / len
    }
}

function drawCircle(x: number, y: number, radius: number, color: string) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, Math.max(0, radius), 0, Math.PI * 2, false)
    ctx.fill()
}

function drawRect(x: number, y: number, w: number, h: number, fillColor: string, frameColor: "white") {
    ctx.strokeStyle = frameColor
    ctx.strokeRect(x, y, w, h)
    ctx.fillStyle = fillColor
    ctx.fillRect(x, y, w, h)
}

function drawBackground() {
    ctx.fillStyle = "black"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
}

function drawText(x: number, y: number, text: string, font: string, color: string) {
    ctx.fillStyle = color
    if (font) {
        ctx.font = font
    }
    ctx.fillText(text, x, y)
}

function doOneBacteriaTick(bact: Bacteria, delta: number) {
    if (delta == 0 || pause) {
        return
    }
    if (bact.volume < 0) {
        bact.state = State.dead
        return
    }
    if (bact.level == 0) {
        if (bact.state != State.dead && bact.volume < MAX_INIT_VOLUME) {
            bact.volume += METABOLISM_SPEED * delta
        }
        // if (bacterias[0].length + newBacterias[0].length < MAX_BACTS) {
        //     bact.timeSinceReproduction += delta
        //     if (bact.timeSinceReproduction > REPRODUCTION_CD) {
        //         newBacterias[0].push(generateBacteria(0))
        //         bact.timeSinceReproduction = 0
        //     }
        // }
        return
    }
    console.assert(bact.level > 0, { msg: "level 0 shoudlnt be here" })
    bact.volume -= delta * METABOLISM_SPEED
    switch (bact.state) {
        case State.idle: {
            if (bact.volume < VOLUME_ACTION_THRESHOLD) {
                bact.state = State.search
                bact.destination = getRandomPosition()
            }
            else {
                bact.timeSinceReproduction += delta
                if (bact.timeSinceReproduction > REPRODUCTION_CD * bact.level) {
                    bact.timeSinceReproduction = 0
                    if (bacterias[bact.level].length + newBacterias[bact.level].length < MAX_BACTS) {
                        const newBacteria = generateBacteria(bact.level)
                        newBacteria.position =  {...bact.position}
                        const newBactVol = bact.volume * NEW_BACT_VOLUME_PERC
                        newBacteria.volume = newBactVol
                        bact.volume -= newBactVol
                        newBacterias[bact.level].push(newBacteria)
                    }

                }
            }
            break;
        }
        case State.search: {
            if (distance(bact.position, bact.destination) < CONTACT_DISTANCE) {
                bact.destination = getRandomPosition()
            }
            else {
                const bactCollided = checkCollision(bact, bacterias[bact.level - 1])
                if (bactCollided) {
                    bact.state = State.eat
                    bact.eating = bactCollided
                    bactCollided.state = State.consumed
                }
                else {
                    const moveVector = getMoveVector(bact.position, bact.destination)
                    const speedFactor = delta * bact.speed //* Math.sqrt(bact.volume / MAX_VOLUME)
                    bact.position.x += moveVector.x * speedFactor
                    bact.position.y += moveVector.y * speedFactor
                }
            }
            break;
        }
        case State.eat: {
            const bactEaten = bact.eating
            if (bactEaten.state == State.dead) {
                bact.state = State.idle
            }
            else if (bact.volume > MAX_VOLUME) {
                bact.state = State.idle
                bactEaten.state = State.idle
            }
            else {
                const volChange = delta * VOLUME_TRANSFER_SPEED
                bact.volume += volChange
                bactEaten.volume -= volChange
            }
            break;
        }
        default:{
            break;
        }
    }
}



function showMouseIntersectedBact():Bacteria {
    for (let i = 0; i < BACTERIA_LEVELS; i++) {
        const arr = bacterias[i]
        for (const bact of arr) {
            if (distance(mousePos, bact.position) < actualRadius(bact)) {
                console.log(bact)
                return bact
            }
        }       
    }
    return null
}
function stringifyBacteria(bact: Bacteria) {
    return JSON.stringify(bact, (key, val) => {
        if (val != null) {
            if (key == "eating") {
                return undefined
            }
            return val.toFixed ? val.toFixed(3) : val
        }
        return undefined
    })
}
function mainLoop(timestamp) {
    if (popupActive) {
        const bactToShow = showMouseIntersectedBact()
        let text = ""
        if(bactToShow) {
            text = stringifyBacteria(bactToShow)
        }         
        setPopup(text)
    }
    const delta = timestamp - lastRenderTime
    lastRenderTime = timestamp
    let deltaWarped = delta * gameSpeed
    if (pause) {
        deltaWarped = 0
    }
    if (bacterias[0].length < MAX_BACTS) {
        lastLvl0RespawnTime += deltaWarped
        if (lastLvl0RespawnTime > LVL0_REPLANT_CD) {
            newBacterias[0].push(generateBacteria(0))
            lastLvl0RespawnTime = 0
        }
    }
    
    bacterias.forEach(arr => arr.forEach(b => doOneBacteriaTick(b, deltaWarped)))
    for (let i = 0; i < BACTERIA_LEVELS; i++) {
        bacterias[i] = bacterias[i].filter(b => b.state != State.dead)
        bacterias[i] = [...bacterias[i], ...newBacterias[i]]
        newBacterias[i] = []
    }

    const fps = 1000 / delta


    drawBackground()
    for (let i = 0; i < BACTERIA_LEVELS; i++) {
        bacterias[i].forEach(b => drawCircle(b.position.x, b.position.y, actualRadius(b), BACT_COLORS[i]))
    }
    const font = "35px serif"
    const textColor = "yellow"
    drawText(10, TEXT_Y_START, "fps: " + Math.floor(fps), font, textColor)
    let curY = 40
    for (let l = 0; l < BACTERIA_LEVELS; l++) {
        curY += TEXT_PAD
        drawText(10, curY, `lvl${l} bacts:: ${bacterias[l].length}`, font, BACT_COLORS[l])
    }
    curY += TEXT_PAD
    drawText(10, curY, `game speed: ${gameSpeed}`, font, textColor)
    window.requestAnimationFrame(mainLoop)
}


reset()