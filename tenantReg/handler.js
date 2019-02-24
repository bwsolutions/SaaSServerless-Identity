const Response = require("../libs/response-lib");
var res = new Response();

const TenantReg = require("./tenantReg");
const serviceDiscovery = require('../serviceDiscovery/serviceDiscovery-helper');
var functionRegistration = {
    health: {ttl: 300, type: "http", url: "/reg/health", status: "healthy"},
    register: {ttl: 300, type: "http",  url: "/reg/", status: "healthy"},
    tenantReg: {ttl: 300, type: "http", url: "",  status: "healthy"},
}

export async function serviceRegister(event) {

    var apiURL = process.env.apiURL;
    var serviceAPI = process.env.serviceURL ;
    var prefix = process.env.PROJECT_NAME + '-' + 'TenantReg' + '-' + process.env.stage + '-';

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
    let Reg = new TenantReg(event);
    try {
        var result =  await Reg.health(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}

export async function register(event) {
    let Reg = new TenantReg(event);

    try {
        var result =  await Reg.register(event);
    }
    catch(err) {
        console.log("TenantReg:register: caught err = ");
        console.log(err);

        return res.error(err);
    }
    return res.success(result);
}



