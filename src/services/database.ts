import mongoose, { Connection, Mongoose } from "mongoose";
import { StudyBotDatabaseConfig } from "src/models/config";

export class DatabaseService {
  private static mongooseInstance: Mongoose;

  public static async connect(dbConfig: StudyBotDatabaseConfig) {
    this.mongooseInstance = await mongoose.connect(`mongodb://${dbConfig.address}/${dbConfig.name}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }

  public static getConnection(): Connection {
    return mongoose.connection;
  }
}
