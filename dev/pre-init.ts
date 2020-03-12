import * as path from "path";
import { MongoMemoryServer } from "mongodb-memory-server";

const mkdirp = require("mkdirp");

async function createInMemoryDatabase() {
  mkdirp(path.resolve(__dirname, "../temp/db/"), (err: Error | undefined) => {
    if (err) {
      console.error("Could not create temp directory for database.");
      throw err;
    }
  });

  // Set up a MongoDB server for development use.
  const mongod = new MongoMemoryServer({
    instance: {
      dbPath: path.resolve(__dirname, "../temp/db/"),
    },
  });
  const uri = await mongod.getConnectionString();
  const dbPath = await mongod.getDbPath();
  const prefix = "mongodb://";
  process.env.DB_ADDRESS = uri.substring(prefix.length, uri.indexOf("/", prefix.length));
  process.env.DB_NAME = uri.substring(uri.indexOf("/", prefix.length) + 1);

  console.log(`In-Memory MongoDB Running on ${uri} at ${dbPath}`);
}

export default async function preInit() {
  await createInMemoryDatabase();
}
