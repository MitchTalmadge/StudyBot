import * as Discord from "discord.js";
import { CommandController } from "./command-controller";
import { DiscordUtils } from "utils/discord";

export class DevCommandController extends CommandController {

  public onMessageReceived(message: Discord.Message | Discord.PartialMessage): void {
    if(process.env.NODE_ENV !== "development") 
      return;

    if(!message.content.startsWith("!dev"))
      return;
      
    const commandTokens = message.content.toLowerCase().split(/\s+/);
    if(commandTokens.length == 1) {
      message.reply("No command parameters were supplied.");
      return;
    }

    if(commandTokens[1] === "reset") {
      message.reply("reset initiated...");
      this.resetGuild() 
        .then(() => {
          message.reply("reset complete!");
        })
        .catch(err => {
          message.reply("something went wrong during reset. Check the logs.");
          this.guildContext.guildError("Could not reset guild", err);
        });
    }
  }

  /**
   * Cleans up a guild during development by deleting all channels and roles that 
   * look like they may have been orphaned due to a database reset.
   */
  private async resetGuild(): Promise<void> {
    // TODO: don't delete things we find in the current database.

    // Very rudementary auto-deletion of categories and their children.
    for(let cacheMeta of this.guildContext.guild.channels.cache) {
      const channel = cacheMeta[1];
      if((channel.name.endsWith("-chat") || channel.name.endsWith("-voice")) && channel.type === "category") {
        const category: Discord.CategoryChannel = <Discord.CategoryChannel>channel;
        for(let childCacheMeta of category.children) {
          const childChannel = childCacheMeta[1];
          await childChannel.delete("StudyBot dev reset command.");
          await DiscordUtils.rateLimitAvoidance();
        }

        await category.delete("StudyBot dev reset command.");
        await DiscordUtils.rateLimitAvoidance();
      }
    }

    // Roles
    for(let roleMeta of this.guildContext.guild.roles.cache) {
      const role = roleMeta[1];
      if(role.name === "verified") {
        await role.delete("StudyBot dev reset command.");
        await DiscordUtils.rateLimitAvoidance();
        continue;
      }

      if(role.name.endsWith("-ta")) {
        // Try to find matching non-ta role.
        const nonTaRole = this.guildContext.guild.roles.cache.find(r => r.name === role.name.substr(0, role.name.length - "-ta".length));
        if(nonTaRole) {
          await nonTaRole.delete("StudyBot dev reset command.");
          await DiscordUtils.rateLimitAvoidance();
        }

        await role.delete("StudyBot dev reset command.");
        await DiscordUtils.rateLimitAvoidance();
      }
    }
  }

}