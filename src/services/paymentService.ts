import axios from 'axios';

interface CardAddress {
  country: string;
  line1: string;
  city: string;
  street: string;
  avenue: string;
}

interface TokenResponse {
  id: string;
  object: string;
  card: {
    id: string;
    last4: string;
    brand: string;
    exp_month: number;
    exp_year: number;
  };
}

interface ChargeResponse {
  id: string;
  status: string;
  amount: number;
  currency: string;
  paid: boolean;
  captured: boolean;
}

interface TokenPayload {
  card: {
    number: string;
    exp_month: number;
    exp_year: number;
    cvc: number;
    name: string;
    address: CardAddress;
  };
  client_ip: string;
}

interface ChargePayload {
  amount: number;
  currency: string;
  customer_initiated: boolean;
  threeDSecure: boolean;
  save_card: boolean;
  description: string;
  metadata: Record<string, unknown>;
  receipt: {
    email: boolean;
    sms: boolean;
  };
  reference: {
    transaction: string;
    order: string;
  };
  customer: {
    first_name: string;
    middle_name: string | null;
    last_name: string;
    email: string;
    phone: {
      country_code: number;
      number: number;
    };
  };
  merchant: {
    id: string;
  };
  source: {
    id: string;
  };
  post: {
    url: string;
  };
  redirect: {
    url: string;
  };
}

interface TokenFormData {
  number?: string;
  exp_month?: string;
  exp_year?: string;
  cvc?: string;
  name?: string;
  country?: string;
  line1?: string;
  city?: string;
  street?: string;
  avenue?: string;
  client_ip?: string;
}

interface CustomerData {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email?: string;
  phone_country_code?: string;
  phone_number?: string;
}

const API_BASE = 'https://admin.cvaluepro.com/payments';

export const createToken = async (formData: TokenFormData): Promise<TokenResponse> => {
  const payload: TokenPayload = {
    card: {
      number: formData.number?.replace(/\s/g, '') || "0",  // Must be string to avoid precision loss
      exp_month: parseInt(formData.exp_month || "0", 10),
      exp_year: parseInt(formData.exp_year || "0", 10),
      cvc: parseInt(formData.cvc || "0", 10),
      name: formData.name || "",
      address: {
        country: formData.country || "",
        line1: formData.line1 || "",
        city: formData.city || "",
        street: formData.street || "",
        avenue: formData.avenue || ""
      }
    },
    client_ip: formData.client_ip || "127.0.0.1"
  };

  console.debug("Creating token with payload:", payload);
  const response = await axios.post(`${API_BASE}/create-token`, payload);
  console.debug("Token response:", response.data);
  return response.data;
};

export const createCharge = async (
  tokenId: string,
  customerData: CustomerData,
  amount: number // <-- Add amount parameter
): Promise<ChargeResponse> => {
  const payload: ChargePayload = {
    amount, // <-- Use dynamic amount here
    currency: "SAR",
    customer_initiated: true,
    threeDSecure: true,
    save_card: true,
    description: "Test payment transaction",
    metadata: {},
    receipt: {
      email: true,
      sms: true
    },
    reference: {
      transaction: `txn_${Date.now()}`,
      order: `order_${Date.now()}`
    },
    customer: {
      first_name: customerData.first_name || "John",
      middle_name: customerData.middle_name ?? null,
      last_name: customerData.last_name || "Doe",
      email: customerData.email || "john@example.com",
      phone: {
        country_code: parseInt(customerData.phone_country_code || "1"),
        number: parseInt(customerData.phone_number || "1234567890")
      }
    },
    merchant: {
      id: "TS03A2220251556Hb450108197"
    },
    source: {
      id: tokenId
    },
    post: {
      url: "https://example.com/webhook"
    },
    redirect: {
      url: "https://example.com/success"
    }
  };

  console.debug("Creating charge with payload:", payload);
  const response = await axios.post(`${API_BASE}/create-charge`, payload);
  console.debug("Charge response:", response.data);
  return response.data;
};
