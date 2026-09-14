import type {
  CalculationVerificationResult,
  EvidenceItem,
  ThoughtNode,
  VerificationCheck,
  VerificationDetailedStatus,
  VerificationResult,
  VerificationStatus,
  SearchProviderPreference,
} from '../types';
import type { VerificationSearchResult } from '../verification-memory';

export interface PreliminaryVerificationResult {
  verifiedCalculations?: CalculationVerificationResult[];
  initialVerification: boolean;
  verificationInProgress: boolean;
  preverifiedThought: string;
}

export interface PreviousVerificationResult {
  previousVerification: VerificationSearchResult | null;
  verification?: VerificationResult;
  isVerified: boolean;
  verificationStatus: VerificationDetailedStatus;
  certaintySummary: string;
}

export interface ClaimVerificationRequest {
  claim: string;
  sessionId?: string;
  checkCalculation?: boolean;
  checkConsistency?: boolean;
  checkWeb?: boolean;
  connectedThoughts?: ThoughtNode[];
  searchProvider?: SearchProviderPreference;
  tavilyApiKey?: string;
}

export interface VerificationStoreExtras {
  evidence?: EvidenceItem[];
  checks?: VerificationCheck[];
  ttl?: number;
}

export interface IVerificationService {
  performPreliminaryVerification(
    content: string,
    explicitlyRequested?: boolean
  ): Promise<PreliminaryVerificationResult>;

  checkPreviousVerification(
    content: string,
    sessionId?: string,
    thoughtType?: string,
    connectedThoughtIds?: string[]
  ): Promise<PreviousVerificationResult>;

  deepVerify(
    thought: ThoughtNode,
    containsCalculations?: boolean,
    forceVerification?: boolean,
    sessionId?: string,
    connectedThoughts?: ThoughtNode[]
  ): Promise<VerificationResult>;

  verifyClaim(request: ClaimVerificationRequest): Promise<VerificationResult>;

  detectAndVerifyCalculations(content: string): Promise<CalculationVerificationResult[]>;

  annotateThoughtWithVerifications(
    content: string,
    verifications: CalculationVerificationResult[]
  ): string;

  storeVerification(
    content: string,
    status: VerificationStatus,
    confidence: number,
    sources: string[],
    sessionId?: string,
    extras?: VerificationStoreExtras
  ): Promise<string>;
}
