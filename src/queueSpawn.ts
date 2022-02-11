import {generateV4UUID, readTableAsJSON, SKSQL, SQLResult, SQLStatement} from "sksql";
import {Logger} from "./Logger";


export function queueSpawn(dbAccounts: SKSQL,
                           dbQueue: SKSQL,
                           account_id: number,
                           database_id: number,
                           encryptionKey: string) {

    let sqlWorker = "Execute usp_spawnWorker @account_id = @account_id, @database_id = @database_id;";
    let stWorker = new SQLStatement(dbAccounts, sqlWorker, true);
    stWorker.setParameter("@account_id", account_id);
    stWorker.setParameter("@database_id", database_id);
    let retWorker = stWorker.run() as SQLResult;
    if (retWorker.error !== undefined) {
        Logger.instance.write("ERROR usp_spawnWorker : ", retWorker.error);
        return;
    }
    let workerData = readTableAsJSON(dbAccounts, retWorker.resultTableName);
    stWorker.close();
    if (workerData.length !== 1 || workerData[0].valid === false) {
        Logger.instance.write("ERROR usp_spawnWorker : ", JSON.stringify(workerData));
        return;
    }
    let worker_id = workerData[0].worker_id;
    let public_address = workerData[0].public_address;
    let port = workerData[0].port;

    let sqlQueue = "EXECUTE usp_enqueue @requestGuid = @requestGuid, @account_id = @account_id, @database_id = @database_id, @port = @port, @encryptionKey = @encryptionKey;";
    let stQueue = new SQLStatement(dbQueue, sqlQueue, true);
    stQueue.setParameter("@requestGuid", generateV4UUID());
    stQueue.setParameter("@account_id", account_id);
    stQueue.setParameter("@database_id", database_id);
    stQueue.setParameter("@port", port);
    stQueue.setParameter("@encryptionKey", encryptionKey);
    let ret = stQueue.run();



}