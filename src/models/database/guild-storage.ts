// eslint-disable-next-line quotes
import mongoose, { Document, Schema } from "mongoose";

export interface IGuildStorage extends Document {
  guildId: string;

  majors: Map<string, {
    roles: Map<string, string>
  }>
}

export const GuildStorageSchema = new Schema({
  guildId: { type: Schema.Types.String, required: true, unique: true },

  majors: {
    type: Map,
    of: new Schema({
      roles: { type: Map, of: Schema.Types.String, required: true, default: {} },
    }),
    required: true,
    default: {}
  },

  jailed: { type: Schema.Types.Boolean, required: true, default: false }
});

GuildStorageSchema.post("init", (_doc) => {
  // TODO: Migrations
});

export const GuildStorage = mongoose.model<IGuildStorage>("GuildStorage", GuildStorageSchema);
