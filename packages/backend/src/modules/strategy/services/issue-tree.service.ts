/**
 * MECE Issue Tree Service - Strategic Problem Decomposition
 * AI-assisted decision journal (per CEO: suggest, don't enforce)
 * 
 * MECE = Mutually Exclusive, Collectively Exhaustive
 */

import { prisma } from '../../../config/database';
import type { IssueTree, IssueTreeNode, TreeType, DataSourceType } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface CreateTreeInput {
    organizationId: string;
    title: string;
    rootQuestion: string;
    treeType?: TreeType;
    aiSuggestionsEnabled?: boolean;
}

export interface CreateNodeInput {
    treeId: string;
    parentId?: string;
    label: string;
    hypothesis?: string;
    notes?: string;
    dataSourceType?: DataSourceType;
    dataSourceQuery?: string;
    position?: number;
}

export interface MeceValidation {
    isValid: boolean;
    isMutuallyExclusive: boolean;
    isCollectivelyExhaustive: boolean;
    warnings: string[];
    suggestions: string[];
}

export interface TreeWithNodes extends IssueTree {
    nodes: IssueTreeNode[];
}

export interface NodeWithChildren extends IssueTreeNode {
    children: NodeWithChildren[];
}

// ═══════════════════════════════════════════════════════════════════
// AI SUGGESTION PATTERNS
// Per CEO: AI should suggest, not enforce. These are soft guidelines.
// ═══════════════════════════════════════════════════════════════════

const MECE_PATTERNS = {
    exhaustive: [
        { pattern: /growth|scale|expand/i, suggestions: ['Market expansion', 'Product expansion', 'Geographic expansion'] },
        { pattern: /reduce|cut|decrease/i, suggestions: ['Operational costs', 'Marketing spend', 'Headcount', 'Infrastructure'] },
        { pattern: /revenue|income|money/i, suggestions: ['New customers', 'Existing customer expansion', 'Pricing optimization', 'New products'] },
        { pattern: /churn|retention|lose/i, suggestions: ['Product issues', 'Service issues', 'Competitive pressure', 'Price sensitivity'] },
        { pattern: /hire|recruit|team/i, suggestions: ['Sourcing', 'Screening', 'Interviewing', 'Closing', 'Onboarding'] },
    ],
    frameworks: [
        { name: 'Porter\'s Five Forces', branches: ['Supplier Power', 'Buyer Power', 'Competitive Rivalry', 'Threat of Substitution', 'Threat of New Entry'] },
        { name: '3C Analysis', branches: ['Company', 'Customers', 'Competitors'] },
        { name: '4P Marketing', branches: ['Product', 'Price', 'Place', 'Promotion'] },
        { name: 'SWOT', branches: ['Strengths', 'Weaknesses', 'Opportunities', 'Threats'] },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// ISSUE TREE SERVICE
// ═══════════════════════════════════════════════════════════════════

export class IssueTreeService {
    /**
     * Create a new issue tree
     */
    async createTree(input: CreateTreeInput): Promise<IssueTree> {
        return prisma.issueTree.create({
            data: {
                organizationId: input.organizationId,
                title: input.title,
                rootQuestion: input.rootQuestion,
                treeType: input.treeType ?? 'ISSUE',
                aiSuggestionsEnabled: input.aiSuggestionsEnabled ?? true,
            },
        });
    }

    /**
     * Add a node to the tree
     */
    async addNode(input: CreateNodeInput): Promise<IssueTreeNode> {
        // Get max position for siblings
        const siblings = await prisma.issueTreeNode.findMany({
            where: { treeId: input.treeId, parentId: input.parentId ?? null },
            orderBy: { position: 'desc' },
            take: 1,
        });

        const position = input.position ?? (siblings[0]?.position ?? 0) + 1;

        const node = await prisma.issueTreeNode.create({
            data: {
                treeId: input.treeId,
                parentId: input.parentId,
                label: input.label,
                hypothesis: input.hypothesis,
                notes: input.notes,
                dataSourceType: input.dataSourceType,
                dataSourceQuery: input.dataSourceQuery,
                position,
            },
        });

        // Run MECE validation for parent's children
        if (input.parentId) {
            await this.validateAndUpdateMeceWarning(input.parentId);
        }

        return node;
    }

    /**
     * Update a node
     */
    async updateNode(
        nodeId: string,
        updates: Partial<Pick<IssueTreeNode, 'label' | 'hypothesis' | 'notes' | 'isResolved' | 'dataSourceType' | 'dataSourceQuery'>>
    ): Promise<IssueTreeNode> {
        const node = await prisma.issueTreeNode.update({
            where: { id: nodeId },
            data: updates,
        });

        // Re-validate MECE for parent
        if (node.parentId) {
            await this.validateAndUpdateMeceWarning(node.parentId);
        }

        return node;
    }

    /**
     * Delete a node and all children
     */
    async deleteNode(nodeId: string): Promise<void> {
        // Cascade delete is handled by Prisma schema
        await prisma.issueTreeNode.delete({
            where: { id: nodeId },
        });
    }

    /**
     * Get tree with hierarchical nodes
     */
    async getTree(treeId: string): Promise<TreeWithNodes | null> {
        return prisma.issueTree.findUnique({
            where: { id: treeId },
            include: {
                nodes: {
                    orderBy: { position: 'asc' },
                },
            },
        });
    }

    /**
     * Get tree as hierarchical structure
     */
    async getTreeHierarchy(treeId: string): Promise<NodeWithChildren[]> {
        const nodes = await prisma.issueTreeNode.findMany({
            where: { treeId },
            orderBy: { position: 'asc' },
        });

        // Build hierarchy
        const nodeMap = new Map<string, NodeWithChildren>();
        const roots: NodeWithChildren[] = [];

        // First pass: create all nodes with empty children
        for (const node of nodes) {
            nodeMap.set(node.id, { ...node, children: [] });
        }

        // Second pass: build tree structure
        for (const node of nodes) {
            const nodeWithChildren = nodeMap.get(node.id)!;
            if (node.parentId && nodeMap.has(node.parentId)) {
                nodeMap.get(node.parentId)!.children.push(nodeWithChildren);
            } else {
                roots.push(nodeWithChildren);
            }
        }

        return roots;
    }

    /**
     * Validate MECE and generate AI suggestions
     * Per CEO: Soft suggestions, not enforcement
     */
    async validateMece(nodeId: string): Promise<MeceValidation> {
        const node = await prisma.issueTreeNode.findUnique({
            where: { id: nodeId },
            include: { children: true },
        });

        if (!node) {
            throw new Error('Node not found');
        }

        const warnings: string[] = [];
        const suggestions: string[] = [];
        let isMutuallyExclusive = true;
        let isCollectivelyExhaustive = true;

        const childLabels = node.children.map(c => c.label.toLowerCase());

        // Check for potential overlaps (mutual exclusivity)
        const overlappingTerms = this.findOverlappingTerms(childLabels);
        if (overlappingTerms.length > 0) {
            isMutuallyExclusive = false;
            warnings.push(`Potential overlap detected: ${overlappingTerms.join(', ')}`);
        }

        // Check for exhaustiveness (soft check)
        if (node.children.length < 2) {
            isCollectivelyExhaustive = false;
            warnings.push('Consider adding more branches for completeness');
        }

        // Generate AI suggestions based on parent label
        const frameworkMatch = MECE_PATTERNS.frameworks.find(f =>
            node.label.toLowerCase().includes(f.name.toLowerCase().split(' ')[0])
        );

        if (frameworkMatch) {
            const missingBranches = frameworkMatch.branches.filter(b =>
                !childLabels.some(c => c.includes(b.toLowerCase()))
            );
            if (missingBranches.length > 0) {
                suggestions.push(`Consider adding: ${missingBranches.join(', ')}`);
            }
        }

        // Pattern-based suggestions
        for (const pattern of MECE_PATTERNS.exhaustive) {
            if (pattern.pattern.test(node.label)) {
                const missingSuggestions = pattern.suggestions.filter(s =>
                    !childLabels.some(c => c.includes(s.toLowerCase()))
                );
                if (missingSuggestions.length > 0 && missingSuggestions.length < pattern.suggestions.length) {
                    suggestions.push(`Other common categories: ${missingSuggestions.slice(0, 3).join(', ')}`);
                }
                break;
            }
        }

        // Add "Other" catch-all suggestion if not present
        if (!childLabels.some(c => c.includes('other') || c.includes('misc'))) {
            suggestions.push('Consider adding an "Other" category for completeness');
        }

        return {
            isValid: isMutuallyExclusive && isCollectivelyExhaustive,
            isMutuallyExclusive,
            isCollectivelyExhaustive,
            warnings,
            suggestions,
        };
    }

    /**
     * Find potentially overlapping terms
     */
    private findOverlappingTerms(labels: string[]): string[] {
        const overlaps: string[] = [];
        const words = labels.flatMap(l => l.split(/\s+/));
        const wordCounts = new Map<string, number>();

        for (const word of words) {
            if (word.length > 3) { // Skip short words
                wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
            }
        }

        for (const [word, count] of wordCounts) {
            if (count > 1) {
                overlaps.push(word);
            }
        }

        return overlaps;
    }

    /**
     * Update MECE warning on a parent node
     */
    private async validateAndUpdateMeceWarning(parentId: string): Promise<void> {
        try {
            const validation = await this.validateMece(parentId);
            const warning = validation.warnings.length > 0
                ? validation.warnings.join('; ')
                : null;

            await prisma.issueTreeNode.update({
                where: { id: parentId },
                data: { aiMeceWarning: warning },
            });
        } catch {
            // Ignore validation errors
        }
    }

    /**
     * Link node to live data source
     */
    async linkToDataSource(
        nodeId: string,
        dataSourceType: DataSourceType,
        query: string
    ): Promise<IssueTreeNode> {
        return prisma.issueTreeNode.update({
            where: { id: nodeId },
            data: {
                dataSourceType,
                dataSourceQuery: query,
            },
        });
    }

    /**
     * Refresh live data for a node
     */
    async refreshLiveData(nodeId: string, organizationId: string): Promise<IssueTreeNode> {
        const node = await prisma.issueTreeNode.findUnique({
            where: { id: nodeId },
        });

        if (!node || !node.dataSourceType) {
            throw new Error('Node not found or no data source configured');
        }

        let liveValue: number | null = null;

        switch (node.dataSourceType) {
            case 'UNIT_ECONOMICS': {
                const economics = await prisma.dailyUnitEconomics.findFirst({
                    where: { organizationId },
                    orderBy: { date: 'desc' },
                });
                if (economics && node.dataSourceQuery) {
                    const field = node.dataSourceQuery as keyof typeof economics;
                    const value = economics[field];
                    if (typeof value === 'number' || (value !== null && value !== undefined)) {
                        liveValue = Number(value);
                    }
                }
                break;
            }

            case 'VELOCITY': {
                const pitches = await prisma.productionPitch.findMany({
                    where: { organizationId, status: 'COMPLETED' },
                    orderBy: { endTime: 'desc' },
                    take: 5,
                    include: { tasks: { where: { status: 'DONE' } } },
                });
                liveValue = pitches.length > 0
                    ? pitches.reduce((sum, p) => sum + p.tasks.reduce((s, t) => s + t.storyPoints, 0), 0) / pitches.length
                    : null;
                break;
            }

            case 'REVENUE': {
                const transactions = await prisma.transaction.findMany({
                    where: {
                        organizationId,
                        category: 'REVENUE',
                        date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                    },
                });
                liveValue = transactions.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
                break;
            }
        }

        return prisma.issueTreeNode.update({
            where: { id: nodeId },
            data: {
                liveValue,
                lastRefreshed: new Date(),
            },
        });
    }

    /**
     * Get all trees for organization
     */
    async getTreesForOrg(organizationId: string): Promise<IssueTree[]> {
        return prisma.issueTree.findMany({
            where: { organizationId },
            orderBy: { updatedAt: 'desc' },
        });
    }

    /**
     * Delete a tree
     */
    async deleteTree(treeId: string): Promise<void> {
        await prisma.issueTree.delete({
            where: { id: treeId },
        });
    }
}

export const issueTreeService = new IssueTreeService();
