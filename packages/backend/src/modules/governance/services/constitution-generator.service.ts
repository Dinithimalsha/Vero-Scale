/**
 * CONSTITUTION GENERATOR (Docs as Code)
 * "The Code is the Law."
 * 
 * Generates the System Constitution (Manifesto.md) directly from
 * the TypeScript constants that govern the enterprise.
 */

import { MIN_LTV_CAC_RATIO, MAX_PAYBACK_MONTHS } from '../../sales/services/unit-economics.service';
import { STANDARD_CONFIG, CRISIS_CONFIG } from '../../operations/services/heijunka.service';

export class ConstitutionGeneratorService {

    generateManifesto(): string {
        const timestamp = new Date().toISOString();

        return `
# THE SYSTEM CONSTITUTION
> Generated Automatedly on ${timestamp}
> Compliance is Mandatory.

## Article I: Financial Physics
**Section 1.1: Sustainable Growth**
The Enterprise shall maintain a minimum financial efficiency rating.
- **Minimum LTV:CAC Ratio**: ${MIN_LTV_CAC_RATIO}:1
- **Maximum Payback Period**: ${MAX_PAYBACK_MONTHS} Months
*Violation triggers immediate suspension of Marketing Budget.*

## Article II: Operational Rhythm
**Section 2.1: Standard Allocations (Heijunka)**
During times of peace, the Engine shall distribute capacity as follows:
- **Feature Development**: ${(STANDARD_CONFIG.FEATURE * 100).toFixed(0)}%
- **Technical Debt**: ${(STANDARD_CONFIG.DEBT * 100).toFixed(0)}%
- **Bug Fixes**: ${(STANDARD_CONFIG.BUG * 100).toFixed(0)}%
- **Security/Compliance**: ${(STANDARD_CONFIG.SECURITY * 100).toFixed(0)}%

**Section 2.2: Crisis Protocols**
During a declared \`GROWTH_HALT\`, the Engine shall shift to:
- **Feature Development**: ${(CRISIS_CONFIG.FEATURE * 100).toFixed(0)}%
- **Retention & Optimization**: ${(CRISIS_CONFIG.DEBT * 100).toFixed(0)}% (All-Hands Focus)

## Article III: Algorithmic Governance
All departmental budgets are "Zero-Based" until justified by the Oracle.
        `.trim();
    }
}

export const constitutionGenerator = new ConstitutionGeneratorService();
