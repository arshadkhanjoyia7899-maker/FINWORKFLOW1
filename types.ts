
export interface Transaction {
    id?: string;
    date: string;
    vendor: string;
    amount_SAR: number;
    cost_center: string;
    description: string;
}

export interface Budget {
    cost_center: string;
    budget_SAR: number;
    period: string;
}

export interface FlagReason {
    type: 'Budget' | 'Rule' | 'AI';
    detail: string;
}

export interface BilingualAlert {
    english: string;
    arabic: string;
}

export interface FlaggedTransaction {
    transaction: Transaction;
    reasons: FlagReason[];
    alerts?: BilingualAlert;
}

export interface AiFlaggedTransaction {
    transaction_id: string;
    reason: string;
    confidence: 'low' | 'medium' | 'high';
}

export enum WorkflowStep {
    LoadData = 1,
    BudgetCheck,
    PolicyCheck,
    GenerateAlerts,
    ReviewLog
}
