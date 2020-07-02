import { VerifierService } from "./verifier";

export class UtahVerifierService extends VerifierService {
  public looksLikeStudentID(input: string): boolean {
    return /^u[0-9]{7}$/i.test(input.trim());
  }

  public convertStudentIDToEmailAddress(studentId: string): string {
    return `${studentId}@utah.edu`;
  }
}