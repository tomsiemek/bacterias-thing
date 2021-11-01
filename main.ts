// constants
const MAX_INIT_VOLUME = 70
const REPRODUCTION_CD = 5000
//const MIN_REPRO_CD = 10000
const LVL0_REPLANT_CD = 100
const VOLUME_TRANSFER_SPEED = 0.01
const MAX_GAME_SPEED = 35
const BACT_SPEED = 0.4
const BASE_RADIUS = 18
const MAX_VOLUME = 100
const METABOLISM_SPEED = 0.001
const VOLUME_ACTION_THRESHOLD = MAX_VOLUME / 2

const EVOLUTION_AGE = 30_000//100_000

const NEW_BACT_VOLUME_PERC = 0.5

const BACTERIA_LEVELS = 5

const BACT_COLORS = ["#00ff00", "#42b3f5", "#8742f5", "#b6f542", "#ff0000"]

const BACTERIA_INITIAL_N = 1800
const MAX_BACTS = 2500
const CONTACT_DISTANCE = 18 // on big deltas it get buggy so it need big collision box - it flies throught the poing

const TEXT_PAD = 50
const TEXT_Y_START = 40

const SELECT_RECT_PADDING = 10
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
    mousePos.x = event.offsetX
    mousePos.y = event.offsetY

}
function mouseClickHandler(event) {
    mousePos.x = event.offsetX
    mousePos.y = event.offsetY
    newClick = true
    showPopup()
}

function showPopup() {
    popupDiv.style.visibility = "visible"
}

function hidePopup() {
    popupDiv.style.visibility = "hidden"
}

function setPopup(text: string) {
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
    consumed,
    evolving
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
    level: number,
    age: number
}


// variables
let gameSpeed = 1
let lastRenderTime = 0
let bacterias: Bacteria[][]
let newBacterias: Bacteria[][]
let lastLvl0RespawnTime: number
//let mouseMoved: boolean
let newClick: boolean
let mousePos: Position
let pause: boolean
let bactToShow: Bacteria
// functions

function reset() {
    gameSpeed = 1
    lastRenderTime = 0
    bacterias = []
    newBacterias = []
    mousePos = { x: 0, y: 0 }
    newClick = false
    pause = false
    lastLvl0RespawnTime = 0
    bactToShow = null
    //mouseMoved = false
    for (let level = 0; level < BACTERIA_LEVELS; level++) {
        const arr = []
        for (let i = 0; i < BACTERIA_INITIAL_N / (level + 1); i++) {
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
        timeSinceReproduction: 0,
        speed: BACT_SPEED,
        eating: null,
        level,
        age: 0
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

function drawEmptyRect(x: number, y: number, w: number, h: number, frameColor: string = "white") {
    ctx.strokeStyle = frameColor
    ctx.lineWidth = 3
    ctx.strokeRect(x, y, w, h)
}

function drawFilledRect(x: number, y: number, w: number, h: number, fillColor: string = "white") {
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

function reproduce(mother: Bacteria): Bacteria {
    const newBacteria = generateBacteria(mother.level)
    newBacteria.position = { ...mother.position }
    newBacteria.volume = mother.volume * NEW_BACT_VOLUME_PERC
    return newBacteria
}

function doOneBacteriaTick(bact: Bacteria, delta: number) {
    if (delta == 0 || pause) {
        return
    }
    if (bact.volume < 0) {
        bact.state = State.dead
        return
    }
    bact.age += delta
    if (bact.age > EVOLUTION_AGE && bact.level < BACTERIA_LEVELS - 1) {
        bact.age = 0
        bact.state = State.evolving
        bact.level += 1
        // die out of age
        // if (bact.level == BACTERIA_LEVELS) {
        //     bact.state = State.dead
        // }
        newBacterias[bact.level].push(bact)
        return
    }
    if (bact.level == 0) {
        if (bact.state != State.dead && bact.volume < MAX_INIT_VOLUME) {
            bact.volume += METABOLISM_SPEED * delta
        }
        return
    }
    console.assert(bact.level > 0, { msg: "level 0 shoudlnt be here" })
    bact.volume -= delta * METABOLISM_SPEED
    switch (bact.state) {
        case State.evolving: {
            bact.state = State.idle
            break;
        }
        case State.idle: {
            if (bact.volume < VOLUME_ACTION_THRESHOLD) {
                bact.state = State.search
                bact.destination = getRandomPosition()
            }
            else {
                bact.timeSinceReproduction += delta
                if (bact.timeSinceReproduction > REPRODUCTION_CD) {
                    bact.timeSinceReproduction = 0
                    if (bacterias[bact.level].length + newBacterias[bact.level].length < MAX_BACTS) {
                        const newBacteria = reproduce(bact)
                        bact.volume -= newBacteria.volume
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
        default: {
            break;
        }
    }
}



function showMouseIntersectedBact(): Bacteria {
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
function mainLoop(timestamp: number) {
    if (newClick) {
        bactToShow = showMouseIntersectedBact()
        newClick = false
    }
    else if (bactToShow) {
        if (bactToShow.state == State.dead) {
            bactToShow = null
            newClick = false
        }
    }
    let text = ""
    if (bactToShow) {
        text = stringifyBacteria(bactToShow)
    }
    setPopup(text)
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
        bacterias[i] = bacterias[i].filter(b => (b.state != State.dead && b.state != State.evolving))
        bacterias[i] = [...bacterias[i], ...newBacterias[i]]
        newBacterias[i] = []
    }

    const fps = 1000 / delta


    drawBackground()
    for (let i = 0; i < BACTERIA_LEVELS; i++) {
        bacterias[i].forEach(b => drawCircle(b.position.x, b.position.y, actualRadius(b), BACT_COLORS[i]))
    }
    if (bactToShow) {
        const radius = actualRadius(bactToShow) + SELECT_RECT_PADDING
        drawEmptyRect(bactToShow.position.x - radius, bactToShow.position.y - radius, radius * 2, radius * 2)
    }
    const tranparentWhite = "rgba(0, 0, 0, 0.7)"
    drawFilledRect(0,0,300,40 + TEXT_PAD*(BACTERIA_LEVELS+2),tranparentWhite)
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