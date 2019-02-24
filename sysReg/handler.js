const Admin = require("./admin");
const Response = require("../libs/response-lib");
var res = new Response();

const serviceDiscovery = require('../serviceDiscovery/serviceDiscovery-helper');
var functionRegistration = {
    health: {ttl: 300, type: "http", url: "/sys/health", status: "healthy"},
    create: {ttl: 300, type: "http",  url: "/sys/admin", status: "healthy"},
    del: {ttl: 300, type: "http",  url: "/sys/admin/", status: "healthy"},
    sysReg: {ttl: 300, type: "http", url: "",  status: "healthy"},
}

export async function serviceRegister(event) {

    var apiURL = process.env.apiURL;
    var serviceAPI = process.env.serviceURL ;
    var prefix = process.env.PROJECT_NAME + '-' + 'SysReg' + '-' + process.env.stage + '-';

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
     let adm = new Admin(event);
     try {
         var result =  await adm.create(event);
     }
     catch(err) {
         return res.error(err);
     }
     return res.success(result);
}

 export async function del(event, context) {
     let adm = new Admin(event);

     try {
         var result =  await adm.delete(event);
     }
     catch(err) {
         return res.error(err);
     }
     return res.success(result);
}

export async function health(event, context) {
    let adm = new Admin(event);

    try {
        var result =  await adm.health(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}