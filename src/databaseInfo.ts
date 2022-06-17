import {RequestContext} from "./RequestContext";
import {readTableAsJSON, SKSQL, SQLResult, SQLStatement} from "sksql";
import {Logger} from "./Logger";
import * as path from "path";
import * as fs from "fs";
import {getFolderSize} from "./getFolderSize";


interface TDatabaseInfoSQL {
    valid: boolean;
    account_id: number;
    database_id: number;
    created?: string;
    optionalName?: string;
    live?: boolean;
    connections?: number;
    tokens?: string;
    workers?: string;
}

interface TDatabaseInfo {
    valid: boolean;
    created?: string;
    optionalName?: string;
    live?: boolean;
    connections?: number;
    size: number;
    tokens?: { token: string; validity: string }[];
    workers?: { address:string, isRelay: boolean, readOnly: boolean, status: string, heartbeat: string, connections: number}[];
    backupsInfo?: {filename: string, date: string, size: number}[];
    logsInfo?: {filename: string, date: string, workerId: string}[];
}

export function databaseInfo(cx: RequestContext,  dbAccounts: SKSQL, dbQueue: SKSQL) {
    let apiKey = cx.request.body.apiKey;
    let dbHashId = cx.request.body.dbHashId;

    let sql = "Exec usp_databaseInfo @apiKey = @apiKey, @dbHashId = @dbHashId;"

    let st = new SQLStatement(dbAccounts, sql, true);
    st.setParameter("@apiKey", apiKey);
    st.setParameter("@dbHashId", dbHashId);
    let result: TDatabaseInfoSQL[] = [];
    let valid = true;
    try {
        let ret = st.run() as SQLResult;
        result = readTableAsJSON(dbAccounts, ret.resultTableName);
        st.close();
    } catch (sqlError) {
        Logger.instance.write(sqlError.message);
        valid = false;
    }

    if (result === undefined || result.length !== 1 || result[0].valid === false) {
        valid = false;
    }

    if (valid === false) {
        cx.response.send(200, {valid: false});
        return cx.next();
    }

    let account_id = result[0].account_id;
    let database_id = result[0].database_id;

    const dbPath = path.normalize("/data/" + account_id + "/" + database_id + "/");

    // get size of db
    const dataPath = path.normalize(dbPath + "db/");
    let dbSize = 0;
    if (fs.existsSync(dataPath)) {
        dbSize = getFolderSize(dataPath);
    }

    // get list of logs
    const logsPath = path.normalize(dbPath + "logs");
    let logsInfo: {filename: string, date: string, workerId: string}[] = [];
    if (fs.existsSync(logsPath)) {
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
                    logsInfo.push({filename: filePath, date: dateiso, workerId: workerId});
                }
            }
        });
    }
    // get list of backups
    const backupsPath = path.normalize(dbPath + "backups");
    let backupsInfo: {filename: string, date: string, size: number}[] = [];
    if (fs.existsSync(backupsPath)) {
        const backupsFiles = fs.readdirSync(backupsPath);
        backupsFiles.forEach(file => {
            let filePath = path.normalize(backupsPath + "/" + file);
            const stat = fs.statSync(filePath);
            if (stat.isFile() && filePath.endsWith(".zip")) {
                let fileName = file.replace(".zip", "");
                // format datetime
                backupsInfo.push({filename: filePath, date: fileName, size: stat.size});
            }
        });
    }

    let workers: { address:string, isRelay: boolean, readOnly: boolean, status: string, heartbeat: string, connections: number}[] = [];
    let tokens: { token: string; validity: string }[] = [];

    if (result[0].tokens !== undefined && result[0].tokens !== "") {
        let array = result[0].tokens.split(",");
        for (let i = 0; i < array.length; i++) {
            const parts = array[i].split(" ");
            if (parts.length === 2) {
                const token = parts[0];
                const validity = parts[1];
                tokens.push({token: token, validity: validity});
            }
        }
    }

    if (result[0].workers !== undefined && result[0].workers !== "") {
        let array = result[0].workers.split(",");
        for (let i = 0; i < array.length; i++) {
            const parts = array[i].split(" ");
            if (parts.length === 6) {
                const address = parts[0];
                const isRelay = parts[1];
                const isReadOnly = parts[2];
                const status = parts[3];
                const heartbeat = parts[4];
                const connections = parts[5];
                workers.push({address: address, isRelay: isRelay.toUpperCase() === "TRUE", readOnly: isReadOnly.toUpperCase() === "TRUE", status: status, heartbeat: heartbeat, connections: parseInt(connections)});
            }
        }
    }


    let payload: TDatabaseInfo = {
        valid: true,
        created: result[0].created,
        optionalName: result[0].optionalName,
        live: result[0].live,
        connections: result[0].connections,
        size: dbSize,
        tokens: tokens,
        workers: workers,
        logsInfo: logsInfo,
        backupsInfo: backupsInfo
    }


    cx.response.send(200, payload);
    return cx.next();

}