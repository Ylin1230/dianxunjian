let mysqlPool = null;

function getMysqlPool(config) {
  const db = getDbConfig(config);
  if (db.client !== "mysql") {
    throw new Error(`暂不支持数据库类型：${db.client || "未配置"}`);
  }
  if (!db.host || !db.database || !db.user) {
    throw new Error("MySQL 连接信息不完整，请检查 DB_HOST/DB_NAME/DB_USER");
  }
  if (!mysqlPool) {
    let mysql;
    try {
      mysql = require("mysql2/promise");
    } catch (error) {
      throw new Error("缺少 mysql2 依赖，请在 backend 目录执行 npm install");
    }
    mysqlPool = mysql.createPool({
      host: db.host,
      port: db.port,
      database: db.database,
      user: db.user,
      password: db.password,
      waitForConnections: true,
      connectionLimit: db.poolMax,
      queueLimit: 0,
      charset: "utf8mb4",
      timezone: "+08:00",
      dateStrings: true,
    });
  }
  return mysqlPool;
}

async function execute(config, sql, params = []) {
  const pool = getMysqlPool(config);
  const [result] = await pool.execute(sql, params);
  return result;
}

function getDbConfig(config = {}) {
  const source = config.taskDb || {};
  return {
    client: String(source.client || "mysql").trim().toLowerCase(),
    host: String(source.host || "").trim(),
    port: Number(source.port || 3306),
    database: String(source.database || "").trim(),
    user: String(source.user || "").trim(),
    password: String(source.password || ""),
    poolMax: Math.max(1, Number(source.poolMax || 10)),
  };
}

module.exports = {
  execute,
  getMysqlPool,
};
