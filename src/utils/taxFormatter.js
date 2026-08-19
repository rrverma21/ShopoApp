import { getRegionConfig } from './regionConfig';

export const getTaxLabel = (region = 'India') => {
  return getRegionConfig(region).tax.name;
};

export const getTaxRates = (region = 'India') => {
  return getRegionConfig(region).tax.rates;
};