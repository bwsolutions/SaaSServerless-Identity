const a = 1;

class Response {


    constructor (internal=null) {
        if (internal) {
            this.internalResponse = internal;
        } else {
            this.internalResponse = false;  // assume external HTTP and send headers
        }
    }
    parseMsg(input) {
        var code = -1;
        var msg = null;
        if (typeof input === 'Object') {
            // if statusCode provided use that for resposne
            if (input.statusCode !== undefined || input.statusCode !== null) {
                code = input.statusCode;
            }
            // if msg fiels is provided then use this for msg of response
            if (input.msg !== undefined) {
                msg = input.msg;
            }
        }
        // if no msg field then use the entire object as the msg body.
        if (msg === null) {
            msg = input;
        }
        return { statusCode: code, msg };
    }
    success(msg) {
        var {statusCode, msg } = this.parseMsg(msg);
        statusCode = statusCode > 0 ? statusCode : 200;
        return this.buildResponse(statusCode, true, msg);
    }

    failure(msg) {
        var {statusCode, msg } = this.parseMsg(msg);
        statusCode = statusCode > 0 ? statusCode : 500;
        return this.buildResponse(statusCode, false, msg);
    }
    error(msg) {
        var {statusCode, msg } = this.parseMsg(msg);
        statusCode = statusCode > 0 ? statusCode : 400;
        return this.buildResponse(statusCode, false, msg);
    }
    buildResponse(statusCode, status, msg) {
        var body = { "status": status };

        if (typeof msg === 'string') {
            body = Object.assign(body, {"msg": msg});
        } else {
            body = Object.assign(body, msg);
        }

        var resp = {
            statusCode: statusCode,
        }
        if (this.internalResponse === true) {
            resp = {...resp, ...body};
        } else {
            resp = {...resp,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Credentials": true
                },
                body: JSON.stringify(body)
            };
        }
        console.log("sending response = ");
        console.log(resp);
        return resp;
    }
}
module.exports = Response;


