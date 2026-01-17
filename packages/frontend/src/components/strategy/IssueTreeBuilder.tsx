/**
 * MECE Issue Tree Builder
 * Interactive Policy Analysis Tool
 */

import { useState, useEffect } from 'react';
import {
    GitBranch, Plus, Trash2, Lightbulb
} from 'lucide-react';
import { strategyApi } from '../../services/api';

interface IssueNode {
    id: string;
    label: string;
    hypothesis?: string;
    type?: string;
    children?: IssueNode[];
    dataSourceType?: string;
    dataSourceQuery?: string;
}

interface IssueTree {
    id: string;
    title: string;
    rootQuestion: string;
    treeType: string;
}

export function IssueTreeBuilder() {
    const [trees, setTrees] = useState<IssueTree[]>([]);
    const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'LIST' | 'EDITOR'>('LIST');

    useEffect(() => {
        loadTrees();
    }, []);

    const loadTrees = async () => {
        // Mock ID for now
        const result = await strategyApi.getTrees('org-1');
        if (result.success && result.data) {
            setTrees(result.data);
        }
    };

    const handleCreateTree = async (title: string, rootQuestion: string) => {
        const result = await strategyApi.createTree({
            organizationId: 'org-1',
            title,
            rootQuestion,
            treeType: 'ISSUE'
        });
        if (result.success && result.data) {
            await loadTrees();
            setSelectedTreeId(result.data.id);
            setViewMode('EDITOR');
        }
    };

    return (
        <div className="issue-tree-builder h-full">
            {viewMode === 'LIST' ? (
                <TreeListView
                    trees={trees}
                    onSelect={(id: string) => { setSelectedTreeId(id); setViewMode('EDITOR'); }}
                    onCreate={handleCreateTree}
                />
            ) : (
                <TreeEditor
                    treeId={selectedTreeId!}
                    onBack={() => setViewMode('LIST')}
                />
            )}
        </div>
    );
}

function TreeListView({ trees, onSelect, onCreate }: any) {
    const [newTitle, setNewTitle] = useState('');
    const [newQuestion, setNewQuestion] = useState('');

    return (
        <div className="p-xl max-w-4xl mx-auto">
            <h2 className="mb-xl flex items-center gap-md">
                <GitBranch className="text-accent" />
                Issue Trees
            </h2>

            <div className="grid-2 gap-xl mb-xl">
                {/* Create New */}
                <div className="card p-lg border-dashed">
                    <h3 className="mb-md">Start New Analysis</h3>
                    <div className="flex-col gap-md">
                        <input
                            placeholder="Analysis Title (e.g. Profitability Decline)"
                            className="input"
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                        />
                        <input
                            placeholder="Root Question (e.g. Why is profit down?)"
                            className="input"
                            value={newQuestion}
                            onChange={e => setNewQuestion(e.target.value)}
                        />
                        <button
                            className="btn btn-primary"
                            disabled={!newTitle || !newQuestion}
                            onClick={() => onCreate(newTitle, newQuestion)}
                        >
                            <Plus size={16} className="mr-sm" />
                            Create Tree
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="flex-col gap-md">
                    {trees.map((t: IssueTree) => (
                        <div
                            key={t.id}
                            className="card p-md cursor-pointer hover:bg-secondary transition-colors"
                            onClick={() => onSelect(t.id)}
                        >
                            <div className="font-bold mb-xs">{t.title}</div>
                            <div className="text-sm text-muted">{t.rootQuestion}</div>
                        </div>
                    ))}
                    {trees.length === 0 && (
                        <div className="text-center text-muted p-lg">No trees found. Create one to begin.</div>
                    )}
                </div>
            </div>
        </div>
    );
}

function TreeEditor({ treeId, onBack }: { treeId: string; onBack: () => void }) {
    const [root, setRoot] = useState<IssueNode | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHierarchy();
    }, [treeId]);

    const loadHierarchy = async () => {
        setLoading(true);
        const result = await strategyApi.getHierarchy(treeId);
        if (result.success && result.data) {
            setRoot(result.data);
        }
        setLoading(false);
    };

    const handleAddChild = async (parentId: string, label: string) => {
        const result = await strategyApi.addNode({
            treeId,
            parentId,
            label,
            hypothesis: ''
        });
        if (result.success) loadHierarchy();
    };

    const handleDeleteNode = async (nodeId: string) => {
        if (!confirm('Delete this branch?')) return;
        await strategyApi.deleteNode(nodeId);
        loadHierarchy();
    };

    if (loading) return <div className="p-xl text-center">Loading Tree...</div>;
    if (!root) return <div className="p-xl text-center">Tree not found</div>;

    return (
        <div className="h-full flex flex-col">
            <div className="p-md border-b flex items-center gap-md">
                <button onClick={onBack} className="btn btn-ghost text-sm">← Back</button>
                <h3 className="font-bold">{root.label}</h3> {/* Tree Title usually mapping to Root Label if normalized */}
            </div>

            <div className="flex-1 overflow-auto p-xl bg-tertiary">
                <div className="flex justify-center">
                    <TreeNodeView
                        node={root}
                        isRoot={true}
                        onAdd={handleAddChild}
                        onDelete={handleDeleteNode}
                    />
                </div>
            </div>
        </div>
    );
}

function TreeNodeView({ node, isRoot, onAdd, onDelete }: any) {
    const [expanded, setExpanded] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newLabel, setNewLabel] = useState('');

    const children = node.children || [];

    const submitAdd = () => {
        if (newLabel.trim()) {
            onAdd(node.id, newLabel);
            setNewLabel('');
            setIsAdding(false);
            setExpanded(true);
        }
    };

    return (
        <div className="flex flex-col items-center">
            {/* Node Card */}
            <div className={`
                relative p-md rounded-lg shadow-sm border transition-all
                ${isRoot ? 'bg-primary text-white border-primary w-64' : 'bg-secondary border-border w-56'}
                hover:shadow-md mb-lg z-10
            `}>
                {!isRoot && (
                    <div className="absolute -top-4 left-1/2 -ml-px w-px h-4 bg-border" />
                )}

                <div className="flex justify-between items-start mb-xs">
                    <span className="font-medium text-sm">{node.label}</span>
                    {!isRoot && (
                        <button
                            onClick={() => onDelete(node.id)}
                            className="text-muted hover:text-red opacity-0 hover:opacity-100 transition-opacity"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>

                {node.hypothesis && (
                    <div className="text-xs opacity-80 flex gap-xs items-center mt-xs bg-black/10 p-xs rounded">
                        <Lightbulb size={12} />
                        {node.hypothesis}
                    </div>
                )}

                {/* Actions */}
                <div className="mt-sm flex justify-center pt-sm border-t border-white/10">
                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className="btn btn-xs btn-ghost hover:bg-white/10"
                        title="Add Branch"
                    >
                        <Plus size={14} />
                    </button>
                </div>
            </div>

            {/* Add Child Input */}
            {isAdding && (
                <div className="mb-lg flex gap-xs animate-in fade-in slide-in-from-top-2">
                    <input
                        className="input input-sm w-40"
                        autoFocus
                        placeholder="New Branch..."
                        value={newLabel}
                        onChange={e => setNewLabel(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && submitAdd()}
                    />
                    <button onClick={submitAdd} className="btn btn-xs btn-primary">Add</button>
                </div>
            )}

            {/* Children Container */}
            {expanded && children.length > 0 && (
                <div className="relative flex gap-lg pt-4 border-t border-border">
                    {/* Connector Line to Parent */}
                    <div className="absolute top-0 left-1/2 -ml-px w-px h-4 bg-border" />

                    {children.map((child: IssueNode) => (
                        <TreeNodeView
                            key={child.id}
                            node={child}
                            onAdd={onAdd}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
