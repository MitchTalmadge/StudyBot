// eslint-disable-next-line quotes
import mongoose, { Document, Schema } from "mongoose";
import { Moment } from "moment";
import { VerificationStatus } from "../verification-status";

export interface IUser extends Document {
  discordUserId: string;
  studentId: string;
  verificationStatus: VerificationStatus;

  guilds: Map<string, {
    courses: IUserCourseAssignment[];
    coursesLastUpdated: Moment;
  }>

  jailed: boolean;
}

export interface IUserCourseAssignment {
  courseKey: string,
  isTA: boolean
}

export const UserSchema = new Schema({
  discordUserId: { type: Schema.Types.String, required: true, unique: true },
  studentId: { type: Schema.Types.String, required: false },
  verificationStatus: { type: Schema.Types.Number, required: true, default: VerificationStatus.UNVERIFIED },

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

  jailed: { type: Schema.Types.Boolean, required: true, default: false }
});

UserSchema.post("init", (_doc) => {
  // TODO: Migrations
});

export const User = mongoose.model<IUser>("User", UserSchema);
