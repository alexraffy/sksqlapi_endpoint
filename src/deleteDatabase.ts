import {RequestContext} from "./RequestContext";
import {readTableAsJSON, SQLStatement, SQLResult, SKSQL} from "sksql";


export function deleteDatabase(cx: RequestContext, dbAccounts: SKSQL, dbQueue: SKSQL) {

    let apiKey = cx.request.body.apiKey;
    let dbHashId = cx.request.body.dbHashId;

    let sql = "EXECUTE usp_deleteDatabase @api_key = @api_key, @dbHashId = @dbHashId;";
    let st = new SQLStatement(dbAccounts, sql, true);
    st.setParameter("@api_key", apiKey);
    st.setParameter("@dbHashId", dbHashId);
    let ret = st.run() as SQLResult;
    let result = readTableAsJSON(dbAccounts, ret.resultTableName);
    st.close();

    let valid = false;

    if (result.length === 1) {
        valid = true;
        let database_id = result[0].database_id;
    }

    let payload = {
        valid: valid,
        dbHashId: dbHashId
    }

    cx.response.send(200, payload);
    return cx.next();


}