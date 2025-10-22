import React from 'react';
import { Transaction } from '../types';

interface TransactionTableProps {
    transactions: Transaction[];
    flaggedTransactionIds: Set<string>;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, flaggedTransactionIds }) => {
    if (transactions.length === 0) {
        return <p className="text-center text-text-secondary mt-4">No transactions loaded yet.</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-text-secondary uppercase">
                    <tr>
                        <th scope="col" className="pb-3 px-4 font-semibold"></th>
                        <th scope="col" className="pb-3 px-4 font-semibold">Date</th>
                        <th scope="col" className="pb-3 px-4 font-semibold">Vendor</th>
                        <th scope="col" className="pb-3 px-4 font-semibold text-right">Amount (SAR)</th>
                        <th scope="col" className="pb-3 px-4 font-semibold">Cost Center</th>
                        <th scope="col" className="pb-3 px-4 font-semibold">Description</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map(tx => {
                        const isFlagged = flaggedTransactionIds.has(tx.id!);
                        return (
                            <tr
                                key={tx.id}
                                className="border-b border-subtle-border last:border-b-0"
                            >
                                <td className="py-4 px-4">
                                    {isFlagged && <span className="block w-2 h-2 bg-warning rounded-full" title="Flagged Transaction"></span>}
                                </td>
                                <td className="py-4 px-4 text-text-secondary whitespace-nowrap">{tx.date}</td>
                                <td className="py-4 px-4 font-medium text-text whitespace-nowrap">{tx.vendor}</td>
                                <td className="py-4 px-4 text-right font-mono">{tx.amount_SAR.toFixed(2)}</td>
                                <td className="py-4 px-4 font-mono text-text-secondary">{tx.cost_center}</td>
                                <td className="py-4 px-4 text-text-secondary max-w-xs truncate">{tx.description}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};