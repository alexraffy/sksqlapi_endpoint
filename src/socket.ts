import {Server, createServer, plugins, Next, Response, Request} from "restify";
import * as http from "http";
import {RequestContext} from "./RequestContext";
import {ping} from "./ping";
import {Logger} from "./Logger";
import {createDatabase} from "./createDatabase";
import {createConnectionToken} from "./createConnectionToken";
import {listDatabases} from "./listDatabases";
import {deleteDatabase} from "./deleteDatabase";
import {revokeConnectionToken} from "./revokeConnectionToken";
import {SKSQL} from "sksql";
import {connect} from "./connect";
import {databaseInfo} from "./databaseInfo";
var logger = require('morgan');

var server: Server;

export function closeSocket() {
    if (server !== undefined) {
        server.close();
        server = undefined;
    }
}

export function setupSocket(port: number, dbAccounts: SKSQL, dbQueue: SKSQL) {

    var server: Server = createServer({name: 'sksqlapi_endpoint'});
    server.use(logger(function (tokens, req, res) {
        return [
            new Date().toISOString(),
            tokens.method(req, res),
            tokens.url(req, res),
            tokens.status(req, res),
            tokens.res(req, res, 'content-length'), '-',
            tokens['response-time'](req, res), 'ms'
        ].join(' ')
    }, {stream: Logger.instance.stream}));
    server.use(plugins.queryParser());
    server.use(plugins.bodyParser({mapParams: true, mapFiles: true, keepExtensions: true}));

    server.use(
        function crossOrigin(req, res, next) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "X-Requested-With");
            res.header('Access-Control-Allow-Headers', 'Origin, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Response-Time, X-PINGOTHER, X-CSRF-Token,Authorization');
            res.header('Access-Control-Allow-Methods', '*');
            //res.setHeader('Access-Control-Expose-Headers', 'X-Api-Version, X-Request-Id, X-Response-Time');
            res.header('Access-Control-Max-Age', '1000');
            return next();
        }
    );

    server.get({path: '/api/v1/ping', version: '0.0.1'}, function (req, res, next) {
        let cx: RequestContext = {request: req, response: res, next: next};
        ping(cx);
    });

    server.post({path: '/api/v1/createDatabase', version: '0.0.1'}, function (req, res, next) {
        let cx: RequestContext = {request: req, response: res, next: next};
        return createDatabase(cx, dbAccounts, dbQueue);
    });
    server.post({path: '/api/v1/deleteDatabase', version: '0.0.1'}, function (req, res, next) {
        let cx: RequestContext = {request: req, response: res, next: next};
        return deleteDatabase(cx, dbAccounts, dbQueue);
    });
    server.post({path: '/api/v1/listDatabases', version: '0.0.1'}, function (req, res, next) {
        let cx: RequestContext = {request: req, response: res, next: next};
        return listDatabases(cx, dbAccounts, dbQueue);
    });
    server.post({path: '/api/v1/databaseInfo', version: '0.0.1'}, function (req, res, next) {
        let cx: RequestContext = {request: req, response: res, next: next};
        return databaseInfo(cx, dbAccounts, dbQueue);
    })
    server.post({path: '/api/v1/createConnectionToken', version: '0.0.1'}, function (req, res, next) {
        let cx: RequestContext = {request: req, response: res, next: next};
        return createConnectionToken(cx, dbAccounts, dbQueue);
    });
    server.post({path: '/api/v1/revokeConnectionToken', version: '0.0.1'}, function (req, res, next) {
        let cx: RequestContext = {request: req, response: res, next: next};
        return revokeConnectionToken(cx, dbAccounts, dbQueue);
    });
    server.post({path: '/api/v1/connect', version: '0.0.1'}, function (req, res, next) {
        let cx: RequestContext = {request: req, response: res, next: next};
        return connect(cx, dbAccounts, dbQueue);
    });

    server.on('uncaughtException', function (request, response, route, error) {
        Logger.instance.write('Uncaught Exception:');
        console.dir(error);
        Logger.instance.write('Request Params:');
        console.dir(request.params);
        Logger.instance.write('Request Body:');
        Logger.instance.write(request.body);
        Logger.instance.write('Stack:');
        Logger.instance.write(error.stack);
        var ret = {
            valid: false,
            error: "InternalError",
            errorDescription: error.message,
            request: route
        };
        response.send(ret, 200);
    });

    server.listen(port);
    Logger.instance.write("Listening on port " + port);

}