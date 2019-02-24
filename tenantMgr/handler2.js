const Response = require("../libs/response-lib");
var res = new Response(true);
const TenantMgrInternals = require("./internal");
const serviceDiscovery = require('../serviceDiscovery/serviceDiscovery-helper');
var functionRegistration = {
    create: {ttl: 300, type: "internal", status: "healthy"},
};

export async function serviceRegister(event) {

    var apiURL = process.env.apiURL;
    var serviceAPI = process.env.serviceURL ;
    var prefix = process.env.PROJECT_NAME + '-' + 'TenantMgr' + '-' + process.env.stage + '-';

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


export async function create(event) {
    console.log("before TenantMgr() process.env.stage = " + process.env.stage);
    let tenant = new TenantMgrInternals(event);
    try {
        var result =  await tenant.create(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}



