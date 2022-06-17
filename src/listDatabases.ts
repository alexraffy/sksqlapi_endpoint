import {RequestContext} from "./RequestContext";
import {kResultType, readTableAsJSON, SKSQL, SQLResult, SQLStatement} from "sksql";


export function listDatabases(cx: RequestContext,  dbAccounts: SKSQL, dbQueue: SKSQL) {
    let apiKey = cx.request.body.apiKey;
    let top = cx.request.body.top;
    let offset = cx.request.body.offset;
    let fetch = cx.request.body.fetch;

    // num of databases
    let sqlNum = "EXECUTE usp_sumDatabases @api_key = @api_key;";
    let stSum = new SQLStatement(dbAccounts, sqlNum, false);
    stSum.setParameter("@api_key", apiKey);
    let retSum = stSum.run(kResultType.JSON) as any[];
    stSum.close();

    let sql = "EXECUTE usp_listDatabases @api_key = @api_key, @offset = @offset, @fetch = @fetch;";
    let st = new SQLStatement(dbAccounts, sql, false);
    st.setParameter("@api_key", apiKey);
    st.setParameter("@offset", offset);
    st.setParameter("@fetch", fetch);
    let ret = st.run() as SQLResult;
    let result = readTableAsJSON(dbAccounts, ret.resultTableName);
    st.close();

    let valid = true;
    let payload = { valid: false, numDatabases: 0, databases: []};
    if (result.length === 1 && result[0].valid === false) {
        payload.valid = false;
    } else {
        payload.valid = true;
        payload.numDatabases = retSum[0].total;
        payload.databases = result;
    }

    cx.response.send(200, payload);
    return cx.next();



}