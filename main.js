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
let resources = {food: 20, materials: 30, medicine: 3, driven: 0};
//Occupations
/** @type {Occupation} */
let  foodScav = {
    Name: "Food Scavaging",
    Products: [{resource: "food", quant: 0.25, chance: 1}, {resource: "medicine", quant: 1, chance: 0.05}],
    Enabled: true,
    Assigned: 0
}

/** @type {Occupation} */
let  matScav = {
    Name: "Material Scavaging",
    Products: [{resource: "food", quant: 0.25, chance: 1}, {resource: "medicine", quant: 1, chance: 0.05}],
    Enabled: true,
    Assigned: 0
}

/** @type {Occupation} */
let  protecting = {
    Name: "Scaring off zombies",
    Products: [{resource: "driven", quant: 0.2, chance: 1}],
    Enabled: true,
    Assigned: 0
}

let occupations = [foodScav, matScav, protecting]
let totPop = 0;
let availPop = 0;
let closeZom = 0;
let totZom = 100000;
let zomTime = 0;
while(true){
    //Add the resources from the last tick
    occupations.forEach((val) => {
        if(val.Enabled && val.Assigned > 0)
            val.Products.forEach((gainObj) => {
                //Need to figure out a way to roll per assigned person without making it awful
                if(Math.random() < gainObj.chance)
                    resources[gainObj.resource] += gainObj.quant * val.Assigned
            })
    })
    //handles zombie arrivals
    zomTime += 0.01;
    if(zomTime >= 30/Math.max(totPop, 1)){
        zomTime = 0;
        closeZom += 1;
    }
    //And being driven off
    //slightly more complex than it needs to be to deal with having many kicking zombies out
    if(resources.driven >= 1){
        closeZom -= Math.min(Math.floor(resources.driven), closeZom)
        resources.driven = 0;
    }
    //just output all resources/info for now
    for (let oct in occupations)
        console.log(oct)
    for (let res in resources)
        console.log(res)
    console.log("curr pop " + totPop + " avail pop " + availPop)
    console.log("close zombies/total zombies " + closeZom + "/" + totZom)
}

//Function for manually assigning population to a task
//Index for which to add is defined by the button/function call
//Used for both adding and subtracting
/**
 * @param numAssign: {Number}
 * @param occupationAdded : {Occupation}
 */
function assignPop(numAssign, occupationAdded){
    //If there's not enough population to assign, assign as many as possible
    //Obviously this check won't matter if we're taking away (numAssign negative)
    let actAssign = Math.min(numAssign, availPop)
    //If we are negative though, we can't take away more people than are assigned
    actAssign = Math.max(actAssign, -occupationAdded.Assigned)
    occupationAdded.Assigned += actAssign;
    availPop -= actAssign;
}

//Function for curing population
function cureZombie(){
    if(resources.medicine >= 1 && closeZom >= 1){
        resources.medicine -= 1;
        availPop += 1;
        totPop += 1;
        closeZom -= 1;
        totZom -= 1;
    }
}