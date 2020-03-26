import * as Discord from "discord.js";
import { GuildContext } from "src/guild-context";

export class RoleAssignmentService {

  constructor(private guildContext: GuildContext) {}

  public queueCourseRoleAssignments(discordMember: Discord.GuildMember, courseNumbers: string[]): void {
    //discordMember.roles.
  }

}