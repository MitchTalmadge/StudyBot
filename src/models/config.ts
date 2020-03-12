export interface Config {
  discordToken: string;

  database: DatabaseConfig;

  guilds: {[guildId: string]: GuildConfig};
}

export interface DatabaseConfig {
  address: string;
  name: string;
}

export interface GuildConfig {
  majorPrefix: string;
  webCatalog: string;
}
