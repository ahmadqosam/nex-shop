"use client";

import React from 'react';
import { CheckoutState } from '../../types/checkout';
import { 
  Store, 
  Truck, 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  CreditCard, 
  Lock,
  ChevronRight
} from 'lucide-react';

interface Props {
  formData: CheckoutState;
  onUpdate: <K extends keyof CheckoutState>(field: K, value: CheckoutState[K]) => void;
}

const CheckoutForm: React.FC<Props> = ({ formData, onUpdate }) => {
  return (
    <div className="space-y-12 pb-12">
      {/* 1. Contact Information */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-xl font-bold text-black">1. Contact Information</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">First Name</label>
            <input 
              type="text" 
              placeholder="e.g. Eduard"
              value={formData.firstName}
              onChange={(e) => onUpdate('firstName', e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none text-black placeholder:text-gray-300"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Last Name</label>
            <input 
              type="text" 
              placeholder="e.g. Franz"
              value={formData.lastName}
              onChange={(e) => onUpdate('lastName', e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none text-black placeholder:text-gray-300"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Phone</label>
            <div className="relative">
              <input 
                type="text" 
                value={formData.phone}
                onChange={(e) => onUpdate('phone', e.target.value)}
                className="w-full pl-12 pr-10 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none text-black"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <img src="https://flagcdn.com/w20/us.png" className="w-5 h-3.5" alt="US" />
              </div>
              <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">E-mail</label>
            <input 
              type="email" 
              value={formData.email}
              onChange={(e) => onUpdate('email', e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-500 rounded-xl cursor-not-allowed outline-none"
              readOnly
            />
          </div>
        </div>
      </section>

      {/* 2. Delivery Method */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-xl font-bold text-black font-sans">2. Delivery Method</span>
        </div>

        <div className="flex gap-4 mb-8">
          <button 
            type="button"
            onClick={() => onUpdate('deliveryMethod', 'store')}
            className={`flex items-center gap-3 px-8 py-4 rounded-xl font-semibold border transition-all ${
              formData.deliveryMethod === 'store' 
              ? 'bg-black text-white border-black' 
              : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Store className="w-5 h-5" />
            Store
          </button>
          <button 
            type="button"
            onClick={() => onUpdate('deliveryMethod', 'delivery')}
            className={`flex items-center gap-3 px-8 py-4 rounded-xl font-semibold border transition-all ${
              formData.deliveryMethod === 'delivery' 
              ? 'bg-[#3B7BFF] text-white border-[#3B7BFF] shadow-lg shadow-blue-100' 
              : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Truck className="w-5 h-5" />
            Delivery
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Delivery Date</label>
            <div className="relative">
              <input 
                type="date" 
                value={formData.deliveryDate}
                onChange={(e) => onUpdate('deliveryDate', e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-black"
              />
              <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Convenient Time</label>
            <div className="relative">
              <select 
                value={formData.convenientTime}
                onChange={(e) => onUpdate('convenientTime', e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all appearance-none outline-none text-black"
              >
                <option>9 am - 12 pm</option>
                <option>1 pm - 6 pm</option>
                <option>7 pm - 10 pm</option>
              </select>
              <Clock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
          <div className="space-y-1.5 md:col-span-4">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">City</label>
            <div className="relative h-12">
              <select 
                value={formData.city}
                onChange={(e) => onUpdate('city', e.target.value)}
                className="w-full h-full px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all appearance-none outline-none text-black"
              >
                <option>New Jersey</option>
                <option>New York</option>
                <option>California</option>
                <option>Texas</option>
              </select>
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none transform rotate-90" />
            </div>
          </div>
          <div className="space-y-1.5 md:col-span-5">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Address</label>
            <div className="relative h-12">
              <input 
                type="text" 
                placeholder="2464 Royal Ln. Mesa"
                value={formData.address}
                onChange={(e) => onUpdate('address', e.target.value)}
                className="w-full h-full px-4 pr-10 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none text-black placeholder:text-gray-300"
              />
              <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>
          <div className="space-y-1.5 md:col-span-3">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Zip Code</label>
            <div className="h-12">
              <input 
                type="text" 
                placeholder="45463"
                value={formData.zipCode}
                onChange={(e) => onUpdate('zipCode', e.target.value)}
                className="w-full h-full px-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none text-black placeholder:text-gray-300"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Payment Method */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-xl font-bold text-black font-sans">3. Payment Method</span>
        </div>

        <div className="flex flex-wrap gap-4 mb-8">
          <button 
            type="button"
            onClick={() => onUpdate('paymentMethod', 'card')}
            className={`flex items-center justify-center p-4 min-w-[120px] rounded-xl border transition-all ${
              formData.paymentMethod === 'card' 
              ? 'border-[#3B7BFF] bg-white ring-2 ring-blue-50 shadow-sm' 
              : 'bg-white border-gray-200 grayscale opacity-50 hover:opacity-100 hover:grayscale-0'
            }`}
          >
            <div className="flex items-center gap-2">
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-4" alt="Visa" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-5" alt="Mastercard" />
            </div>
          </button>
          
          <button 
            type="button"
            onClick={() => onUpdate('paymentMethod', 'apple')}
            className={`flex items-center justify-center p-4 min-w-[120px] rounded-xl border transition-all ${
              formData.paymentMethod === 'apple' 
              ? 'border-[#3B7BFF] bg-white ring-2 ring-blue-50 shadow-sm' 
              : 'bg-white border-gray-200 grayscale opacity-50 hover:opacity-100 hover:grayscale-0'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-black">
              <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" className="h-5" alt="Apple" />
              <span>Pay</span>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => onUpdate('paymentMethod', 'other')}
            className={`flex items-center justify-center px-8 py-4 min-w-[120px] rounded-xl border transition-all uppercase text-xs font-bold tracking-widest ${
              formData.paymentMethod === 'other' 
              ? 'border-[#3B7BFF] bg-white ring-2 ring-blue-50 shadow-sm' 
              : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Other
          </button>
        </div>

        {/* Card Details Section - Only visible if 'card' is selected */}
        {formData.paymentMethod === 'card' && (
          <div className="p-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm space-y-6 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold uppercase tracking-wider text-gray-900 font-sans">Credit Card Details</h4>
              <Lock className="w-4 h-4 text-gray-300" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Card Number</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="0000 0000 0000 0000"
                  value={formData.cardNumber}
                  onChange={(e) => onUpdate('cardNumber', e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                  maxLength={19}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all font-mono outline-none text-black placeholder:text-gray-300"
                />
                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Expiry Date</label>
                <input 
                  type="text" 
                  placeholder="MM / YY"
                  value={formData.cardExpiry}
                  onChange={(e) => onUpdate('cardExpiry', e.target.value)}
                  maxLength={5}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all font-mono text-center outline-none text-black placeholder:text-gray-300"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">CVV</label>
                <input 
                  type="password" 
                  placeholder="***"
                  value={formData.cardCvv}
                  onChange={(e) => onUpdate('cardCvv', e.target.value)}
                  maxLength={4}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all font-mono text-center outline-none text-black placeholder:text-gray-300"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Cardholder Name</label>
              <input 
                type="text" 
                placeholder="name on card"
                value={formData.cardHolder}
                onChange={(e) => onUpdate('cardHolder', e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all font-medium placeholder:text-gray-300 outline-none text-black"
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default CheckoutForm;
