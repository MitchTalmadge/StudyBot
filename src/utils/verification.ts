import { customAlphabet } from "nanoid";
const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 20);

export class VerificationUtils {
  public static generateVerificationCode(): string {
    return nanoid();
  }
}