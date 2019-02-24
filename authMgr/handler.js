const Response = require("../libs/response-lib");
var res = new Response();
const AuthMgr = require("./authMgr");

const serviceDiscovery = require('../serviceDiscovery/serviceDiscovery-helper');
var functionRegistration = {
    health: {ttl: 300, type: "http", url: "/auth/health", status: "healthy"},
    authenticate: {ttl: 300, type: "http",  url: "/auth", status: "healthy"},
    refresh: {ttl: 300, type: "http", url: "/auth/refresh",  status: "healthy"},
    authMgr: {ttl: 300, type: "http", url: "",  status: "healthy"},
}

export async function serviceRegister(event) {

    var apiURL = process.env.apiURL;
    var serviceAPI = process.env.serviceURL ;
    var prefix = process.env.PROJECT_NAME + '-' + 'AuthMgr' + '-' + process.env.stage + '-';

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

export async function health(event) {
    try {
        let auth = new AuthMgr(event);
        var result =  await auth.health(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}

export async function authenticate(event) {
    try {
        let auth = new AuthMgr(event);
        var result =  await auth.authenticate(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}

export async function refresh(event) {
    try {
        let auth = new AuthMgr(event);
        var result =  await auth.refresh(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}



