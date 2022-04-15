import {RequestContext} from "./RequestContext";
import {generateV4UUID, kResultType, readTableAsJSON, SKSQL, SQLResult, SQLStatement} from "sksql";
import {updateTokens} from "./updateTokens";
import {Logger} from "./Logger";


export function createConnectionToken(cx: RequestContext, dbAccounts: SKSQL, dbQueue: SKSQL) {
    Logger.instance.write("INFO STARTOF createConnectionToken");
    let apiKey = cx.request.body.apiKey;
    let dbHashId = cx.request.body.dbHashId;
    let encryptionKey = cx.request.body.encryptionKey;
    let validityInMinutes = cx.request.body.validityInMinutes;
    let rights = cx.request.body.rights;
    let optionalName = cx.request.body.name;
    let token = generateV4UUID();

    let sql = "EXECUTE usp_createConnectionToken " +
        "@api_key = @api_key, @dbHashId = @dbHashId, " +
        "@encryption_key = @encryption_key, @validityInMinutes = @validityInMinutes, " +
        "@optionalName = @optionalName, @token = @token;";
    let st = new SQLStatement(dbAccounts, sql, true);
    st.setParameter("@api_key", apiKey);
    st.setParameter("@dbHashId", dbHashId);
    st.setParameter("@encryption_key", encryptionKey);
    st.setParameter("@validityInMinutes", validityInMinutes);
    st.setParameter("@optionalName", optionalName);
    st.setParameter("@token", token);
    let ret;
    let result;
    try {
        ret = st.run() as SQLResult;
        if (ret.error !== undefined) {
            Logger.instance.write("INFO SQLERROR " + ret.error);
            cx.response.send(200, {valid: false});
            return cx.next();
        }
        result = readTableAsJSON(dbAccounts, ret.resultTableName);
    } catch (e) {
        Logger.instance.write("INFO EXCEPTION createConnectionToken");
        Logger.instance.write("INFO MSG " + e.message);
        cx.response.send(200, {valid: false});
        return cx.next();
    }
    st.close();

    if (result.length === 0 || result[0].valid !== true) {
        Logger.instance.write("INFO REJECTED createConnectionToken");
        cx.response.send(200, {valid: false});
        return cx.next();
    }
    Logger.instance.write("INFO OK createConnectionToken");

    let utret = updateTokens(dbAccounts, dbQueue, result[0].account_id, result[0].database_id);
    if (utret === false) {
        Logger.instance.write("INFO REJECTED createConnectionToken");
        cx.response.send(200, {valid: false});
        return cx.next();
    }



    // SELECT true as valid, @database_id as database_id, @token as token, @validity as validity FROM dual;
    let payload = {
        valid: result[0].valid,
        database_id: result[0].database_id,
        token: result[0].token,
        validity: result[0].validity
    }
    Logger.instance.write("INFO OK createConnectionToken " + payload.token);
    cx.response.send(200, {valid: payload.valid, token: payload.token, validity: payload.validity});
    return cx.next();


}