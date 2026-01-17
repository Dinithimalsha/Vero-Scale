/**
 * Live Ledger Dashboard - Financial Transaction Management
 * Transaction categorization, COGS/OPEX split, and Gross Margin calculation
 */

import React, { useState } from 'react';
import {
    DollarSign,
    TrendingDown,
    FileText,
    Download,
    Search,
    ArrowUpRight,
    ArrowDownRight,
    PieChart,
    Calendar,
    RefreshCw,
} from 'lucide-react';
import './LedgerDashboard.css';

interface Transaction {
    id: string;
    date: Date;
    description: string;
    amount: number;
    category: 'REVENUE' | 'COGS' | 'OPEX' | 'PAYROLL' | 'TAX' | 'OTHER';
    costType?: 'DIRECT' | 'INDIRECT';
    isRecurring: boolean;
}

// Mock data
const MOCK_TRANSACTIONS: Transaction[] = [
    { id: '1', date: new Date('2026-01-15'), description: 'Enterprise subscription - Acme Corp', amount: 15000, category: 'REVENUE', isRecurring: true },
    { id: '2', date: new Date('2026-01-14'), description: 'AWS Infrastructure', amount: -4500, category: 'COGS', costType: 'DIRECT', isRecurring: true },
    { id: '3', date: new Date('2026-01-14'), description: 'Engineering salaries', amount: -45000, category: 'PAYROLL', isRecurring: true },
    { id: '4', date: new Date('2026-01-13'), description: 'SMB subscription - TechStart', amount: 2500, category: 'REVENUE', isRecurring: true },
    { id: '5', date: new Date('2026-01-12'), description: 'Marketing - Google Ads', amount: -3200, category: 'OPEX', costType: 'INDIRECT', isRecurring: false },
    { id: '6', date: new Date('2026-01-11'), description: 'Datadog monitoring', amount: -800, category: 'COGS', costType: 'DIRECT', isRecurring: true },
    { id: '7', date: new Date('2026-01-10'), description: 'Professional services', amount: 8000, category: 'REVENUE', isRecurring: false },
];

const GROSS_MARGIN = {
    revenue: 125000,
    cogs: 28500,
    grossProfit: 96500,
    grossMarginPercent: 77.2,
    target: 75,
};

const CATEGORY_COLORS: Record<string, string> = {
    REVENUE: '#22c55e',
    COGS: '#f97316',
    OPEX: '#6366f1',
    PAYROLL: '#8b5cf6',
    TAX: '#ef4444',
    OTHER: '#64748b',
};

export const LedgerDashboard: React.FC = () => {
    const [transactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

    const filteredTransactions = transactions.filter(t => {
        const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'ALL' || t.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const totalRevenue = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));

    return (
        <div className="ledger-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div className="header-left">
                    <h1 className="page-title">
                        <FileText size={24} />
                        Live Ledger
                    </h1>
                    <div className="sync-status">
                        <RefreshCw size={14} />
                        Last sync: 2 min ago
                    </div>
                </div>

                <div className="header-actions">
                    <button className="btn btn-secondary">
                        <Download size={16} />
                        Export
                    </button>
                    <button className="btn btn-primary">
                        <DollarSign size={16} />
                        Add Transaction
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="summary-grid">
                <div className="summary-card revenue">
                    <div className="card-header">
                        <span className="card-label">Total Revenue</span>
                        <ArrowUpRight size={18} className="trend-icon up" />
                    </div>
                    <span className="card-value">${totalRevenue.toLocaleString()}</span>
                    <span className="card-change positive">+12.5% vs last month</span>
                </div>

                <div className="summary-card expenses">
                    <div className="card-header">
                        <span className="card-label">Total Expenses</span>
                        <ArrowDownRight size={18} className="trend-icon down" />
                    </div>
                    <span className="card-value">${totalExpenses.toLocaleString()}</span>
                    <span className="card-change negative">+8.2% vs last month</span>
                </div>

                <div className="summary-card gross-margin">
                    <div className="card-header">
                        <span className="card-label">Gross Margin</span>
                        <PieChart size={18} />
                    </div>
                    <div className="margin-display">
                        <span className="card-value">{GROSS_MARGIN.grossMarginPercent}%</span>
                        <div className="margin-ring">
                            <svg viewBox="0 0 36 36">
                                <circle
                                    cx="18"
                                    cy="18"
                                    r="15.91549430918954"
                                    fill="transparent"
                                    stroke="rgba(100, 116, 139, 0.2)"
                                    strokeWidth="3"
                                />
                                <circle
                                    cx="18"
                                    cy="18"
                                    r="15.91549430918954"
                                    fill="transparent"
                                    stroke={GROSS_MARGIN.grossMarginPercent >= GROSS_MARGIN.target ? '#22c55e' : '#f97316'}
                                    strokeWidth="3"
                                    strokeDasharray={`${GROSS_MARGIN.grossMarginPercent} ${100 - GROSS_MARGIN.grossMarginPercent}`}
                                    strokeDashoffset="25"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </div>
                    </div>
                    <span className="card-change">Target: {GROSS_MARGIN.target}%</span>
                </div>

                <div className="summary-card burn-rate">
                    <div className="card-header">
                        <span className="card-label">Monthly Burn</span>
                        <TrendingDown size={18} />
                    </div>
                    <span className="card-value">$53.5K</span>
                    <span className="card-change">18 months runway</span>
                </div>
            </div>

            {/* Category Breakdown */}
            <div className="category-breakdown">
                <h3>Expense Breakdown</h3>
                <div className="category-bars">
                    {Object.entries(
                        transactions
                            .filter(t => t.amount < 0)
                            .reduce((acc, t) => {
                                acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
                                return acc;
                            }, {} as Record<string, number>)
                    ).sort((a, b) => b[1] - a[1]).map(([category, amount]) => (
                        <div key={category} className="category-bar-row">
                            <span className="category-label">
                                <span
                                    className="category-dot"
                                    style={{ background: CATEGORY_COLORS[category] }}
                                />
                                {category}
                            </span>
                            <div className="category-bar-container">
                                <div
                                    className="category-bar"
                                    style={{
                                        width: `${(amount / totalExpenses) * 100}%`,
                                        background: CATEGORY_COLORS[category],
                                    }}
                                />
                            </div>
                            <span className="category-amount">${amount.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Transactions Table */}
            <div className="transactions-panel">
                <div className="panel-header">
                    <h2>Recent Transactions</h2>
                    <div className="table-controls">
                        <div className="search-box">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Search transactions..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <select
                            className="category-select"
                            value={categoryFilter}
                            onChange={e => setCategoryFilter(e.target.value)}
                        >
                            <option value="ALL">All Categories</option>
                            <option value="REVENUE">Revenue</option>
                            <option value="COGS">COGS</option>
                            <option value="OPEX">OPEX</option>
                            <option value="PAYROLL">Payroll</option>
                        </select>
                    </div>
                </div>

                <table className="transactions-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Category</th>
                            <th>Type</th>
                            <th className="amount-col">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.map(tx => (
                            <tr key={tx.id}>
                                <td className="date-cell">
                                    <Calendar size={14} />
                                    {tx.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </td>
                                <td className="description-cell">
                                    {tx.description}
                                    {tx.isRecurring && <span className="recurring-badge">Recurring</span>}
                                </td>
                                <td>
                                    <span
                                        className="category-badge"
                                        style={{ background: `${CATEGORY_COLORS[tx.category]}20`, color: CATEGORY_COLORS[tx.category] }}
                                    >
                                        {tx.category}
                                    </span>
                                </td>
                                <td className="type-cell">{tx.costType || '-'}</td>
                                <td className={`amount-cell ${tx.amount > 0 ? 'positive' : 'negative'}`}>
                                    {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LedgerDashboard;
