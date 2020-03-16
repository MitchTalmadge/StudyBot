// eslint-disable-next-line quotes
import mongoose, { Document, Schema } from "mongoose";
import { Moment } from "moment";
import { VerificationStatus } from "../verification-status";

export interface IUser extends Document {
  discordUserId: string;
  studentId: string;
  verificationStatus: VerificationStatus;

  guilds: Map<string, {
    courseNumbers: string[];
    coursesLastUpdated: Moment;
  }>

  jailed: boolean;
}

export const UserSchema = new Schema({
  discordUserId: { type: String, required: true, unique: true },
  studentId: { type: String, required: false },
  verificationStatus: { type: Number, required: true, default: VerificationStatus.UNVERIFIED },

  guilds: {
    type: Map,
    of: new Schema({
      courseNumbers: { type: [String], required: true, default: [] },
      coursesLastUpdated: { type: Date, required: true, default: Date.now() }
    }),
    required: true,
    default: {}
  },

  jailed: { type: Boolean, required: true, default: false }
});

UserSchema.post("init", (_doc) => {
  // TODO: Migrations
});

export const User = mongoose.model<IUser>("User", UserSchema);
