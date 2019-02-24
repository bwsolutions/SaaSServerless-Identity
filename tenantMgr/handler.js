const Response = require("../libs/response-lib");
var res = new Response();
const TenantMgr = require("./tenantMgr");
const serviceDiscovery = require('../serviceDiscovery/serviceDiscovery-helper');
var functionRegistration = {
    health: {ttl: 300, type: "http", url: "/tenant/health", status: "healthy"},
    getTenant: {ttl: 300, type: "http",  url: "/tenant/", status: "healthy"},
    getTenants: {ttl: 300, type: "http", url: "/tenants",  status: "healthy"},
    getTenantsSystem: {ttl: 300, type: "http",  url: "/tenants/system", status: "healthy"},
    update: {ttl: 300, type: "http",  url: "/tenant", status: "healthy"},
    del: {ttl: 300, type: "http",  url: "/tenant/", status: "healthy"},
    tenantMgr: {ttl: 300, type: "http", url: "",  status: "healthy"},
}

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


export async function health(event) {
    let tenant = new TenantMgr(event);
    try {
        var result =  await tenant.health(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}
export async function getTenant(event) {
    let tenant = new TenantMgr(event);
    try {
        var result =  await tenant.getTenant(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}

export async function getTenants(event) {
    let tenant = new TenantMgr(event);
    try {
        var result =  await tenant.getTenants(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}

export async function getTenantsSystem(event) {
    let tenant = new TenantMgr(event);
    try {
        var result =  await tenant.getTenantsSystem(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}

export async function update(event) {
    let tenant = new TenantMgr(event);
    try {
        var result =  await tenant.update(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}

export async function del(event) {
    let tenant = new TenantMgr(event);
    try {
        var result =  await tenant.del(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}
export async function removeTenant(event) {
    let tenant = new TenantMgr(event);
    try {
        var result =  await tenant.removeTenant(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}


