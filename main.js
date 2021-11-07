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
* UnlockRequirement: Function,
* Assigned: Number
* }} Occupation
*/

//Definition of object holding how an upgrade affects a resource
/**
 * @typedef {{
 * resource: String,
 * mult: Number,
 * storage: Number
 * }}InvMod
 */

//Definition of buildings
/**
 * @typedef {{
 * Name: String,
 * Mods: InvMod[],
 * Enabled: Boolean,
 * UnlockRequirement: Function,
 * BaseCost: Number,
 * CostScale: Number,
 * Owned: Number
 * }} Building
 */
//change BastCost to a list of key/value pairs to have more varied costs than just resources
//Base resources object
//Driven is a "fake" number used to represent driving off zombies (1 leaves when it hits 1)
//Code is simpler with it included here
let resources = { food: 20, materials: 30, medicine: 3, driven: 0, science: 0};
//Also store the change in each resource
let resourceChanges = { food: 0, materials: 0, medicine: 0, driven: 0, science: 0 };
//And the multipliers to the production of each
let resourceMults = {food: 0, materials: 0, medicine: 0, driven: 0, science: 0}
//And the caps for the resources
let resourceCaps = {food: 100, materials: 150, medicine: 20, driven: 20, science: 0}
//Occupations
/** @type {Occupation} */
let foodScav = {
    Name: "Food Scavaging",
    Products: [{ resource: "food", quant: 0.15, chance: 1 }, { resource: "medicine", quant: 1, chance: 0.05 }],
    UnlockRequirement: ()=>{return true},
    Enabled: true,
    Assigned: 0
}

/** @type {Occupation} */
let matScav = {
    Name: "Material Scavaging",
    Products: [{ resource: "materials", quant: 0.25, chance: 1 }, { resource: "medicine", quant: 1, chance: 0.05 }],
    UnlockRequirement: ()=>{return true},
    Enabled: true,
    Assigned: 0
}

/** @type {Occupation} */
let protecting = {
    Name: "Scaring off zombies",
    Products: [{ resource: "driven", quant: 0.2, chance: 1 }],
    UnlockRequirement: ()=>{return true},
    Enabled: true,
    Assigned: 0
}

/** @type {Building} */
let laboratory = {
    Name: "Lab",
    Mods: [{resource: "science", mult: 0.5, storage: 0}],
    Enabled: false,
    UnlockRequirement: ()=>{totPop >= 30},
    BaseCost: 300,
    CostScale: 1.25,
    Owned: 0
}


/** @type {Occupation} */
let researching = {
    Name: "Researching",
    Products: [{resource: "science", quant: 0.1, chance: 1}, {resource: "medicine", quant:1, chance: 1}],
    UnlockRequirement: ()=>{laboratory.Owned > 0},
    Enabled: false,
    Assigned: 0
}

//Defining all the buildings here (except lab which was defined earlier for referencing reasons)
/** @type {Building} */
let farm = {
    Name: "Farm",
    Mods: [{resource: "food", mult: 0.2, storage: 0}],
    Enabled: true,
    UnlockRequirement: ()=>{return true},
    BaseCost: 100,
    CostScale: 1.2,
    Owned: 0
}

/** @type {Building} */
let warehouse = {
    Name: "Warehouse",
    Mods: [{resource: "food", mult: 0, storage: 100}, {resource: "materials", mult: 0, storage: 50},
        {resource: "medicine", mult: 0, storage: 2}],
    BaseCost: 120,
    CostScale: 1.1,
    Enabled: true,
    UnlockRequirement: ()=>{return true},
    Owned: 0
}

/** @type {Building} */
let workshop = {
    Name: "Workshop",
    Mods: [{resource: "materials", mult: 0.2, storage: 0}],
    Enabled: true,
    UnlockRequirement: ()=>{return true},
    BaseCost: 125,
    CostScale: 1.25,
    Owned: 0
}

/** @type {Building} */
let storage = {
    Name: "Storage",
    Mods: [{resource: "food", mult: 0, storage: 50}, {resource: "materials", mult: 0, storage: 100},
        {resource: "medicine", mult: 0, storage: 5}],
    Enabled: true,
    UnlockRequirement: ()=>{return true},
    BaseCost: 150,
    CostScale: 1.2,
    Owned: 0
}

/** @type {Building} */
let medstation = {
    Name: "Medstation",
    Mods: [{resource: "medicine", mult: 0.5, storage: 5}],
    Enabled: true,
    UnlockRequirement: ()=>{return true},
    BaseCost: 250,
    CostScale: 1.2,
    Owned: 0
}

//How long it takes for an update tick to happen(in ms)
let tickRate = 1000;

let occupations = [foodScav, matScav, protecting, researching]
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
                    resources[gainObj.resource] += gainObj.quant * val.Assigned * (1 + resourceMults[gainObj.resource])
                    resourceChanges[gainObj.resource] += gainObj.quant * val.Assigned * (1 + resourceMults[gainObj.resource])
                }
                //Handles repeated rolling for chance-based thing
                //Each 10th of the assigned units gets 1 roll
                //Roll only once every second (for now 1 second = 100 ticks)
                else {
                    //Make sure that if we have less than 10 assigned we do that number of rolls
                    let numRolls = Math.min(val.Assigned, 10);
                    //Similarly, make sure we have a whole number (min 1) gains per success
                    let successfulUnits = Math.max(1, Math.floor(val.Assigned / 10))
                    //Gainer increases increase chance here, not quantity
                    for (let i = 0; i < numRolls; i++) {
                        if (Math.random() < gainObj.chance * (1 + resourceMults[gainObj.resource])){
                            resources[gainObj.resource] += gainObj.quant * successfulUnits
                            resourceChanges[gainObj.resource] += gainObj.quant * successfulUnits
                        }
                    }
                }
            })
    })
    resources.food += foodRate;
    resourceChanges.food += foodRate
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
        let drivenNum = Math.min(Math.floor(resources.driven), closeZom)
        closeZom -= drivenNum
        resources.driven -=drivenNum
    }
    for (const resource in resources){
        resources[resource] = Math.max(0, resources[resource])
        resources[resource] = Math.min(resources[resource], resourceCaps[resource])
    }

    //Manually check just lab for unlock since no buildings object
    if(!laboratory.Enabled && laboratory.UnlockRequirement())
        laboratory.Enabled = true;

    //Check for unlocks for the occupations
    occupations.forEach((occ)=>{
        if(!occ.Enabled && occ.UnlockRequirement()){
            occ.Enabled = true;
        }
    })
    
    //Zombie attack
    if(closeZom >= totPop * 4){
        for (let resource in resources)
            resources[resource] *= 0.1
        alert("You have been attacked by zombies! Assign people to scare off zombies or cure neaby zombies to prevent the local zombies from building up, to avoid this happening again.")
        closeZom = 0;
    }
    updateNums();
    if(totZom == 0)
        alert("Congratulations! You've cured all infected zombies, and completed the game. You can keep playing, but there's no additional content past this point")
}

//Function for manually assigning population to a task
//Index for which to add is defined by the button/function call
//Used for both adding and subtracting
/**
 * @param numAssign: {Object}
 * @param occupationAdded : {Number}
 */
function assignPop(numAssign, occupationAdded, assignmentRecord) {
    if(!occupations[occupationAdded].Enabled)
        return
    //Get the number we're assigning
    let baseAssign = parseInt(numAssign.getElementsByTagName("input")[0].value);
    //Make sure it exists
    if(isNaN(baseAssign))
        return
    //If there's not enough population to assign, assign as many as possible
    //Obviously this check won't matter if we're taking away (numAssign negative)
    let actAssign = Math.min(baseAssign, availPop)
    //If we are negative though, we can't take away more people than are assigned
    actAssign = Math.max(actAssign, -occupations[occupationAdded].Assigned)
    occupations[occupationAdded].Assigned += actAssign;
    availPop -= actAssign;
    let currAssigned = occupations[occupationAdded].Assigned;
    assignmentRecord.innerHTML = assignmentRecord.innerHTML.slice(0, assignmentRecord.innerHTML.length - (currAssigned-actAssign).toString().length) + currAssigned
    updateNums();
}

//Function for curing population
function cureZombie() {
    let numCure = parseInt(document.getElementById("cureAssign").getElementsByTagName("input")[0].value);
    if(isNaN(numCure))
        return
    //Can't use more medicine than we have or cure more zombies than are around
    numCure = Math.min(resources.medicine, numCure)
    numCure = Math.min(closeZom, numCure)
    resources.medicine -= numCure;
    availPop += numCure;
    totPop += numCure;
    closeZom -= numCure;
    totZom -= numCure;
    updateNums();
}

function updateHuman() {
    let human = document.getElementById("human");
    human.innerHTML = availPop + " / " + totPop;
}

function updateZombie() {
    let zombie = document.getElementById("zombie");
    zombie.innerHTML = closeZom.toString();
}

function updateMed() {
    let med = document.getElementById("medicine");
    med.innerHTML = resources.medicine.toString() +"/"+ resourceCaps.medicine;
    let fRate = document.getElementById("medRate");
    fRate.innerHTML = resourceChanges.medicine + "/s"
}

function updateFood() {
    let food = document.getElementById("food");
    food.innerHTML = (Math.round(resources.food * 100) / 100).toString() +"/"+ resourceCaps.food;
    let fRate = document.getElementById("foodRate");
    fRate.innerHTML = resourceChanges.food + "/s"
}

function updateMaterials() {
    let mat = document.getElementById("material");
    mat.innerHTML = (Math.round(resources.materials * 100) / 100).toString() +"/"+ resourceCaps.materials;
    let mRate = document.getElementById("matRate");
    mRate.innerHTML = resourceChanges.materials + "/s"
}

function updateScare() {
    let scar = document.getElementById("scare");
    scar.innerHTML = resources.driven.toString() +"/"+ resourceCaps.driven;
    let sRate = document.getElementById("scaRate");
    sRate.innerHTML = resourceChanges.driven + "/s"
}
//Handles building of things
/**
 * 
 * @param {Building} toBuild 
 */
function buildBuilding(toBuild, initiatingButton, displayObj){
    if(toBuild.Enabled){
        if(resources.materials >= toBuild.BaseCost * Math.pow((1+ toBuild.CostScale), toBuild.Owned) * (1-resources.science/(resources.science + 75 ))){
            toBuild.Mods.forEach((mod) => {
                resourceCaps[mod.resource] += mod.storage
                resourceMults[mod.resource] += mod.mult
            })
            resources.materials -= toBuild.BaseCost * Math.pow((1+ toBuild.CostScale), toBuild.Owned)
            toBuild.Owned += 1
            //Need to figure out what benefit to display
            let valToShow = ""
            if(toBuild.Mods[0].mult != 0)
                valToShow = "" + toBuild.Mods[0].mult + "%"
            else{
                valToShow += toBuild.Mods[0].storage;
                for(let i = 1; i < toBuild.Mods.length; i++)
                    valToShow += "/"+ toBuild.Mods[i].storage
            }
            initiatingButton.innerHTML = " Build "+toBuild.Name+" (+"+valToShow+")<br> <br> "+ Math.round(toBuild.BaseCost * Math.pow((1+ toBuild.CostScale), toBuild.Owned)*100)/100 +" Materials"
            displayObj.innerHTML = " "+toBuild.Name+" <br> <br> Amount "+ toBuild.Owned
        }
    }
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