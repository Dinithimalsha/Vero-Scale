/**
 * Radical Candor Feedback Dashboard
 * "Care Personally, Challenge Directly"
 */

import { useState, useEffect } from 'react';
import {
    MessageSquare, Heart, Zap, Users,
    BarChart2, Send, Mic, RefreshCw
} from 'lucide-react';
import { radicalCandorApi } from '../../services/api';

export function FeedbackDashboard() {
    const [activeTab, setActiveTab] = useState<'GIVE' | 'STATS' | 'RECEIVED'>('GIVE');

    return (
        <div className="feedback-dashboard h-full p-xl">
            <div className="flex items-center justify-between mb-xl">
                <h2 className="flex items-center gap-md">
                    <Heart className="text-accent" />
                    Radical Candor
                </h2>
                <div className="flex bg-secondary p-xs rounded-lg">
                    <TabButton active={activeTab === 'GIVE'} onClick={() => setActiveTab('GIVE')} icon={<MessageSquare size={16} />} label="Give Feedback" />
                    <TabButton active={activeTab === 'RECEIVED'} onClick={() => setActiveTab('RECEIVED')} icon={<Users size={16} />} label="Inbox" />
                    <TabButton active={activeTab === 'STATS'} onClick={() => setActiveTab('STATS')} icon={<BarChart2 size={16} />} label="My Stats" />
                </div>
            </div>

            {activeTab === 'GIVE' && <GiveFeedbackView />}
            {activeTab === 'RECEIVED' && <ReceivedView />}
            {activeTab === 'STATS' && <StatsView />}
        </div>
    );
}

function TabButton({ active, onClick, icon, label }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-sm px-md py-sm rounded-md transition-all ${active ? 'bg-primary text-white shadow-sm' : 'hover:bg-tertiary text-muted'}`}
        >
            {icon}
            <span className="font-medium text-sm">{label}</span>
        </button>
    );
}

// ═══════════════════════════════════════════════════════════════════
// VIEW 1: GIVE FEEDBACK (With Real-time Analysis)
// ═══════════════════════════════════════════════════════════════════

function GiveFeedbackView() {
    const [content, setContent] = useState('');
    const [recipientId, setRecipientId] = useState('');
    const [analysis, setAnalysis] = useState<any>(null);
    const [analyzing, setAnalyzing] = useState(false);

    // Debounced analysis
    useEffect(() => {
        const timer = setTimeout(() => {
            if (content.length > 20) {
                runAnalysis();
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [content]);

    const runAnalysis = async () => {
        setAnalyzing(true);
        const result = await radicalCandorApi.analyzeSentiment(content);
        if (result.success && result.data) {
            setAnalysis(result.data);
        }
        setAnalyzing(false);
    };

    const handleSend = async () => {
        if (!content || !recipientId) return;
        await radicalCandorApi.createFeedback({
            organizationId: 'org-1',
            giverId: 'user-me', // Mock
            recipientId,
            content,
            feedbackType: 'ONE_ON_ONE'
        });
        alert('Feedback sent!');
        setContent('');
        setAnalysis(null);
    };

    return (
        <div className="grid-2 gap-xl h-full">
            {/* Editor */}
            <div className="card p-xl flex flex-col">
                <input
                    className="input mb-md"
                    placeholder="Recipient ID (e.g. user-123)"
                    value={recipientId}
                    onChange={e => setRecipientId(e.target.value)}
                />
                <textarea
                    className="flex-1 bg-tertiary p-md rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder="Write you feedback here..."
                    value={content}
                    onChange={e => setContent(e.target.value)}
                />
                <div className="flex justify-between items-center mt-md">
                    <button className="btn btn-ghost text-muted">
                        <Mic size={18} />
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSend}
                        disabled={!content || !recipientId}
                    >
                        <Send size={16} className="mr-sm" />
                        Send Feedback
                    </button>
                </div>
            </div>

            {/* Analysis Panel */}
            <div className="card p-xl bg-tertiary">
                <h3 className="mb-lg font-bold flex items-center gap-sm">
                    <Zap size={18} className="text-yellow-400" />
                    Candor Check
                </h3>

                {analyzing ? (
                    <div className="flex items-center gap-sm text-muted animate-pulse">
                        <RefreshCw className="spin" size={16} /> Analyzing...
                    </div>
                ) : analysis ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <div className="mb-xl p-md bg-secondary rounded-lg border border-border">
                            <div className="text-sm text-muted uppercase tracking-wider mb-xs">Tone Analysis</div>
                            <div className="text-xl font-bold mb-xs" style={{ color: getQuadrantColor(analysis.quadrant) }}>
                                {analysis.quadrant.replace('_', ' ')}
                            </div>
                            <p className="text-sm opacity-80">{analysis.toneSuggestion || "Feedback looks balanced."}</p>
                        </div>

                        <div className="grid-2 gap-md mb-xl">
                            <ScoreCard label="Care Personally" score={analysis.careScore} color="#22c55e" />
                            <ScoreCard label="Challenge Directly" score={analysis.challengeScore} color="#3b82f6" />
                        </div>

                        <div className="text-xs text-muted">
                            Tip: Aim for high Care (empathy) AND high Challenge (clarity).
                        </div>
                    </div>
                ) : (
                    <div className="text-muted text-center mt-xl">
                        Start writing to see real-time coaching.
                    </div>
                )}
            </div>
        </div>
    );
}

function ScoreCard({ label, score, color }: any) {
    return (
        <div className="bg-secondary p-md rounded border border-border text-center">
            <div className="text-xs text-muted mb-xs">{label}</div>
            <div className="text-2xl font-bold" style={{ color }}>{score}</div>
        </div>
    );
}

function getQuadrantColor(nebula: string) {
    switch (nebula) {
        case 'RADICAL_CANDOR': return '#22c55e'; // Green
        case 'OBNOXIOUS_AGGRESSION': return '#ef4444'; // Red
        case 'RUINOUS_EMPATHY': return '#eab308'; // Yellow
        case 'MANIPULATIVE_INSINCERITY': return '#64748b'; // Gray
        default: return '#fff';
    }
}

// ═══════════════════════════════════════════════════════════════════
// VIEW 2: STATS
// ═══════════════════════════════════════════════════════════════════

function StatsView() {
    return (
        <div className="flex items-center justify-center h-full text-muted">
            Stats visualization coming in v2.
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// VIEW 3: RECEIVED
// ═══════════════════════════════════════════════════════════════════

function ReceivedView() {
    return (
        <div className="flex items-center justify-center h-full text-muted">
            Inbox empty.
        </div>
    );
}
