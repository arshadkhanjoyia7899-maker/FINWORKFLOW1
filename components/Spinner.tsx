import React from 'react';

export const Spinner: React.FC = () => (
    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" role="status">
        <span className="sr-only">Loading...</span>
    </div>
);