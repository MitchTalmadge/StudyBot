import * as fs from "fs";
import { Config } from "models/config";
import { VerifierType } from "models/verifier-type.enum";
import { RouteUtils } from "utils/route";

export class ConfigService {
  private static config: Config;

  public static getConfig(): Config {
    return this.config;
  }

  public static async loadAndValidateConfig(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.readFile("config/config.json", { encoding: "utf8" }, (err, data) => {
        if (err) {
          reject(err);
          return;
        }

        this.config = JSON.parse(data);

        try {
          this.validateConfig();
        } catch (err) {
          console.error("The configuration file has a problem and the bot cannot start:", err.message);
          process.exit(1);
        }

        // Override database connection parameters if in development mode and alternatives are available.
        if (process.env.NODE_ENV === "development") {
          if (process.env.DB_ADDRESS && process.env.DB_NAME) {
            this.config.database.address = process.env.DB_ADDRESS;
            this.config.database.name = process.env.DB_NAME;
          }
        }

        resolve();
      });
    });
  }

  private static validateConfig(): void {
    if (!this.config.discordToken) {
      throw Error("The discord token is missing or empty.");
    }

    this.validateDatabaseConfig();

    this.validateWebConfig();

    this.validateVerificationConfig();

    this.validateGuildsConfig();
  }

  private static validateDatabaseConfig(): void {
    if (!this.config.database) {
      throw Error("The database config is missing.");
    }
    if (!this.config.database.address) {
      throw Error("The database address is missing or empty.");
    }
    if (!this.config.database.name) {
      throw Error("The database name is missing or empty.");
    }
    if(this.config.database.auth) {
      if(!this.config.database.username) {
        throw Error("Database auth is enabled but username is missing or empty.");
      }
      if(!this.config.database.password) {
        throw Error("Database auth is enabled but password is missing or empty.");
      }
    }
  }

  private static validateWebConfig(): void {
    if(!this.config.web) {
      throw Error("The web config is missing.");
    }
    if(this.config.web.enabled) {
      if(!this.config.web.port) {
        throw Error("Web port is missing or empty."); 
      }
      
      // Sanitize basename
      this.config.web.basename = RouteUtils.removeLeadingAndTrailingSlashes(this.config.web.basename);
    }
  }

  private static validateSMTPConfig(): void {
    if(!this.config.smtp) {
      throw Error("The STMP config is missing.");
    }
    if(!this.config.smtp.host) {
      throw Error("SMTP host is missing or empty.");
    }
    if(!this.config.smtp.port) {
      throw Error("SMTP port is missing or empty.");
    }
    if(!this.config.smtp.user) {
      throw Error("SMTP user is missing or empty.");
    }
    if(!this.config.smtp.pass) {
      throw Error("SMTP pass is missing or empty.");
    }
    if(!this.config.smtp.fromAddress) {
      throw Error("SMTP fromAddress is missing or empty.");
    }
    if(!this.config.smtp.fromName) {
      throw Error("SMTP fromName is missing or empty.");
    }
  }

  private static validateVerificationConfig(): void {
    if(!this.config.verification) {
      throw Error("The verification config is missing.");
    }
    if(this.config.verification.enabled) {
      if(!this.config.verification.verifier) {
        throw Error("Verification verifier is missing or empty.");
      }
      if(!Object.values(VerifierType).includes(this.config.verification.verifier)) {
        throw Error("Verification verifier is not valid.");
      }
      if(!this.config.smtp) {
        throw Error("Verification is enabled but the SMTP config is missing.");
      }

      this.validateSMTPConfig();
    }
  }

  private static validateGuildsConfig(): void {
    if (!this.config.guilds) {
      throw Error("The guilds configuration is missing.");
    }
    if (Array.isArray(this.config.guilds)) {
      throw Error("The guilds configuration is malformed.");
    }
    Object.keys(this.config.guilds).forEach(guildId => {
      const guild = this.config.guilds[guildId];
      if (!guild.majors) {
        throw Error(`Guild ID ${guildId} configuration is missing majors array.`);
      }
      if (!Array.isArray(guild.majors)) {
        throw Error(`Guild ID ${guildId} configuration has malformed majors array.`);
      }
      if (guild.majors.length === 0) {
        throw Error(`Guild ID ${guildId} configuration has empty majors array.`);
      }
      if(!guild.moderatorCommandChannelId) {
        throw Error(`Guild ID ${guildId} configuration has missing or empty moderator command channel ID.`);
      }
      if(!guild.courseSelectionChannelId) {
        throw Error(`Guild ID ${guildId} configuration has missing or empty course selection channel ID.`);
      }
      if(!guild.verificationChannelId) {
        throw Error(`Guild ID ${guildId} configuration has missing or empty verification channel ID.`);
      }
      //TODO: web catalog validation.
    });
  }
}
