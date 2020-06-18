// eslint-disable-next-line quotes
import mongoose, { Document, Schema } from "mongoose";
import { IMajorImplement } from "../implement/major";
import { IVerificationImplement } from "models/implement/verification";

export interface IGuildStorage extends Document {
  guildId: string;

  majorImplements: Map<string, IMajorImplement>
  verificationImplement: IVerificationImplement;
}

export const GuildStorageSchema = new Schema({
  guildId: { type: Schema.Types.String, required: true, unique: true },

  majorImplements: {
    type: Map,
    of: new Schema({
      categoryIds: { type: [Schema.Types.String], required: true, unique: true },
      courseImplements: { 
        type: Map, 
        of: new Schema({
          mainRoleId: { type: Schema.Types.String, required: true, unique: true },
          taRoleId: { type: Schema.Types.String, required: true, unique: true },
          mainChannelId: { type: Schema.Types.String, required: true, unique: true },
          voiceChannelId: { type: Schema.Types.String, required: true, unique: true }
        }), 
        required: true, 
        default: {} 
      },
    }),
    required: true,
    default: {}
  },

  verificationImplement: new Schema({
    roleId: { type: Schema.Types.String, required: true, unique: true },
  })
});

GuildStorageSchema.post("init", (_doc) => {
  // TODO: Migrations
});

export const GuildStorage = mongoose.model<IGuildStorage>("GuildStorage", GuildStorageSchema);
