import mongoose, { Connection, Mongoose } from "mongoose";
import { StudyBotDatabaseConfig } from "src/models/config";

export class DatabaseService {
  private static mongooseInstance: Mongoose;

  public static async connect(dbConfig: StudyBotDatabaseConfig) {
    if (!dbConfig.address) {
      throw new Error("The database address is empty or undefined.");
    }
    if (!name) {
      throw new Error("The database name is empty or undefined.");
    }

    this.mongooseInstance = await mongoose.connect(`mongodb://${dbConfig.address}/${dbConfig.name}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }

  public static getConnection(): Connection {
    return mongoose.connection;
  }
}
