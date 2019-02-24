
const Response = require("../libs/response-lib");
var res = new Response(true); //set response to use internalResponse (no headers, etc)
const UserInternals = require("./internal");
const serviceDiscovery = require('../serviceDiscovery/serviceDiscovery-helper');
var functionRegistration = {
    lookupPool: { ttl: 300, type: "internal", status: "healthy"},
    createSystem: {ttl: 300, type: "internal", status: "healthy"},
    reg: {ttl: 300, type: "internal", status: "healthy"},
    deleteUser: {ttl: 300, type: "internal", status: "healthy"},
    deleteTenantPolicies: {ttl: 300, type: "internal", status: "healthy"},
}

export async function serviceRegister(event) {

    var apiURL = process.env.apiURL;
    var serviceAPI = process.env.serviceURL ;
    var prefix = process.env.PROJECT_NAME + '-' + 'UserMgr' + '-' + process.env.stage + '-';

    try {
        var result = await serviceDiscovery.serviceRegister(functionRegistration,apiURL,serviceAPI,prefix);
        console.log("services registered!")
    }
    catch(err) {
        console.log("services registration failure!")
        return res.error(err);
    }
    return res.success(result);
}

export async function lookupPool(event) {
    var userInternals = new UserInternals(event);
    try {
        var result =  await userInternals.lookupPool(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}


export async function createSystem(event) {
    var userInternals = new UserInternals(event);
    try {
        var result =  await userInternals.createSystem(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}



export async function reg(event) {
    var userInternals = new UserInternals(event);
    try {
        var result =  await userInternals.reg(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}

export async function deleteUser(event) {
    var userInternals = new UserInternals(event);
    try {
        var result =  await userInternals.deleteUser(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}


export async function deleteTenantPolicies(event) {
    var userInternals = new UserInternals(event);
    try {
        var result =  await userInternals.deleteTenantPolicies(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}


