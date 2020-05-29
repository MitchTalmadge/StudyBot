import { customAlphabet } from "nanoid";
const nanoid = customAlphabet("0123456789", 4);

export class VerificationUtils {
  public static generateVerificationCode(): string {
    return nanoid();
  }

  public static getRoleName(): string {
    return "verified";
  }
}