// init canvas
const gameDiv = document.getElementById("game-div")
const canvas = document.createElement("canvas")
canvas.width = 1600
canvas.height = 900
gameDiv.appendChild(canvas)
const ctx = canvas.getContext("2d")
// end
const NUMBER_OF_PLANTS = 500
const PLANT_RADIUS = 15
const PLANT_COLOR = "green"
const NEW_PLANT_CD = 2500

const NUMBER_OF_BACTERIA = 20
const BACTERIA_RADIUS = 20
const BACTERIA_COLOR = "BLUE"
const BACTERIA_SPEED = 0.05
const BACTERIA_METABOLISM_SPEED = 0.0005
const BACTERIA_EATING_SPEED = 0.01
const REPRODUCTION_CD = 1000
const BACTERIA_REPRODUCTION_NEW_HUNGER_MULT = 0.5
const PLANT_MAX_VOLUME = 100

const BACTERIA_HUNGER_THRESHOLD = 50
const BACTERIA_MAX_HUNGER = 100

const NUMBER_OF_PREDATORS = 1
const PREDATOR_RADIUS = 30
const PREDATOR_METABOLISM_SPEED = 0.0001
const PREDATOR_SPEED = 0.001

const MAX_GAME_SPEED = 35
const MIN_CONTACT_DISTANCE = PLANT_RADIUS + 1

const BACTERIA_STATE = {
    idle:"idle",
    lookForFood: "food",
    eating: "eating",
    dead: "dead",
    captivated: "captivated"
}

function randomFrom0ToN(n) {
    return Math.floor(Math.random() * n)
}
function randBetween(a, b) {
    return Math.random() * (b - a) + a
}
function distance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2))
}

const genNewPlant = () => ({
    x: randomFrom0ToN(canvas.width),
    y: randomFrom0ToN(canvas.height),
    alive: true,
    volume: randBetween(10, 20),
    growthRate: randBetween(0.0001, 0.005)
})

const genNewBacteria = () => ({
    x: randomFrom0ToN(canvas.width),
    y: randomFrom0ToN(canvas.height),
    state: BACTERIA_STATE.idle,
    hunger: randBetween(10, BACTERIA_MAX_HUNGER),
    destination: null,
    plantEaten: null,
    timeSinceLastReproduction: 0
})

const genNewPredator = () => ({
    ...randomPoint(),
    alive: true,
    hunger: randBetween(10, BACTERIA_MAX_HUNGER),
    destination: null,
    bacteriaEaten: null,
    state: BACTERIA_STATE.idle,
    timeSinceLastReproduction: 0
})

let newPredators = []

const genNewSmallPlant = () => genNewPlant(1)

let plants = Array.from({ "length": NUMBER_OF_PLANTS }, genNewPlant)
let predators = Array.from({"length": NUMBER_OF_PREDATORS}, genNewPredator)
function bacteriaStateColor(state) {
    if (state == BACTERIA_STATE.idle) {
        return "#0000ff"
    }
    else if (state == BACTERIA_STATE.lookForFood) {
       return "#3300ff"
    }
    else if (state == BACTERIA_STATE.eating) {
        return "#0033ff"
    }
    else return "#9731d6"
}




let bacterias = Array.from({ "length": NUMBER_OF_BACTERIA }, genNewBacteria )

let newBacterias = []


function actualBacteriaRadius(bacteria) {
    const radius = bacteria.hunger / BACTERIA_MAX_HUNGER * BACTERIA_RADIUS
    if (radius > 0) {
        return radius
    }
    return 0
}

function actualPlantRadius(plant) {
    const radius = plant.volume / 100 * PLANT_RADIUS
    if (radius > 0) {
        return radius
    }
    return 0
}

function randomPoint() {
    return {
        x: randomFrom0ToN(canvas.width),
        y: randomFrom0ToN(canvas.height)
    }
}

function checkCollisionWithPlant(bacteria) {
    for (const plant of plants) {
        if (plant.alive && distance(bacteria, plant) < actualPlantRadius(plant) + actualBacteriaRadius(bacteria)) {
            return plant
        }
    }
    return null
}

function getMoveVector(p1, p2) {
    const x = p2.x - p1.x
    const y = p2.y - p1.y
    const len = distance(p1, p2)
    return {
        x: x / len,
        y: y / len
    }
}
function bacteriaStateHandler(bacteria, delta) {
    bacteria.hunger -= delta * BACTERIA_METABOLISM_SPEED
    if (bacteria.state == BACTERIA_STATE.idle) {
        if (bacteria.hunger < BACTERIA_HUNGER_THRESHOLD) {
            bacteria.state = BACTERIA_STATE.lookForFood
            bacteria.destination = {
                x: randomFrom0ToN(canvas.width),
                y: randomFrom0ToN(canvas.height)
            }
        }
        else {
            bacteria.timeSinceLastReproduction += delta
            if (bacteria.timeSinceLastReproduction > REPRODUCTION_CD) {
                bacteria.timeSinceLastReproduction = 0
                const newBacteria = genNewBacteria()
                newBacteria.x = bacteria.x
                newBacteria.y = bacteria.y
                const newHunger = bacteria.hunger * BACTERIA_REPRODUCTION_NEW_HUNGER_MULT
                newBacteria.hunger = newHunger
                bacteria.hunger = newHunger
                newBacterias.push(newBacteria)
            }
        }
    }
    else if (bacteria.state == BACTERIA_STATE.lookForFood) {
        if (bacteria.hunger < 0) {
            bacteria.state = BACTERIA_STATE.dead
        }
        
        else if (distance(bacteria, bacteria.destination) < MIN_CONTACT_DISTANCE) {
            bacteria.destination = randomPoint()
        }
        else {
            const plantCollided = checkCollisionWithPlant(bacteria)
            if (plantCollided) {

                bacteria.state = BACTERIA_STATE.eating
                bacteria.plantEaten = plantCollided
            }
            else {
                const moveVector = getMoveVector(bacteria, bacteria.destination)
                const speedFactor = delta * BACTERIA_SPEED * Math.sqrt(bacteria.hunger / BACTERIA_MAX_HUNGER)
                bacteria.x += moveVector.x * speedFactor
                bacteria.y += moveVector.y * speedFactor
            }
        }
    }
    else if (bacteria.state == BACTERIA_STATE.eating) {
        const plantEaten = bacteria.plantEaten
        if (!plantEaten.alive) {
            bacteria.state = BACTERIA_STATE.idle
        }
        else if (plantEaten.volume <= 0) {
            plantEaten.alive = false
        }
        else if (bacteria.hunger >= BACTERIA_MAX_HUNGER) {
            bacteria.state = BACTERIA_STATE.idle
        }
        else {
            const eatDelta = delta * BACTERIA_EATING_SPEED
            bacteria.hunger += eatDelta //Math.min(BACTERIA_MAX_HUNGER, eatDelta + bacteria.hunger)
            plantEaten.volume -= eatDelta// Math.max(0, plantEaten.volume - eatDelta)
        }
    }
    // else if (bacteria.state == BACTERIA_STATE.captivated) {

    // }
}
function plantStateHandler(plant, delta) {
    if (plant.alive && plant.volume < PLANT_MAX_VOLUME) {
        plant.volume += plant.growthRate * delta
    }
}

function checkCollisionWithBacteria(predator) {
    for (const bacteria of bacterias) {
        if (bacteria.state != BACTERIA_STATE.dead && distance(bacteria, predator) < actualBacteriaRadius(predator) + actualBacteriaRadius(bacteria)) {
            return bacteria
        }
    }
    return null
}
    
function predatorStateHandler(predator, delta) {
    predator.hunger -= delta * PREDATOR_METABOLISM_SPEED
    if (predator.state == BACTERIA_STATE.idle) {
        if (predator.hunger < BACTERIA_HUNGER_THRESHOLD) {
            predator.state = BACTERIA_STATE.lookForFood
            predator.destination = {
                x: randomFrom0ToN(canvas.width),
                y: randomFrom0ToN(canvas.height)
            }
        }
        else {
            predator.timeSinceLastReproduction += delta
            if (predator.timeSinceLastReproduction > REPRODUCTION_CD) {
                predator.timeSinceLastReproduction = 0
                const newPredator = genNewPredator()
                newPredator.x = predator.x
                newPredator.y = predator.y
                const newHunger = predator.hunger * BACTERIA_REPRODUCTION_NEW_HUNGER_MULT
                newPredator.hunger = newHunger
                predator.hunger = newHunger
                newPredators.push(newPredator)
            }
        }
    }
    else if (predator.state == BACTERIA_STATE.lookForFood) {
        if (predator.hunger < 0) {
            predator.state = BACTERIA_STATE.dead
        }
        
        else if (distance(predator, predator.destination) < MIN_CONTACT_DISTANCE) {
            predator.destination = randomPoint()
        }
        else {
            const bacteriaCollided = checkCollisionWithBacteria(predator)
            if (bacteriaCollided) {

                predator.state = BACTERIA_STATE.eating
                predator.bacteriaEaten = bacteriaCollided
                bacteriaCollided.state = BACTERIA_STATE.captivated
            }
            else {
                const moveVector = getMoveVector(predator, predator.destination)
                const speedFactor = delta * PREDATOR_SPEED * Math.sqrt(predator.hunger / BACTERIA_MAX_HUNGER)
                predator.x += moveVector.x * speedFactor
                predator.y += moveVector.y * speedFactor
            }
        }
    }
    else if (predator.state == BACTERIA_STATE.eating) {
        const bacteriaEaten = predator.bacteriaEaten
        if (bacteriaEaten.state == BACTERIA_STATE.dead) {
            predator.state = BACTERIA_STATE.idle
        }
        else if (bacteriaEaten.hunger <= 0) {
            bacteriaEaten.state = BACTERIA_STATE.dead
        }
        else if (predator.hunger >= BACTERIA_MAX_HUNGER) {
            predator.state = BACTERIA_STATE.idle
            bacteriaEaten.state = BACTERIA_STATE.idle
        }
        else {
            const eatDelta = delta * BACTERIA_EATING_SPEED
            predator.hunger += eatDelta //Math.min(BACTERIA_MAX_HUNGER, eatDelta + bacteria.hunger)
            bacteriaEaten.hunger -= eatDelta// Math.max(0, plantEaten.volume - eatDelta)
        }
    }
}

function drawCircle(x, y, radius, color = "black") {

    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, Math.max(0,radius), 0, Math.PI * 2, false)
    ctx.fill()
}
function drawBackground() {
    ctx.fillStyle = "black"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
}

function drawText(x, y, text, font, color = "yellow") {
    ctx.fillStyle = color
    if (font) {
        ctx.font = font
    }
    ctx.fillText(text, x, y)
}
function moveBacterias() {
    bacterias.forEach(b => {
        b.x += randBetween(-5, 5)
        b.y += randBetween(-5, 5)
    })
}

let gameSpeedSetting = 1
function onChange(event) {
    const val = event.target.value
    gameSpeedSetting = val
}

const inputRange = document.getElementById("input-speed")
inputRange.max = MAX_GAME_SPEED
inputRange.onchange = onChange


let lastRenderTime = 0
let lastPlantRespawn = 0

function gameLoop(timestamp) {
    const delta = timestamp - lastRenderTime
    lastRenderTime = timestamp
    const gameSpeed = gameSpeedSetting
    const deltaWarped = delta * gameSpeed
    lastPlantRespawn += deltaWarped
    predators.forEach(p => predatorStateHandler(p, deltaWarped))
    plants.forEach(p => plantStateHandler(p, deltaWarped))
    bacterias.forEach(b => bacteriaStateHandler(b, deltaWarped))
    bacterias = bacterias.filter(v => v.state != BACTERIA_STATE.dead)
    predators = predators.filter(p => p.state != BACTERIA_STATE.dead)

    newPredators.forEach(p => predators.push(p))
    newPredators = []
    newBacterias.forEach(b => bacterias.push(b))
    newBacterias = []
    plants = plants.filter(p => p.alive)
    if (lastPlantRespawn > NEW_PLANT_CD && plants.length < NUMBER_OF_PLANTS) {
        lastPlantRespawn = 0
        plants.push(genNewPlant())
    }
    const fps = 1000 / delta


    drawBackground()
    plants.forEach(p => {
        if (p.alive) {
            drawCircle(p.x, p.y, actualPlantRadius(p), PLANT_COLOR)
        }
    })
    bacterias.forEach(b =>{
        let color = bacteriaStateColor(b.state)
        drawCircle(b.x, b.y, actualBacteriaRadius(b), color)
    })
    predators.forEach(p => {
        drawCircle(p.x, p.y, actualBacteriaRadius(p), "red")
    })
    const font = "35px serif"
    drawText(10, 40, "fps: " + Math.floor(fps), font)
    drawText(10, 90, `plants: ${plants.length}`, "35px serif")
    drawText(10, 140, `bacterias: ${bacterias.length}`, "35px serif") 
    drawText(10, 190, `predators: ${predators.length}`, "35px serif") 
    drawText(10, 240, `game speed: ${gameSpeed}`, font)
    window.requestAnimationFrame(gameLoop)
}
window.requestAnimationFrame(gameLoop)

