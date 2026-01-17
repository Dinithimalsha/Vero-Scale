/**
 * SALES COACHING SERVICE (The SPIN Doctor)
 * Diagnostic AI coaching for sales reps.
 */

export interface TranscriptAnalysis {
    dealId: string;
    missingStages: string[]; // S, P, I, N
    score: number; // 0-100
    diagnosticFeedback: string;
}

export class SalesCoachingService {

    /**
     * Analyze a call transcript using SPIN Framework
     */
    async analyzeTranscript(transcript: string, dealId: string): Promise<TranscriptAnalysis> {
        // Mock LLM Analysis
        // Logic: Scan for question patterns

        const hasSituation = transcript.includes("current process") || transcript.includes("how do you currently");
        const hasProblem = transcript.includes("challenge") || transcript.includes("bottleneck") || transcript.includes("difficult");
        const hasImplication = transcript.includes("impact") || transcript.includes("cost of inaction") || transcript.includes("what happens if");
        const hasNeedPayoff = transcript.includes("help you") || transcript.includes("value") || transcript.includes("enable");

        const missingStages = [];
        if (!hasSituation) missingStages.push('SITUATION');
        if (!hasProblem) missingStages.push('PROBLEM');
        if (!hasImplication) missingStages.push('IMPLICATION');
        if (!hasNeedPayoff) missingStages.push('NEED_PAYOFF');

        let score = 100 - (missingStages.length * 25);
        let feedback = "Strong execution of SPIN framework.";

        if (missingStages.includes('IMPLICATION')) {
            feedback = "⚠️ Diagnostic: You missed the IMPLICATION phase. The prospect admits the problem but doesn't feel the pain yet. ACTION: Ask 'What is the financial impact of this bottleneck on your Q3 goals?' to restore urgency.";
        } else if (missingStages.includes('PROBLEM')) {
            feedback = "⚠️ Diagnostic: You jumped to solutions before establishing the PROBLEM. ACTION: Ask 'What is the hardest part about your current process?'";
        }

        return {
            dealId,
            missingStages,
            score,
            diagnosticFeedback: feedback
        };
    }
}

export const salesCoach = new SalesCoachingService();
