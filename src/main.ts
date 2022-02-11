import {closeSocket, setupSocket} from "./socket";
import {Logger} from "./Logger";
import {SKSQL, TAuthSession, TWSRON, WSRON} from "sksql";
import {WebSocket} from 'ws';

function setupAccountConnection (dbAccounts: SKSQL, dbQueue: SKSQL) {
    dbAccounts.connectToServer("ws://127.0.0.1:30000", {
        connectionError(db: SKSQL, databaseHashId: string, error: string): any {
            Logger.instance.write("ERROR: " + error);
        },
        on(db: SKSQL, databaseHashId: string, message: string, payload: any) {
            console.log(message);
            if (message === WSRON) {
                console.log((payload as TWSRON).name + " has connected.");
            }
        },
        connectionLost(db: SKSQL, databaseHashId: string) {

        },
        authRequired(db: SKSQL, databaseHashId: string): TAuthSession {
            return {name: "Server", id: 1, token: "", valid: true} as TAuthSession
        },
        ready(db: SKSQL, databaseHashId: string): any {
            setupQueueConnection(dbAccounts, dbQueue);
        }
    });
}


function setupQueueConnection (dbAccounts: SKSQL, dbQueue: SKSQL) {
    dbQueue.connectToServer("ws://127.0.0.1:30001", {
        connectionError(db: SKSQL, databaseHashId: string, error: string): any {
            Logger.instance.write("ERROR: " + error);
        },
        on(db: SKSQL, databaseHashId: string, message: string, payload: any) {
            console.log(message);
        },
        connectionLost(db: SKSQL, databaseHashId: string) {

        },
        authRequired(db: SKSQL, databaseHashId: string): TAuthSession {
            return {name: "Server", id: 1, token: "", valid: true} as TAuthSession
        },
        ready(db: SKSQL, databaseHashId: string): any {
            setupSocket(30100, dbAccounts, dbQueue);
        }
    });
}

function reconnect(dbAccounts, dbQueue) {
    closeSocket();
    setupAccountConnection(dbAccounts, dbQueue);


}

//@ts-ignore
global["WebSocket"] = WebSocket;

function setup() {
    const logPath = process.env["SKSQLAPI_ENDPOINT_LOGPATH"];

    let log = new Logger(logPath);
    let dbAccounts = new SKSQL();
    let dbQueue = new SKSQL();

    reconnect(dbAccounts, dbQueue);

}


setup();

