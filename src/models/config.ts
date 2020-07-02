import { VerifierType } from "./verifier-type.enum";

export interface Config {
  discordToken: string;

  database: DatabaseConfig;

  web: WebConfig;

  smtp: SMTPConfig;

  verification: VerificationConfig;

  guilds: {[guildId: string]: GuildConfig};

  enablePrivacyMode: boolean;
}

export interface DatabaseConfig {
  address: string;
  name: string;
}

export interface WebConfig {
  enabled: boolean;
  port: number;
  basename: string;
  publicUri: string;
}

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;

  fromAddress: string;
  fromName: string;
}

export interface VerificationConfig {
  enabled: boolean;
  verifier: VerifierType;
}

export interface GuildConfig {
  majors: string[];
  webCatalog: string;
  moderatorRoleName: string;
  courseSelectionChannelId: string;
  verificationChannelId: string;
}
