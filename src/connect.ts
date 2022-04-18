import {RequestContext} from "./RequestContext";
import {generateV4UUID, SKSQL, SQLStatement, SQLResult, readTableAsJSON} from "sksql";
import {Logger} from "./Logger";
import {queueSpawn} from "./queueSpawn";


export function connect(cx: RequestContext, dbAccounts: SKSQL, dbQueue: SKSQL) {

    Logger.instance.write("INFO STARTOF connect");

    let dbHashId = cx.request.body.dbHashId;
    let token = cx.request.body.token;
    let sql = "Execute usp_connect @dbHashId = @dbHashId, @token = @token";
    let req = new SQLStatement(dbAccounts, sql, true);
    req.setParameter("@dbHashId", dbHashId);
    req.setParameter("@token", token);
    let res = req.run() as SQLResult;
    if (res.error !== undefined) {
        Logger.instance.write("usp_connect ERROR: " + res.error);
        req.close();
        cx.response.send(200, {valid: false});
        return cx.next();
    }
    if (res.resultTableName === "") {
        Logger.instance.write("usp_connect ERROR: no result returned");
        req.close();
        cx.response.send(200, {valid: false});
        return cx.next();
    }
    let result = readTableAsJSON(dbAccounts, res.resultTableName);
    req.close();

    if (result.length === 0) {
        Logger.instance.write("usp_connect ERROR: no result returned");
        cx.response.send(200, {valid: false});
        return cx.next();
    }

    if (result[0].valid === false) {
        cx.response.send(200, {valid: false});
        return cx.next();
    }

    let account_id = result[0].account_id;
    let database_id = result[0].database_id;

    let address = queueSpawn(dbAccounts, dbQueue, account_id, database_id, "");
    if (address === undefined) {
        cx.response.send(200, {valid: false});
    } else {
        cx.response.send(200, {valid: true, address: address});
    }
    return cx.next();

}