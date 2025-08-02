import React, { useState, ChangeEvent } from 'react';
import { createToken, createCharge } from '../services/paymentService';

interface PaymentFormProps {
  onSuccess?: () => void;
}

interface FormData {
  number: string;
  exp_month: string;
  exp_year: string;
  cvc: string;
  name: string;
  country: string;
  line1: string;
  city: string;
  street: string;
  avenue: string;
  client_ip: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  phone_country_code: string;
  phone_number: string;
}

interface FormErrors {
  [key: string]: string | undefined;
}

interface FormStatus {
  loading: boolean;
  message: string;
  error: boolean;
}

interface InputFieldProps {
  label: string;
  name: keyof FormData;
  type?: string;
  placeholder?: string;
  required?: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  value: string;
  error?: string;
}

const InputField: React.FC<InputFieldProps> = ({ label, name, type = "text", placeholder, required = true, onChange, value, error }) => {
  const handleInputValidation = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    let validatedValue = inputValue;

    switch (name) {
      case 'number':
        // Only allow numbers and spaces for card number
        validatedValue = inputValue.replace(/[^\d\s]/g, '');
        // Limit to 19 characters (16 digits + 3 spaces)
        validatedValue = validatedValue.slice(0, 19);
        break;
      case 'exp_month':
        // Only allow numbers, max 2 digits
        validatedValue = inputValue.replace(/\D/g, '').slice(0, 2);
        break;
      case 'exp_year':
        // Only allow numbers, max 4 digits
        validatedValue = inputValue.replace(/\D/g, '').slice(0, 4);
        break;
      case 'cvc':
        // Only allow numbers, max 3 digits
        validatedValue = inputValue.replace(/\D/g, '').slice(0, 3);
        break;
      case 'phone_country_code':
        // Only allow numbers and plus sign
        validatedValue = inputValue.replace(/[^\d+]/g, '').slice(0, 4);
        break;
      case 'phone_number':
        // Only allow numbers and hyphens
        validatedValue = inputValue.replace(/[^\d-]/g, '').slice(0, 15);
        break;
      case 'name':
      case 'first_name':
      case 'middle_name':
      case 'last_name':
        // Only allow letters, spaces, and hyphens for names
        validatedValue = inputValue.replace(/[^a-zA-Z\s-]/g, '');
        break;
      case 'email':
        // Allow email characters
        validatedValue = inputValue.toLowerCase();
        break;
      default:
        validatedValue = inputValue;
    }

    // Set the input value directly
    e.target.value = validatedValue;
    onChange(e);
  };

  const getInputType = () => {
    switch (name) {
      case 'number':
      case 'exp_month':
      case 'exp_year':
      case 'cvc':
      case 'phone_country_code':
      case 'phone_number':
        return 'tel'; // Better mobile experience for number inputs
      case 'email':
        return 'email';
      default:
        return type;
    }
  };

  return (
    <div className="relative w-full  mb-4">
      <input
        type={getInputType()}
        name={name}
        value={value}
        onChange={handleInputValidation}
        required={required}
        placeholder={placeholder}
        className={`w-full px-4 py-3  text-sm text-gray-900 placeholder-gray-400 border rounded-lg focus:outline-none transition-all duration-200 bg-white ${
          error ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-black'
        }`}
        autoComplete={name === 'number' ? 'cc-number' : 
                     name === 'exp_month' || name === 'exp_year' ? 'cc-exp' :
                     name === 'cvc' ? 'cc-csc' :
                     name === 'name' ? 'cc-name' :
                     name === 'email' ? 'email' :
                     'off'}
      />
      <label className="absolute border  -top-2.5 left-2 bg-white px-2 text-xs text-gray-600">{label}</label>
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
};

const LoadingSpinner = () => (
  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"/>
);

const validateCardNumber = (number: string): boolean => {
  const cleaned = number.replace(/\s/g, '');
  // Check for exact 16 digits and Luhn algorithm
  if (!/^\d{16}$/.test(cleaned)) return false;
  
  // Luhn algorithm implementation
  let sum = 0;
  let isEven = false;
  
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
};

const validateCVV = (cvv: string): boolean => {
  // Exactly 3 digits
  return /^\d{3}$/.test(cvv);
};

const validateExpMonth = (month: string): boolean => {
  // Must be 2 digits, between 01-12
  return /^(0[1-9]|1[0-2])$/.test(month);
};

const validateExpYear = (year: string): boolean => {
  const currentYear = new Date().getFullYear();
  // Must be 4 digits
  if (!/^\d{4}$/.test(year)) return false;
  
  const num = parseInt(year, 10);
  return num >= currentYear && num <= currentYear + 10;
};

const validateEmail = (email: string): boolean => {
  // More comprehensive email validation
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

const validatePhone = (countryCode: string, number: string): boolean => {
  // Validate country code format (+1 to +999)
  const validCountryCode = /^\+\d{1,3}$/.test(countryCode);
  
  // Clean the phone number (allow only digits and hyphens)
  const cleanedNumber = number.replace(/[^\d-]/g, '');
  const digitsOnly = cleanedNumber.replace(/-/g, '');
  
  // Check if the number has 8-15 digits and proper formatting
  const validNumber = /^[\d-]{8,20}$/.test(cleanedNumber) && digitsOnly.length >= 8 && digitsOnly.length <= 15;
  
  return validCountryCode && validNumber;
};

const PaymentForm: React.FC<PaymentFormProps> = ({ onSuccess }) => {
  const [form, setForm] = useState<FormData>({
    number: '',
    exp_month: '',
    exp_year: '',
    cvc: '',
    name: '',
    country: '',
    line1: '',
    city: '',
    street: '',
    avenue: '',
    client_ip: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    phone_country_code: '',
    phone_number: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<FormStatus>({ loading: false, message: '', error: false });
  const [activeStep, setActiveStep] = useState(1);

  const validateStep1 = () => {
    const newErrors: FormErrors = {};
    
    if (!validateCardNumber(form.number)) {
      newErrors.number = 'Card number must be 16 digits';
    }
    if (!validateCVV(form.cvc)) {
      newErrors.cvc = 'CVV must be 3 digits';
    }
    if (!validateExpMonth(form.exp_month)) {
      newErrors.exp_month = 'Enter a valid month (01-12)';
    }
    if (!validateExpYear(form.exp_year)) {
      newErrors.exp_year = 'Enter a valid 4-digit year';
    }
    if (!form.name.trim()) {
      newErrors.name = 'Name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: FormErrors = {};
    
    if (!form.country.trim()) newErrors.country = 'Country is required';
    if (!form.line1.trim()) newErrors.line1 = 'Address is required';
    if (!form.city.trim()) newErrors.city = 'City is required';
    if (!form.street.trim()) newErrors.street = 'Street is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors: FormErrors = {};
    
    if (!form.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!form.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (!validateEmail(form.email)) newErrors.email = 'Enter a valid email';
    if (!validatePhone(form.phone_country_code, form.phone_number)) {
      newErrors.phone_number = 'Enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStepChange = (nextStep:any) => {
    let canProceed = true;
    
    if (nextStep > activeStep) {
      switch (activeStep) {
        case 1:
          canProceed = validateStep1();
          break;
        case 2:
          canProceed = validateStep2();
          break;
        case 3:
          canProceed = validateStep3();
          break;
      }
    }

    if (canProceed) {
      setActiveStep(nextStep);
      setErrors({});
    }
  };

  const formatCardNumber = (value:any) => {
    const cleaned = value.replace(/\s/g, '');
    const chunks = cleaned.match(/.{1,4}/g) || [];
    return chunks.join(' ');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // Apply special formatting for card number
    if (name === 'number') {
      formattedValue = formatCardNumber(value);
    }

    setForm(prev => ({ ...prev, [name]: formattedValue }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate all steps before submission
    const step1Valid = validateStep1();
    const step2Valid = validateStep2();
    const step3Valid = validateStep3();

    if (!step1Valid || !step2Valid || !step3Valid) {
      setStatus({ loading: false, message: 'Please complete all required fields correctly.', error: true });
      return;
    }

    setStatus({ loading: true, message: 'Processing payment...', error: false });

    try {
      const tokenResponse = await createToken(form);
      const tokenId = tokenResponse?.id;

      if (!tokenId) throw new Error("Token ID not returned");

      const chargeResponse = await createCharge(tokenId, form);
      setStatus({ loading: false, message: 'Payment successful! 🎉', error: false });
      
      // If payment is successful and onSuccess callback is provided, call it
      if (chargeResponse && onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500); // Give user time to see success message
      }
      console.log("Charge succeeded:", chargeResponse);
    } catch (error: any) {
      console.error("Payment error:", error);
      setStatus({ loading: false, message: (error && typeof error === 'object' && 'message' in error) ? error.message : 'Payment failed. Please try again.', error: true });
    }
  };

  return (
    <div className=" bg-gray-50     ">
      <div className="max-w-md w-full mx-auto space-y-8  ">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Secure Payment
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Complete your payment securely with our encrypted payment system
          </p>
        </div>

        

        <form onSubmit={handleSubmit} className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow-sm">
          {activeStep === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Card Information</h3>
              <InputField 
                label="Card Number" 
                name="number" 
                placeholder="1234 5678 9012 3456" 
                onChange={handleChange} 
                value={form.number}
                error={errors.number}
              />
              <div className="grid grid-cols-3 gap-4">
                <InputField 
                  label="Month" 
                  name="exp_month" 
                  placeholder="MM" 
                  onChange={handleChange} 
                  value={form.exp_month}
                  error={errors.exp_month}
                />
                <InputField 
                  label="Year" 
                  name="exp_year" 
                  placeholder="YYYY" 
                  onChange={handleChange} 
                  value={form.exp_year}
                  error={errors.exp_year}
                />
                <InputField 
                  label="CVC" 
                  name="cvc" 
                  placeholder="123" 
                  onChange={handleChange} 
                  value={form.cvc}
                  error={errors.cvc}
                />
              </div>
              <InputField 
                label="Cardholder Name" 
                name="name" 
                placeholder="John Doe" 
                onChange={handleChange} 
                value={form.name}
                error={errors.name}
              />
              <button
                type="button"
                onClick={() => handleStepChange(2)}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-900 focus:outline-none transition-all duration-200"
              >
                Continue to Address
              </button>
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Address Details</h3>
              <InputField 
                label="Country" 
                name="country" 
                onChange={handleChange} 
                value={form.country}
                error={errors.country}
              />
              <InputField 
                label="Address Line 1" 
                name="line1" 
                onChange={handleChange} 
                value={form.line1}
                error={errors.line1}
              />
              <InputField 
                label="City" 
                name="city" 
                onChange={handleChange} 
                value={form.city}
                error={errors.city}
              />
              <InputField 
                label="Street" 
                name="street" 
                onChange={handleChange} 
                value={form.street}
                error={errors.street}
              />
              <InputField 
                label="Avenue" 
                name="avenue" 
                onChange={handleChange} 
                value={form.avenue}
                required={false}
              />
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => handleStepChange(1)}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-all duration-200"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => handleStepChange(3)}
                  className="flex-1 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-900 focus:outline-none transition-all duration-200"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <InputField 
                  label="First Name" 
                  name="first_name" 
                  onChange={handleChange} 
                  value={form.first_name}
                  error={errors.first_name}
                />
                <InputField 
                  label="Last Name" 
                  name="last_name" 
                  onChange={handleChange} 
                  value={form.last_name}
                  error={errors.last_name}
                />
              </div>
              <InputField 
                label="Middle Name" 
                name="middle_name" 
                required={false} 
                onChange={handleChange} 
                value={form.middle_name}
              />
              <InputField 
                label="Email" 
                name="email" 
                type="email" 
                onChange={handleChange} 
                value={form.email}
                error={errors.email}
              />
              <div className="grid grid-cols-2 gap-4">
                <InputField 
                  label="Country Code" 
                  name="phone_country_code" 
                  placeholder="+1" 
                  onChange={handleChange} 
                  value={form.phone_country_code}
                  error={errors.phone_country_code}
                />
                <InputField 
                  label="Phone Number" 
                  name="phone_number" 
                  onChange={handleChange} 
                  value={form.phone_number}
                  error={errors.phone_number}
                />
              </div>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => handleStepChange(2)}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-all duration-200"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={status.loading}
                  className="flex-1 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-900 focus:outline-none transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {status.loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <LoadingSpinner />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    'Complete Payment'
                  )}
                </button>
              </div>
            </div>
          )}
        </form>

        {status.message && (
          <div className={`mt-4 p-4 rounded-md ${
            status.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          } transition-all duration-200 animate-fadeIn`}>
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentForm;
