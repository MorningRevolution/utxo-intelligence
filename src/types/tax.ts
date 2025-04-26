
export type TaxMethod = 'FIFO' | 'LIFO' | 'SPECIFIC_ID';

export interface TaxConfig {
  country: string;
  isBTCLegalTender: boolean;
  defaultMethod: TaxMethod;
  longTermThresholdDays: number;
  exemptThreshold?: number;
  exemptThresholdCurrency?: string;
}

export type TaxJurisdiction = {
  id: string;
  label: string;
  config: TaxConfig;
};
