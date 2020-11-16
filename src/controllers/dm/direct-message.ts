import * as Discord from "discord.js";
import { GuildContext } from "guild-context";
import { StudyBot } from "main";
import { UserDatabaseService } from "services/database/user";

enum ConversationState {
  FEEDBACK
}

enum FeedbackStage {
  GUILD_SELECT,
  WRITE_MESSAGE,
  CONFIRM_CANCEL
}

// ***************** VERY IMPORTANT: DO NOT LOG ANY IDENTIFIABLE INFORMATION ABOUT DMs ***************** //
export class DirectMessageController {
  private conversationStateMap: {[discordUserId: string]: ConversationState} = {}

  private feedbackStateMap: {[discordUserId: string]: {stage: FeedbackStage, destination?: GuildContext}} = {}

  public onMessageReceived(message: Discord.Message) {
    const conversationState = this.conversationStateMap[message.author.id];
    if(conversationState == undefined) {
      this.handleDefaultConversationState(message)
        .catch(err => {
          message.reply("Oops! Something went wrong while I was parsing your message. Please try again or ask an admin to see what's wrong!");
          console.error("Default conversation state failed:", err);
        });
      return;
    } else if (conversationState == ConversationState.FEEDBACK) {
      this.handleFeedbackConversationState(message);
      return;
    }
  }

  private async handleDefaultConversationState(message: Discord.Message) {
    const feedbackDestinations = await this.determineFeedbackDestinations(message.author.id);

    switch(message.content.trim()) {
      case "feedback":
        if(feedbackDestinations.length == 0)
          return;
        this.handleFeedbackStart(message, feedbackDestinations)
          .catch(err => {
            message.reply("Oops! Something went wrong while I was preparing to gather your feedback. Please try again or ask an admin to see what's wrong!");
            console.error("Feedback start stage failed:", err);
          });
        break;
      default: 
        if (feedbackDestinations.length > 0) {
          message.reply("Hey there! If you'd like to send some anonymous feedback to the student advisory committee, just say \"feedback\" and I will help you out! :)");
        } else {
          message.reply("Hey there! Please use the server channels to join courses or do other things :) If you need help, PM a moderator! Have a good day!");
        }
    }
  }

  private handleFeedbackConversationState(message: Discord.Message) {
    switch(message.content.trim()) {
      case "cancel":
        message.reply("Alright, cancelled! I will discard this feedback. Please let me know if you'd ever like to send feedback again! Have a nice one!");
        delete this.conversationStateMap[message.author.id];
        delete this.feedbackStateMap[message.author.id];
        break;
      default:
        // TODO: Check if starts with "cancel", just in case; ask user to confirm.

        switch(this.feedbackStateMap[message.author.id].stage) {
          case FeedbackStage.GUILD_SELECT: 
            this.handleFeedbackGuildSelect(message)
              .catch(err => {
                message.reply("Oops! Something went wrong while I was parsing your message. Please try again or ask an admin to see what's wrong!");
                console.error("Feedback guild selection stage failed:", err);
              });
            return;
          case FeedbackStage.WRITE_MESSAGE:
            this.handleFeedbackWriteMessage(message)
              .catch(err => {
                message.reply("Oops! Something went wrong while I was parsing your message. Please try again or ask an admin to see what's wrong!");
                console.error("Feedback write message stage failed:", err);
              });
        }
        break;
    }
  }

  private async handleFeedbackStart(message: Discord.Message, feedbackDestinations: GuildContext[]) {
    const senderVerified = UserDatabaseService.isUserVerified(message.author.id);
    if(!senderVerified) {
      await message.reply(
        "Hmm.. :thinking: my records show that you are not verified yet. Once you finish verification, come back here and " + 
        "say \"feedback\" again and I will help you! We require verification in order to prevent spam from non-students; I hope you understand!"
      );
      return;
    }

    this.conversationStateMap[message.author.id] = ConversationState.FEEDBACK;

    let greeting = "Awesome! It sounds like you want to send some feedback to the student advisory committee";
    if(feedbackDestinations.length == 1) {
      greeting += ` at the \`${feedbackDestinations[0].guild.name}\` server.\n\n`;
    } else {
      greeting += ".\n\n";
    }
    
    greeting +=
    ":detective: Please know that this process is **completely** anonymous. Not even the admins or moderators of the server can " +
    "find out who sent feedback. I will not log any identifiable information about our conversation. (I am open source if you'd like to check!) " +
    "Confidentiality is top priority, so be open, and be honest! :)\n\n" + 
    ":information_source: By the way, if you ever change your mind about giving feedback, just say \"cancel\" and I'll discard your message.\n\n";

    if(feedbackDestinations.length > 1) {
      greeting += 
        ":thinking: First things first, I need to know which server's committee this feedback should be sent to.\n" + 
        "Please type the number corresponding to one of the following options:\n```\n";
      
      for(let i = 0; i < feedbackDestinations.length; i++) {
        greeting += `${i+1}: ${feedbackDestinations[i].guild.name}\n`;
      }
      greeting += "```";

      this.feedbackStateMap[message.author.id] = {
        stage: FeedbackStage.GUILD_SELECT
      };
      await message.reply(greeting);
    } else {
      this.feedbackStateMap[message.author.id] = {
        stage: FeedbackStage.WRITE_MESSAGE,
        destination: feedbackDestinations[0]
      };
      await message.reply(greeting);
      await this.writeFeedbackPrompt(message);
    }
  }

  private async writeFeedbackPrompt(message: Discord.Message) {
    message.reply(":pencil: Please go ahead and write your feedback now. Take your time, and don't worry, you'll be able to preview it before it's sent!");
  }

  private async handleFeedbackGuildSelect(message: Discord.Message) {
    const feedbackDestinations = await this.determineFeedbackDestinations(message.author.id);
    const choice = parseInt(message.content);
    if(isNaN(choice) || choice == 0 || choice > feedbackDestinations.length) {
      await message.reply("Hmm, that doesn't look like a valid option. Please enter just one number from the list, or say \"cancel\" to discard this feedback!");
      return;
    }

    const destination = feedbackDestinations[choice - 1];
    this.feedbackStateMap[message.author.id].destination = destination;
    this.feedbackStateMap[message.author.id].stage = FeedbackStage.WRITE_MESSAGE;
    await message.reply(`Sounds good! The feedback you type here will be sent to the student advisory committee over at the \`${destination.guild.name}\` server.`);
    await this.writeFeedbackPrompt(message);
  }

  private async handleFeedbackWriteMessage(message: Discord.Message) {
    if(message.content.trim().length == 0) {
      await message.reply(
        ":thinking: Hmm.. I couldn't find any text in your message. Pictures/videos are not supported, by the way! " + 
        "Sorry for the inconvenience. Go ahead and try again whenever you're ready, or say \"cancel\" to discard this feedback."
      );
      return;
    }
    const feedbackPreview = new Discord.MessageEmbed()
      .setTitle("New Anonymous Feedback Received")
      .setColor(0x00ccff)
      .setDescription(message.content);

    await message.reply("Thank you! Here is what the student advisory committee will be able to see if you send this feedback:");
    await message.reply(feedbackPreview);
    await message.reply(
      "Is this okay with you? Say \"yes\" to send the feedback, or \"no\" to write a new message. " + 
      "You may also say \"cancel\" to stop writing feedback and discard what you have written."
    );
  }

  private async determineFeedbackDestinations(discordUserId: string): Promise<GuildContext[]> {
    const feedbackDestinations: GuildContext[] = [];
    for(let guildId in StudyBot.guildContexts) {
      const guildContext = StudyBot.guildContexts[guildId];
      // Guild should have a committee.
      if(!guildContext.guildConfig.studentAdvisoryCommittee) {
        continue;
      }
      // User should be part of guild.
      try {
        await guildContext.guild.members.fetch(discordUserId);
      } catch(err) {
        continue;
      }
      feedbackDestinations.push(guildContext);
    }
    return feedbackDestinations;
  }
}