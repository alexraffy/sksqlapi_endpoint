
import * as path from "path";
import * as fs from "fs";


export function getFolderSize(f: string): number {
    let size = 0;
    const dataFiles = fs.readdirSync(f);
    dataFiles.forEach(file => {
        let filePath = path.normalize(f + "/" + file);
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
            size += stat.size;
        } else if (stat.isDirectory()) {
            size += getFolderSize(filePath);
        }
    });
    return size;
}