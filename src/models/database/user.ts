import mongoose, { Document, Schema } from "mongoose";

import { VerificationStatus } from "../verification-status";

export interface IUser extends Document {
  discordUserId: string;
  studentId: string;
  verificationStatus: VerificationStatus;
  verificationCode: string;

  guilds: Map<string, {
    courses: IUserCourseAssignment[];
    coursesLastUpdated: Date;
  }>

  banned: boolean;
}

export interface IUserCourseAssignment {
  courseKey: string,
  isTA: boolean
}

export const UserSchema = new Schema({
  discordUserId: { type: Schema.Types.String, required: true, unique: true, index: true },
  studentId: { type: Schema.Types.String, required: false, index: true },
  verificationStatus: { type: Schema.Types.Number, required: true, default: VerificationStatus.UNVERIFIED },
  verificationCode: { type: Schema.Types.String, required: false },

  guilds: {
    type: Map,
    of: new Schema({
      courses: {
        type: [
          new Schema({
            courseKey: { type: Schema.Types.String, required: true },
            isTA: { type: Schema.Types.Boolean, required: true, default: false }
          })
        ], required: true, default: []
      },
      coursesLastUpdated: { type: Schema.Types.Date, required: true, default: Date.now() }
    }),
    required: true,
    default: {}
  },

  banned: { type: Schema.Types.Boolean, required: true, default: false },

  // Deprecated
  jailed: { type: Schema.Types.Boolean, required: false }
});

UserSchema.post("init", doc => {
  // Migrate jailed to banned
  if(doc["jailed"] != undefined) {
    doc["banned"] = doc["jailed"];
    doc["jailed"] = undefined;
  }
});

export const User = mongoose.model<IUser>("User", UserSchema);
