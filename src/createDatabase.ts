import {RequestContext} from "./RequestContext";
import {readTableAsJSON, SQLStatement, SQLResult, generateV4UUID, SKSQL} from "sksql";
import {queueSpawn} from "./queueSpawn";


export function createDatabase(cx: RequestContext, dbAccounts: SKSQL, dbQueue: SKSQL) {

    let apiKey = cx.request.body.apiKey;
    let optionalName = cx.request.body.name;
    let encrypted = false;
    let encryptionKey = cx.request.body.encryptionKey;
    if (encryptionKey !== undefined && encryptionKey !== "") {
        encrypted = true;
    }

    let sql = "EXECUTE usp_createDatabase @api_key = @api_key, @optionalName = @optionalName, @encrypted = @encrypted;";
    let st = new SQLStatement(dbAccounts, sql, true);
    st.setParameter("@api_key", apiKey);
    st.setParameter("@optionalName", optionalName);
    st.setParameter("@encrypted", encrypted);
    let ret = st.run() as SQLResult;
    let result = readTableAsJSON(dbAccounts, ret.resultTableName);
    st.close();

    let payload = {
        valid: result[0].valid,
        dbHashId: result[0].dbHashId,
        database_id: result[0].database_id,
        account_id: result[0].account_id
    }
    queueSpawn(dbAccounts, dbQueue, payload.account_id, payload.database_id, encryptionKey);


    cx.response.send(200, {valid: payload.valid, dbHashId: payload.dbHashId});
    return cx.next();

}
