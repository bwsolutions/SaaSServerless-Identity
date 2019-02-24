const Response = require("../libs/response-lib");
var res = new Response();
const OrderMgr = require("./orderMgr");

const serviceDiscovery = require('../serviceDiscovery/serviceDiscovery-helper');
var functionRegistration = {
    health: {ttl: 300, type: "http", url: "/order/health", status: "healthy"},
    getOrder: {ttl: 300, type: "http",  url: "/order/", status: "healthy"},
    getOrders: {ttl: 300, type: "http", url: "/orders",  status: "healthy"},
    create: {ttl: 300, type: "http", url: "/order", status: "healthy"},
    update: {ttl: 300, type: "http",  url: "/order", status: "healthy"},
    del: {ttl: 300, type: "http", url: "/order/",  status: "healthy"},
    orderMgr: {ttl: 300, type: "http", url: "",  status: "healthy"},
}

export async function serviceRegister(event) {

    var apiURL = process.env.apiURL;
    var serviceAPI = process.env.serviceURL ;
    var prefix = process.env.PROJECT_NAME + '-' + 'OrderMgr' + '-' + process.env.stage + '-';

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
    var order = new OrderMgr(event);
    try {
        var result =  await order.health(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}
export async function getOrder(event) {
    var order = new OrderMgr(event);
    try {
        var result =  await order.getOrder(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}

export async function getOrders(event) {
    var order = new OrderMgr(event);
    try {
        var result =  await order.getOrders(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}


export async function create(event) {
    var order = new OrderMgr(event);
    try {
        var result =  await order.create(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}


export async function update(event) {
    var order = new OrderMgr(event);
    try {
        var result =  await order.update(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}


export async function del(event) {
    var order = new OrderMgr(event);
    try {
        var result =  await order.del(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}


