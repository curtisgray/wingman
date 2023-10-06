// import * as orm from "./orm.Sqlite";
import { default as ormSqlite } from "./orm.Sqlite.object";

// //orm.initializeOrm().then(async () => { }).catch((err) => { console.error(err); });

// ormSqlite().initializeOrm().then(async () => { }).catch((err: Error|string) => { console.error(err); });

export default ormSqlite;