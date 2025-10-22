import React, { useState } from 'react';
import { FlaggedTransaction } from '../types';
import { AlertIcon } from './icons/AlertIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';

interface ResultsLogProps {
    flaggedTransactions: FlaggedTransaction[];
}

const getReasonChipColor = (type: 'Budget' | 'Rule' | 'AI') => {
    switch (type) {
        case 'Budget': return 'bg-danger-light text-danger';
        case 'Rule': return 'bg-warning-light text-warning';
        case 'AI': return 'bg-ai-light text-ai';
        default: return 'bg-base text-text-secondary';
    }
};

const LogItem: React.FC<{ item: FlaggedTransaction }> = ({ item }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { transaction, reasons, alerts } = item;

    return (
         <div className="border-b border-subtle-border last:border-b-0">
            <button
                className="w-full flex justify-between items-center py-4 text-left"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <div className="flex-1 grid grid-cols-3 items-center">
                    <span className="font-medium">{transaction.vendor}</span>
                    <span className="text-text-secondary">{transaction.date}</span>
                    <span className="text-danger font-mono justify-self-end">{transaction.amount_SAR.toFixed(2)} SAR</span>
                </div>
                <ChevronRightIcon className={`w-5 h-5 ml-4 text-text-secondary transform transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>
            {isOpen && (
                <div className="pb-4 px-1">
                    <p className="text-sm text-text-secondary mb-3">Description: {transaction.description}</p>
                    
                    <div className="mb-4">
                        <h4 className="font-semibold text-xs text-text-secondary uppercase tracking-wider mb-2">Reasons for Flagging</h4>
                        <div className="flex flex-wrap gap-2">
                            {reasons.map((reason, index) => (
                                <div key={index} className={`px-2 py-1 text-xs font-medium rounded-md ${getReasonChipColor(reason.type)}`}>
                                    <strong>{reason.type}:</strong> {reason.detail}
                                </div>
                            ))}
                        </div>
                    </div>

                    {alerts && (
                         <div>
                            <h4 className="font-semibold text-xs text-text-secondary uppercase tracking-wider mb-2">Generated Alerts</h4>
                            <div className="grid sm:grid-cols-2 gap-3 text-sm">
                                <div className="bg-base p-3 rounded-lg">
                                    <p className="font-semibold mb-1 text-text">English</p>
                                    <p className="text-text-secondary">{alerts.english}</p>
                                </div>
                                <div className="bg-base p-3 rounded-lg" dir="rtl">
                                    <p className="font-semibold mb-1 text-text">العربية</p>
                                    <p className="text-text-secondary">{alerts.arabic}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


export const ResultsLog: React.FC<ResultsLogProps> = ({ flaggedTransactions }) => {
    if (flaggedTransactions.length === 0) {
        return (
            <div className="text-center py-12 bg-green-50 rounded-xl">
                <h2 className="text-xl font-semibold text-success">All Clear!</h2>
                <p className="mt-2 text-text-secondary">No transactions were flagged during the process.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="space-y-1">
                {flaggedTransactions.map(item => (
                    <LogItem key={item.transaction.id} item={item} />
                ))}
            </div>
        </div>
    );
};