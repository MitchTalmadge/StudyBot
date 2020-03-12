import * as fs from "fs";
import { StudyBotConfig } from "src/models/config";
import { isArray } from "util";

export class ConfigService {
  private static config: StudyBotConfig;

  public static getConfig(): StudyBotConfig {
    return this.config;
  }

  public static async loadAndValidateConfig(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.readFile("config/config.json", { encoding: "utf8" }, (err, data) => {
        if(err) {
          reject(err);
          return;
        }

        this.config = JSON.parse(data);
        this.validateConfig();
        resolve();
      });
    });
  }

  private static validateConfig(): void {
    if(!this.config.discordToken) {
      throw Error("The discord token is missing or empty.");
    }

    // Database
    if(!this.config.database) {
      throw Error("The database config is missing.");
    }
    if(!this.config.database.address) {
      throw Error("The database address is missing or empty.");
    }
    if(!this.config.database.name) {
      throw Error("The database name is missing or empty.");
    }

    // Guilds
    if(!this.config.guilds) {
      throw Error("The guilds configuration is missing.");
    }
    if(isArray(this.config.guilds)) {
      throw Error("The guilds configuration is malformed.");
    }
    Object.keys(this.config.guilds).forEach(guildId => {
      const guild = this.config.guilds[guildId];
      if(!guild.majorPrefix) {
        throw Error(`Guild ID ${guildId} configuration has missing or empty major prefix.`);
      }
      //TODO: web catalog validation.
    });
  }

  
}
