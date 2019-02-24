const Response = require("../libs/response-lib");
var res = new Response();
const ProductMgr = require("./productMgr");

const serviceDiscovery = require('../serviceDiscovery/serviceDiscovery-helper');
var functionRegistration = {
    health: {ttl: 300, type: "http", url: "/product/health", status: "healthy"},
    getProduct: {ttl: 300, type: "http",  url: "/product/", status: "healthy"},
    getProducts: {ttl: 300, type: "http", url: "/products",  status: "healthy"},
    create: {ttl: 300, type: "http", url: "/product", status: "healthy"},
    update: {ttl: 300, type: "http",  url: "/product", status: "healthy"},
    del: {ttl: 300, type: "http", url: "/product/",  status: "healthy"},
    productMgr: {ttl: 300, type: "http", url: "",  status: "healthy"},
}

export async function serviceRegister(event) {

    var apiURL = process.env.apiURL;
    var serviceAPI = process.env.serviceURL ;
    var prefix = process.env.PROJECT_NAME + '-' + 'ProductMgr' + '-' + process.env.stage + '-';

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
    var product = new ProductMgr(event);
    try {
        var result =  await product.health(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}
export async function getProduct(event) {
    var product = new ProductMgr(event);
    try {
        var result =  await product.getProduct(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}

export async function getProducts(event) {
    var product = new ProductMgr(event);
    try {
        var result =  await product.getProducts(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}


export async function create(event) {
    console.log("before product() process.env.stage = " + process.env.stage);
    var product = new ProductMgr(event);
    try {
        var result =  await product.create(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}


export async function update(event) {
    var product = new ProductMgr(event);
    try {
        var result =  await product.update(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}




export async function del(event) {
    var product = new ProductMgr(event);
    try {
        var result =  await product.del(event);
    }
    catch(err) {
        return res.error(err);
    }
    return res.success(result);
}


