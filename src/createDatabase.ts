import {RequestContext} from "./RequestContext";
import {readTableAsJSON, SQLStatement, SQLResult} from "sksql";


export function createDatabase(cx: RequestContext) {

    let apiKey = cx.request.body.apiKey;
    let optionalName = cx.request.body.name;
    let encrypted = cx.request.body.encryptionKey;

    let sql = "EXECUTE usp_createDatabase @api_key = @api_key, @optionalName = @optionalName, @encrypted = @encrypted;";
    let st = new SQLStatement(sql, true, "ws://127.0.0.1:30000");
    st.setParameter("@api_key", apiKey);
    st.setParameter("@optionalName", optionalName);
    st.setParameter("@encrypted", encrypted);
    let ret = st.run() as SQLResult;
    let result = readTableAsJSON(ret.resultTableName);
    st.close();

    let payload = {
        valid: result[0].valid,
        dbHashId: result[0].dbHashId,
        database_id: result[0].database_id,
        account_id: result[0].account_id
    }

    cx.response.send(200, {valid: payload.valid, dbHashId: payload.dbHashId});
    return cx.next();

}
