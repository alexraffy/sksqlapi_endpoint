import {WriteStream} from "fs";
import * as path from "path";
import * as fs from "fs";

export class Logger {
    private static _instance: Logger;
    private stream: WriteStream;

    static get instance(): Logger {
        if (Logger._instance === undefined) {
            throw new Error("Logger must be instantiated with a log path before calling Logger.instance");
        }
        return Logger._instance;
    }
    constructor(logFolder: string) {
        Logger._instance = this;
        const logPath = path.normalize(logFolder + "/sksqlapi_endpoint.log");

        this.stream = fs.createWriteStream(logPath, {encoding: "utf-8"});

    }

    write(...theArgs: string[]) {
        let message = theArgs.reduce((previous, current) => {
            return previous + current;
        })
        this.stream.write(message + "\r\n");
    }

    close() {
        this.stream.close();
    }

}