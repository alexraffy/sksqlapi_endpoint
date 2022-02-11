import {RequestContext} from "./RequestContext";
import {readTableAsJSON, SQLStatement, SQLResult, SKSQL} from "sksql";


export function listDatabases(cx: RequestContext,  dbAccounts: SKSQL, dbQueue: SKSQL) {
    let apiKey = cx.request.body.apiKey;

    let sql = "EXECUTE usp_listDatabases @api_key = @api_key;"

    let st = new SQLStatement(dbAccounts, sql, true);
    st.setParameter("@api_key", apiKey);

    let ret = st.run() as SQLResult;
    let result = readTableAsJSON(dbAccounts, ret.resultTableName);
    st.close();

    let valid = true;
    let payload = { valid: false, databases: []};
    if (result.length === 1 && result[0].valid === false) {
        payload.valid = false;
    } else {
        payload.valid = true;
        payload.databases = result;
    }

    cx.response.send(200, payload);
    return cx.next();



}