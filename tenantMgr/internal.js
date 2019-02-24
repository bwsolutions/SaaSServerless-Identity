
const configModule = require('../libs/config-helper.js');
var configuration = configModule.configure(process.env.stage);

// Declare shared modules
const DynamoDBHelper = require('../libs/dynamodb-helper.js');
const tokenManager = require('../libs/token-manager.js');

const tmCommon = require('./tenantMgrCommon');

var functionRegistration = {
    create: {serviceName: "TenantMgr-create", serviceVersion: 1.0, ttl: 300, endpoint_url: "url", status: "healthy"},
}

class TenantMgrInternals {
    constructor(event) {
    }

    create(event) {
        var credentials = {};
        return new Promise(function (resolve, reject) {

            console.log('Creating Tenant.....');

            tokenManager.getSystemCredentials(function (err, systemCredentials) {
                credentials = systemCredentials;

                var tenant = event;

                console.log('Creating Tenant: ' + tenant.id);

                // construct the helper object
                var dynamoHelper = new DynamoDBHelper(tmCommon.tenantSchema, credentials, configuration);

                dynamoHelper.putItem(tenant, credentials, function (err, result) {
                    if (err) {
                        console.log('Error creating new tenant: ' + err.message);
                        reject('{"Error" : "Error creating tenant"}');
                    }
                    else {
                        console.log('Tenant ' + tenant.id + ' created');
                        resolve({status: 'success'});
                    }
                });
            })
        });
    }

}


module.exports = TenantMgrInternals;
