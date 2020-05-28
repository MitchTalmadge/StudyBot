import { UtahVerifierService } from "./utah-verifier";
import { VerifierService } from "./verifier";
import { VerifierType } from "models/verifier-type.enum";

export class VerifierServiceFactory {
  public static getVerifier(type: VerifierType): VerifierService {
    switch (type) {
      case VerifierType.UTAH:
        return new UtahVerifierService();
    }
  }
}
