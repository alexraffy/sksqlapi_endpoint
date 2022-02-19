import {kResultType, SKSQL, SQLStatement} from "sksql";


export function updateTokens(dbAccounts: SKSQL, dbQueue: SKSQL, account_id: number, database_id: number) {
    // update the list of tokens for the database
    let sqlTokens = "SELECT database_id, string_agg(token + ' ' + validity, ',') as tokens FROM tbl_tokens where database_id = @database_id and validity > getdate() group by database_id";
    let stTokens = new SQLStatement(dbAccounts, sqlTokens, true);
    stTokens.setParameter("@database_id", database_id);
    let tokens = stTokens.run(kResultType.JSON) as any[];
    let queueTokens = "";
    if (tokens.length > 0) {
        queueTokens = tokens[0].tokens;
    }
    stTokens.close();

    let sqlQ = "INSERT INTO Tbl_Tokens (account_id, database_id, tokens) VALUES (@account_id, @database_id, @tokens);";
    let stQ = new SQLStatement(dbQueue, sqlQ, true);
    stQ.setParameter("@account_id", account_id);
    stQ.setParameter("@database_id", database_id);
    stQ.setParameter("@tokens", queueTokens);
    stQ.run();
    stQ.close();




}