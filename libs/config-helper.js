const fs = require('fs');
const path = require('path');

const CONFIG_DIR =  process.env["NODE_CONFIG_DIR"] ? process.env["NODE_CONFIG_DIR"] : "../config/";
var filename = CONFIG_DIR + 'default.json';

//var configPath = path.resolve(__dirname,filename);
//console.log("configPath = " + configPath);

var configInput = fs.readFileSync(filename, 'utf-8');

const { Config } = JSON.parse(configInput);

var dev = Config.dev;
var prod = Config.prod;
var local = Config.local;
var localdev = Config.localdev;

/**
 * Set Configuration of Application, and Environment
 * @param environment
 * @returns The configuration
 */
module.exports.configure = function(environment) {
    var config = {};
    if(environment == null || environment == undefined || environment == 'undefined'){
        environment = process.env.NODE_ENV;
        if(process.env.NODE_ENV == undefined){
            environment = "local";
        }
    }

    console.log("AWS_REGION = ", process.env.AWS_REGION);
    console.log("serviceURL = ", process.env.serviceURL);
    console.log("SNS_ROLE_ARN = ", process.env.SNS_ROLE_ARN);
    console.log("USER_TABLE = ", process.env.USER_TABLE);
    console.log("TENANT_TABLE = ", process.env.TENANT_TABLE);
    console.log("PRODUCT_TABLE = ", process.env.PRODUCT_TABLE);
    console.log("ORDER_TABLE = ", process.env.ORDER_TABLE);

    switch(environment) {
        case "prod":

            if(process.env.AWS_REGION == undefined || process.env.serviceURL == undefined || process.env.SNS_ROLE_ARN == undefined ||  process.env.USER_TABLE == undefined || process.env.TENANT_TABLE == undefined || process.env.PRODUCT_TABLE == undefined || process.env.ORDER_TABLE == undefined)
            {
                var error = "Production Environment Variables Not Properly Configured. \nPlease ensure AWS_REGION, SERVCE_URL, SNS_ROLE_ARN environment Variables are set."
                throw error;
                break;
            }
            else {

                var port = prod.port;
                var name = prod.name;
                //var table = prod.table;
                config = {
                    environment: environment,
                    projectName: process.env.PROJECT_NAME ? process.env.PROJECT_NAME : prod.projectName,
                    //web_client: process.env.WEB_CLIENT,
                    aws_region: process.env.AWS_REGION,
                    cognito_region: process.env.AWS_REGION,
                    domain: process.env.SERVICE_URL,
                    name: name,
                    table: {
                        serviceDiscovery: process.env.SERVICEDISCOVERY_TABLE,
                        user: process.env.USER_TABLE,
                        tenant: process.env.TENANT_TABLE,
                        product: process.env.PRODUCT_TABLE,
                        order: process.env.ORDER_TABLE
                    },
                    userRole: prod.userRole,
                    role: {
                        sns: process.env.SNS_ROLE_ARN
                    },
                    tier: prod.tier,
                    port: port,
                    loglevel: prod.log.level,
                    url: {
                        tenant: prod.protocol + process.env.SERVICE_URL + '/tenant',
                        user: prod.protocol + process.env.SERVICE_URL + '/user',
                        product: prod.protocol + process.env.SERVICE_URL + '/product',
                        reg: prod.protocol + process.env.SERVICE_URL + '/reg',
                        admins: prod.protocol + process.env.SERVICE_URL + '/auth',
                        order: prod.protocol + process.env.SERVICE_URL + '/order',
                        sys: prod.protocol + process.env.SERVICE_URL + '/sys'
                    }
                }
                return config;
                break;
            }
        case "dev":

                console.log("AWS_REGION = ", process.env.AWS_REGION);
                console.log("serviceURL = ", process.env.serviceURL);
                console.log("SNS_ROLE_ARN = ", process.env.SNS_ROLE_ARN);
                console.log("USER_TABLE = ", process.env.USER_TABLE);
                console.log("TENANT_TABLE = ", process.env.TENANT_TABLE);
                console.log("PRODUCT_TABLE = ", process.env.PRODUCT_TABLE);
                console.log("ORDER_TABLE = ", process.env.ORDER_TABLE);

                var port = dev.port;
                var name = dev.name;
                var table = dev.table;

                config = {
                    environment:    environment,
                    projectName:    process.env.PROJECT_NAME ? process.env.PROJECT_NAME : dev.projectName,
                    aws_region:     process.env.AWS_REGION,
                    cognito_region: process.env.AWS_REGION,
                    domain:         dev.domain,
                    name:           name,
                    table:          {
                        serviceDiscovery: process.env.SERVICEDISCOVERY_TABLE,
                        user:             process.env.USER_TABLE,
                        tenant:           process.env.TENANT_TABLE,
                        product:          process.env.PRODUCT_TABLE,
                        order:            process.env.ORDER_TABLE
                    },
                    userRole:       dev.userRole,
                    role:           {
                        sns: process.env.SNS_ROLE_ARN
                    },
                    tier:           dev.tier,
                    port:           port,
                    loglevel:       dev.log.level,
                    url:            {
                        tenant:  process.env.apiURL + '/tenant',
                        user:    process.env.apiURL + '/user',
                        product: process.env.apiURL + '/product',
                        reg:     process.env.apiURL + '/reg',
                        auth:    process.env.apiURL + '/auth',
                        admins:  process.env.apiURL + '/sys',
                        order:   process.env.apiURL + '/order'
                    }
                }
            return config;
            break;

        case "local":
        case "localdev":
            if (environment === "localdev") {
                local = localdev;
            }
            var port = local.port;
            var name = local.name;
            var table = local.table;


            config = {
                environment: environment,
                projectName: process.env.PROJECT_NAME ? process.env.PROJECT_NAME : local.projectName,
                aws_region: process.env.AWS_REGION,
                cognito_region: process.env.AWS_REGION,
                domain: local.domain,
                name: name,
                table: table,
                userRole: local.userRole,
                role: {
                    sns: 'arn:aws:iam::623665549995:role/SNSRole'
                },
                tier: local.tier,
                port: port,
                loglevel: local.log.level,
                url: {
                    tenant: local.protocol + local.domain + ':' + port.tenant + '/tenant',
                    user: local.protocol + local.domain + ':' + port.user +  '/user',
                    product: local.protocol + local.domain + ':' + port.product + '/product',
                    reg: local.protocol + local.domain + ':' + port.reg + '/reg',
                    auth: local.protocol + local.domain + ':' + port.auth + '/auth',
                    admins: local.protocol + local.domain + ':' + port.admins + '/sys',
                    order: local.protocol + local.domain + ':' + port.order + '/order'
                }
            }

            return config;
            break;

        default:
            var error = 'No Environment Configured. \n Option 1: Please configure Environment Variable. \n Option 2: Manually override environment in config function.';
            throw error;
    }

}