import mongoose, { Connection, Mongoose } from 'mongoose';

export class DatabaseService {
  private static mongooseInstance: Mongoose;

  public static async connect(address: string, name: string) {
    if (!address) {
      throw new Error('The database address is empty or undefined.');
    }
    if (!name) {
      throw new Error('The database name is empty or undefined.');
    }

    this.mongooseInstance = await mongoose.connect(`mongodb://${address}/${name}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }

  public static getConnection(): Connection {
    return mongoose.connection;
  }
}