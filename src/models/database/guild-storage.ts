// eslint-disable-next-line quotes
import { IVerificationImplement } from "models/implement/verification";
import mongoose, { Document, Schema } from "mongoose";

import { IMajorImplement } from "../implement/major";

export interface IGuildStorage extends Document {
  guildId: string;

  majorImplements: Map<string, IMajorImplement>
  verificationImplement: IVerificationImplement;
}

export const GuildStorageSchema = new Schema({
  guildId: { type: Schema.Types.String, required: true, index: true },

  majorImplements: {
    type: Map,
    of: new Schema({
      categoryIdsMatrix: {
        type: [
          new Schema({ categoryIds: { type: [Schema.Types.String], required: true } })
        ], required: true
      },
      courseImplements: {
        type: Map,
        of: new Schema({
          mainRoleId: { type: Schema.Types.String, required: true },
          taRoleId: { type: Schema.Types.String, required: true },
          channelIds: { type: [Schema.Types.String], required: true },
        }),
        required: true,
        default: {}
      },
    }),
    required: true,
    default: {}
  },

  verificationImplement: new Schema({
    roleId: { type: Schema.Types.String, required: true },
  })
});

GuildStorageSchema.post("init", (_doc) => {
  // TODO: Migrations
});

export const GuildStorage = mongoose.model<IGuildStorage>("GuildStorage", GuildStorageSchema);
