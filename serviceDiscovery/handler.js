import uuid from "uuid";
console.log("before require service discovery - process.env.stage = " + process.env.stage);
const Response = require("../libs/response-lib");
var res = new Response();
const ServDisc = require("./serviceDiscovery");


export async function lookup(event) {
    try {
        let service = new ServDisc(event);
        var result =  await service.lookup(event);
    }
    catch(err) {
         return res.error(err);
    }
    return res.success(result);
}


export async function register(event) {
    try {
        let service = new ServDisc(event);
        var result =  await service.register(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}


export async function deregister(event) {
    try {
        let service = new ServDisc(event);
        var result =  await service.deregister(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}

