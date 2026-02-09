import React from 'react';
import { Loader2 } from 'lucide-react';

const OrderProcessing: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
      <div className="bg-white p-12 rounded-[2.5rem] shadow-2xl flex flex-col items-center text-center max-w-sm mx-4 border border-gray-100">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6">
          <Loader2 className="w-8 h-8 text-black animate-spin" />
        </div>
        <h2 className="text-2xl font-bold text-black mb-2">Processing Order</h2>
        <p className="text-gray-500">Please wait while we secure your inventory...</p>
      </div>
    </div>
  );
};

export default OrderProcessing;
