export interface StudyBotConfig {
  discordToken: string;

  database: StudyBotDatabaseConfig;

  guilds: {[guildId: string]: {
    majorPrefix: string;
    webCatalog: string;
  }};
}

export interface StudyBotDatabaseConfig {
  address: string;
  name: string;
}