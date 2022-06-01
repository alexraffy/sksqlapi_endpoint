import {RequestContext} from "./RequestContext";
import {readTableAsJSON, SKSQL, SQLResult, SQLStatement} from "sksql";
import {Logger} from "./Logger";
import * as path from "path";
import * as fs from "fs";

interface TDatabaseInfo {
    valid: boolean;
    backupsInfo?: {filename: string, date: string, size: number}[],
    logsInfo?: {filename: string, date: string, workerId: string}[]
}

export function databaseInfo(cx: RequestContext,  dbAccounts: SKSQL, dbQueue: SKSQL) {
    let apiKey = cx.request.body.apiKey;
    let dbHashId = cx.request.body.dbHashId;

    let sql = "Exec usp_databaseInfo @apiKey = @apiKey, @dbHashId = @dbHashId;"

    let st = new SQLStatement(dbAccounts, sql, true);
    st.setParameter("@apiKey", apiKey);
    st.setParameter("@dbHashId", dbHashId);
    let result = [];
    let valid = true;
    try {
        let ret = st.run() as SQLResult;
        result = readTableAsJSON(dbAccounts, ret.resultTableName);
        st.close();
    } catch (sqlError) {
        Logger.instance.write(sqlError.message);
        valid = false;
    }
    let payload: TDatabaseInfo = { valid: false};
    if (result === undefined || result.length !== 1) {
        valid = false;
    } else {
        payload = result[0];
    }

    if (valid === false || payload.valid === false) {
        cx.response.send(200, {valid: false});
        return cx.next();
    }

    let account_id = result[0].account_id;
    let database_id = result[0].database_id;

    // get list of logs
    const dbPath = path.normalize("/data/" + account_id + "/" + database_id + "/");
    const logsPath = path.normalize(dbPath + "logs");
    const backupsPath = path.normalize(dbPath + "backups");

    let logsInfo: {filename: string, date: string, workerId: string}[] = [];
    const logsFiles = fs.readdirSync(logsPath);
    logsFiles.forEach(file => {
        let filePath = path.normalize(logsPath + "/" + file);
        const stat = fs.statSync(filePath);
        if (stat.isFile() && filePath.endsWith(".log")) {
            let fileName = file.replace(".log", "");
            // format datetime_workerid
            if (fileName.indexOf("_") > -1) {
                let fileNameParts = fileName.split("_");
                let dateiso = fileNameParts[0];
                let workerId = fileNameParts[1];
                logsInfo.push({filename: filePath, date: dateiso, workerId: workerId });
            }
        }
    });

    let backupsInfo: {filename: string, date: string, size: number}[] = [];
    const backupsFiles = fs.readdirSync(backupsPath);
    backupsFiles.forEach(file => {
        let filePath = path.normalize(backupsPath + "/" + file);
        const stat = fs.statSync(filePath);
        if (stat.isFile() && filePath.endsWith(".zip")) {
            let fileName = file.replace(".zip", "");
            // format datetime
            backupsInfo.push({filename: filePath, date: fileName, size: stat.size });
        }
    });
    payload.logsInfo = logsInfo;
    payload.backupsInfo = backupsInfo;

    cx.response.send(200, payload);
    return cx.next();

}