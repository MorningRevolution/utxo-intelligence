
import { TaxJurisdiction } from '../types/tax';

export const taxJurisdictions: TaxJurisdiction[] = [
  {
    id: 'us',
    label: 'United States',
    config: {
      country: 'US',
      isBTCLegalTender: false,
      defaultMethod: 'FIFO',
      longTermThresholdDays: 365,
    }
  },
  {
    id: 'de',
    label: 'Germany',
    config: {
      country: 'DE',
      isBTCLegalTender: false,
      defaultMethod: 'FIFO',
      longTermThresholdDays: 365,
      exemptThreshold: 200,
      exemptThresholdCurrency: 'EUR'
    }
  },
  {
    id: 'sv',
    label: 'El Salvador',
    config: {
      country: 'SV',
      isBTCLegalTender: true,
      defaultMethod: 'FIFO',
      longTermThresholdDays: 0
    }
  },
  {
    id: 'ca',
    label: 'Canada',
    config: {
      country: 'CA',
      isBTCLegalTender: false,
      defaultMethod: 'FIFO',
      longTermThresholdDays: 365
    }
  },
  {
    id: 'gb',
    label: 'United Kingdom',
    config: {
      country: 'GB',
      isBTCLegalTender: false,
      defaultMethod: 'FIFO',
      longTermThresholdDays: 365
    }
  }
];
