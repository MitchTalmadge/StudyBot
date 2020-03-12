import mongoose, { Connection, Mongoose } from "mongoose";
import { DatabaseConfig } from "src/models/config";

export class DatabaseService {
  private static mongooseInstance: Mongoose;

  public static async connect(dbConfig: DatabaseConfig) {
    this.mongooseInstance = await mongoose.connect(`mongodb://${dbConfig.address}/${dbConfig.name}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }

  public static getConnection(): Connection {
    return mongoose.connection;
  }
}
