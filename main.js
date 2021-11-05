//This is currently a prototype of the main game loop. It currently runs in an infinite loop and outputs to the console.
//Mostly just exists to get stuff working before it's hooked up to graphics

//@ts-check
//
//Will make sense w/ occupation
/**
* @typedef {{
* resource: String,
* quant: Number,
* chance: Number
* }} InvGain
*/

//Occupation definition
//Contains the production per second per worker of each resource (enabling multiple resources produced by 1 job)
//Also whether a job is active and number of people working on it
//Products also have a % chance for additional products (% is 100 for main resource)
//Currently production is per tick
/**
* @typedef {{
* Name: String,
* Products: InvGain[],
* Enabled: Boolean,
* Assigned: Number
* }} Occupation
*/

//Base resources object
//Driven is a "fake" number used to represent driving off zombies (1 leaves when it hits 1)
//Code is simpler with it included here
let resources = { food: 20, materials: 30, medicine: 3, driven: 0 };
//Also store the change in each resource
let resourceChanges = { food: 0, materials: 0, medicine: 0, driven: 0 };
//Occupations
/** @type {Occupation} */
let foodScav = {
    Name: "Food Scavaging",
    Products: [{ resource: "food", quant: 0.25, chance: 1 }, { resource: "medicine", quant: 1, chance: 0.05 }],
    Enabled: true,
    Assigned: 0
}

/** @type {Occupation} */
let matScav = {
    Name: "Material Scavaging",
    Products: [{ resource: "materials", quant: 0.25, chance: 1 }, { resource: "medicine", quant: 1, chance: 0.05 }],
    Enabled: true,
    Assigned: 0
}

/** @type {Occupation} */
let protecting = {
    Name: "Scaring off zombies",
    Products: [{ resource: "driven", quant: 0.2, chance: 1 }],
    Enabled: true,
    Assigned: 0
}

//How long it takes for an update tick to happen(in ms)
let tickRate = 1000;

let occupations = [foodScav, matScav, protecting]
let totPop = 3;
let availPop = 3;
let closeZom = 0;
let totZom = 100000;
let zomTime = 0;
let foodRate = 0;

function gameLoop() {
    foodRate = totPop * -0.02;
    //Reset prior resource changes
    for (const resourceC in resourceChanges)
        resourceChanges[resourceC] = 0
    //Add the resources from the last tick
    occupations.forEach((val) => {
        if (val.Enabled && val.Assigned > 0)
            val.Products.forEach((gainObj) => {
                if (1 == gainObj.chance){
                    resources[gainObj.resource] += gainObj.quant * val.Assigned
                    resourceChanges[gainObj.resource] += gainObj.quant * val.Assigned
                }
                //Handles repeated rolling for chance-based thing
                //Each 10th of the assigned units gets 1 roll
                //Roll only once every second (for now 1 second = 100 ticks)
                else {
                    //Make sure that if we have less than 10 assigned we do that number of rolls
                    let numRolls = Math.min(val.Assigned, 10);
                    //Similarly, make sure we have a whole number (min 1) gains per success
                    let successfulUnits = Math.max(1, Math.floor(val.Assigned / 10))
                    for (let i = 0; i < numRolls; i++) {
                        if (Math.random() < gainObj.chance){
                            resources[gainObj.resource] += gainObj.quant * successfulUnits
                            resourceChanges[gainObj.resource] += gainObj.quant * successfulUnits
                        }
                    }
                }
            })
    })
    resources.food += foodRate;
    resourceChanges.food += foodRate
    for (const resource in resources){
        if(resources[resource] < 0)
            resources[resource] = 0
    }
    for (const resourceC in resourceChanges)
        resourceChanges[resourceC] = resourceChanges[resourceC].toFixed(2)
    //handles zombie arrivals
    zomTime += tickRate/1000;
    if (zomTime >= 30 / Math.max(totPop, 1)) {
        zomTime = 0;
        closeZom += 1;
    }
    //And being driven off
    //slightly more complex than it needs to be to deal with having many kicking zombies out
    if (resources.driven >= 1 && closeZom >= 1) {
        closeZom -= Math.min(Math.floor(resources.driven), closeZom)
        resources.driven = 0;
    }

    updateNums();
}

//Function for manually assigning population to a task
//Index for which to add is defined by the button/function call
//Used for both adding and subtracting
/**
 * @param numAssign: {Object}
 * @param occupationAdded : {Number}
 */
function assignPop(numAssign, occupationAdded) {
    //Get the number we're assigning
    let baseAssign = parseInt(numAssign.getElementsByTagName("input")[0].value);
    //If there's not enough population to assign, assign as many as possible
    //Obviously this check won't matter if we're taking away (numAssign negative)
    let actAssign = Math.min(baseAssign, availPop)
    //If we are negative though, we can't take away more people than are assigned
    actAssign = Math.max(actAssign, -occupations[occupationAdded].Assigned)
    occupations[occupationAdded].Assigned += actAssign;
    availPop -= actAssign;
    console.log(occupations[occupationAdded].Assigned)
    updateNums();
}

//Function for curing population
function cureZombie() {
    if (resources.medicine >= 1 && closeZom >= 1) {
        resources.medicine -= 1;
        availPop += 1;
        totPop += 1;
        closeZom -= 1;
        totZom -= 1;
    }
}

function updateHuman() {
    let human = document.getElementById("human");
    human.innerHTML = availPop + " / " + totPop;
}

function updateZombie() {
    let zombie = document.getElementById("zombie");
    zombie.innerHTML = closeZom .toString();
}

function updateMed() {
    let med = document.getElementById("medicine");
    med.innerHTML = resources.medicine.toString();
    
}

function updateFood() {
    let food = document.getElementById("food");
    food.innerHTML = (Math.round(resources.food * 100) / 100).toString();
    let fRate = document.getElementById("foodRate");
    fRate.innerHTML = resourceChanges.food + "/s"
}

function updateMaterials() {
    let mat = document.getElementById("material");
    mat.innerHTML = resources.materials.toString();
    let mRate = document.getElementById("matRate");
    mRate.innerHTML = resourceChanges.materials + "/s"
}

function updateScare() {
    let scar = document.getElementById("scare");
    scar.innerHTML = resources.driven.toString();
    let sRate = document.getElementById("scaRate");
    sRate.innerHTML = resourceChanges.driven + "/s"
}


function updateNums() {
    updateHuman();
    updateZombie();
    updateMed();
    updateFood();
    updateMaterials()
    updateScare();
    console.log(resourceChanges.materials)
}

gameLoop();
var timer = function () {
    gameLoop();
    setTimeout(timer, tickRate);
}
setTimeout(timer, tickRate);