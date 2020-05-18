import { VerifierService } from "./verifier";

export class UtahVerifierService extends VerifierService {
  public checkPattern(input: string): boolean {
    return /^u[0-9]{7}$/i.test(input.trim());
  }

  public convertToEmailAddress(studentId: string): string {
    return `${studentId}@umail.utah.edu`;
  }
}