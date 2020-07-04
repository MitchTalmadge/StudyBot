import { DatabaseConfig } from "models/config";
import mongoose, { Connection, Mongoose } from "mongoose";

export class DatabaseService {
  private static mongooseInstance: Mongoose;

  public static async connect(dbConfig: DatabaseConfig) {
    const auth: {user: string, password: string} | undefined = !dbConfig.auth ? undefined : {
      user: dbConfig.username,
      password: dbConfig.password
    }; 

    this.mongooseInstance = await mongoose.connect(`mongodb://${dbConfig.address}/${dbConfig.name}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      auth
    });
  }

  public static getConnection(): Connection {
    return mongoose.connection;
  }
}
