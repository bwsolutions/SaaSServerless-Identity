
const uuidV4 = require("uuidv4");

// Configure Environment
const configModule = require('../libs/config-helper.js');
var configuration = configModule.configure(process.env.stage);

var tenantURL   = configuration.url.tenant;
var userURL   = configuration.url.user;

const AWS = require('aws-sdk');

// Configure AWS Region
AWS.config.update({region: configuration.aws_region});

const RequestHelper = require('../libs/request-helper');
const serviceDiscovery = require('../serviceDiscovery/serviceDiscovery-helper');

class TenantReg {

    constructor(event) {
        this.body = JSON.parse(event.body);
    }
    async health(event) {
        console.log("Tenant Registration Health Check");
        return new Promise((resolve, reject) => {
            resolve({service: 'Tenant Registration', isAlive: true});
        });
    }


    async register(event) {
        var tenant = JSON.parse(event.body);
        if (typeof tenant === "string") {
            tenant = JSON.parse(tenant); // stringified twice somewhere create object.
        }

        tenant.companyName = tenant.companyName ? tenant.companyName : tenant.accountName;
        tenant.accountName =  tenant.accountName ? tenant.accountName : tenant.companyName;
        tenant.ownerName =  tenant.ownerName ? tenant.ownerName : tenant.userName;
        tenant.email =  tenant.email ? tenant.email : tenant.userName;
        // Generate the tenant id
        tenant.id = 'TENANT' + uuidV4();
        console.log('Creating Tenant ID: ' + tenant.id);
        tenant.id = tenant.id.split('-').join('');

        return new Promise(function (resolve, reject) {

// if the tenant doesn't exist, create one
                tenantExists(tenant)
                    .then((msg) => {
                        console.log("Error registering new tenant");
                        reject("Error registering new tenant");
                    })
                    .catch((err) => {
                        console.log('no tenant try Creating tenant user, tenant = ' );
                        console.log(tenant);
                        var returnCode = null;

                        registerTenantAdmin(tenant)
                            .then(function (tenData) {
                                //Adding Data to the Tenant Object that will be required to cleaning up all created resources for all tenants.
                                tenant.UserPoolId = tenData.pool.UserPool.Id;
                                tenant.IdentityPoolId = tenData.identityPool.IdentityPoolId;

                                tenant.systemAdminRole = tenData.role.systemAdminRole;
                                tenant.systemSupportRole = tenData.role.systemSupportRole;
                                tenant.trustRole = tenData.role.trustRole;

                                tenant.systemAdminPolicy = tenData.policy.systemAdminPolicy;
                                tenant.systemSupportPolicy = tenData.policy.systemSupportPolicy;

                                return saveTenantData(tenant)
                            })
                            .then(function () {
                                console.log("Tenant registered: " + tenant.id);
                                resolve("Tenant " + tenant.id + " registered");
                                return;
                            })
                            .catch(function (error) {
                                console.log("Error registering new tenant: " + error.message);
                                returnCode = error;
                                removeTenantData(tenant)
                                    .then((result)=> {console.log("Removed data sucess")})
                                    .catch((rmError) => {console.log("Remove Tenata Data error - "+rmError)});

                                reject("Error registering tenant: " + error.message);
                            });


                        return returnCode;

                    });

            });
    }

}
console.log("after class....");

/**
 * Determine if a tenant can be created (they may already exist)
 * @param tenant The tenant data
 * @returns True if the tenant exists
 */
async function tenantExists(tenant) {
    // Create URL for user-manager request
    var userExistsUrl = userURL + '/pool/' + tenant.userName;

    return new Promise((resolve,reject) => {
        // see if the user already exists
        var payLoad = {userName: tenant.userName};

        var functionName = serviceDiscovery.getServiceName(process.env.PROJECT_NAME,'UserMgr','lookupPool',process.env.stage);

        RequestHelper.invokeLambda(functionName,payLoad)
            .then((data) => {
                resolve(data);
            })
            .catch((err) => {
                console.log("invokeLambda returned ERROR err = ");
                console.log(err);
                reject(err);
            })

    });
};
console.log("after tenantExists....");

/**
 * Register a new tenant user and provision policies for that user
 * @param tenant The new tenant data
 * @returns {Promise} Results of tenant provisioning
 */
async function registerTenantAdmin(tenant) {

    var promise = new Promise(function(resolve, reject) {
        // init the request with tenant data
        var tenantAdminData = {
            "tenant_id": tenant.id,
            "companyName": tenant.companyName,
            "accountName": tenant.accountName,
            "ownerName": tenant.ownerName,
            "tier": tenant.tier,
            "email": tenant.email,
            "userName": tenant.userName,
            "role": tenant.role,
            "firstName": tenant.firstName,
            "lastName": tenant.lastName
        };

        var functionName = serviceDiscovery.getServiceName(process.env.PROJECT_NAME,'UserMgr','reg',process.env.stage);

        RequestHelper.invokeLambda(functionName,tenantAdminData)
            .then((data) => {
                resolve(data);
            })
            .catch((err) => {
                console.log("invokeLambda returned ERROR err = ");
                console.log(err);
                reject(err);
            })
    });

    return promise;
}

/**
 * Save the configration and status of the new tenant
 * @param tenant Data for the tenant to be created
 * @returns {Promise} The created tenant
 */
async function saveTenantData(tenant) {

    var promise = new Promise(function(resolve, reject) {
        // init the tenant sace request
        var tenantRequestData = {
            "id": tenant.id,
            "companyName": tenant.companyName,
            "accountName": tenant.accountName,
            "ownerName": tenant.ownerName,
            "tier": tenant.tier,
            "email": tenant.email,
            "status": "Active",
            "UserPoolId": tenant.UserPoolId,
            "IdentityPoolId": tenant.IdentityPoolId,
            "systemAdminRole": tenant.systemAdminRole,
            "systemSupportRole": tenant.systemSupportRole,
            "trustRole": tenant.trustRole,
            "systemAdminPolicy": tenant.systemAdminPolicy,
            "systemSupportPolicy": tenant.systemSupportPolicy,
            "userName": tenant.userName,
        };

        var functionName = serviceDiscovery.getServiceName(process.env.PROJECT_NAME,'TenantMgr','create',process.env.stage);

        RequestHelper.invokeLambda(functionName,tenantRequestData)
            .then((data) => {
                resolve(data);
            })
            .catch((err) => {
                console.log("invokeLambda returned ERROR err = ");
                console.log(err);
                reject(err);
            })

    });

    return promise;
}

module.exports = TenantReg;
