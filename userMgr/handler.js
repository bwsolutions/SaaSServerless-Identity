const Response = require("../libs/response-lib");
var res = new Response();
const UserMgr = require("./usermgr");

const serviceDiscovery = require('../serviceDiscovery/serviceDiscovery-helper');
var functionRegistration = {
    health: {ttl: 300, type: "http", url: "/user/health", status: "healthy"},
    get: {ttl: 300, type: "http",  url: "/user/", status: "healthy"},
    getUsers: {ttl: 300, type: "http", url: "/users",  status: "healthy"},
    create: {ttl: 300, type: "http",  url: "/user", status: "healthy"},
    enable: {ttl: 300, type: "http",  url: "/user/enable", status: "healthy"},
    disable: {ttl: 300, type: "http",  url: "/user/disable", status: "healthy"},
    update: {ttl: 300, type: "http", url: "/user",  status: "healthy"},
    del: {ttl: 300, type: "http",  url: "/user/", status: "healthy"},
    userMgr: {ttl: 300, type: "http", url: "",  status: "healthy"},
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

export async function health(event) {
    var userMgr = new UserMgr(event);
    try {
        var result =  await userMgr.health(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}

export async function get(event) {
    var userMgr = new UserMgr(event);
    try {
        var result =  await userMgr.get(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}

export async function getUsers(event) {
    var userMgr = new UserMgr(event);
    try {
        var result =  await userMgr.getUsers(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}

export async function create(event) {
    var userMgr = new UserMgr(event);
    try {
        var result =  await userMgr.create(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}

export async function enable(event) {
    var userMgr = new UserMgr(event);
    try {
        var result =  await userMgr.enable(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}

export async function disable(event) {
    var userMgr = new UserMgr(event);
    try {
        var result =  await userMgr.disable(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}

export async function update(event) {
    var userMgr = new UserMgr(event);
    try {
        var result =  await userMgr.update(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}

export async function del(event) {
    var userMgr = new UserMgr(event);
    try {
        var result =  await userMgr.del(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}


