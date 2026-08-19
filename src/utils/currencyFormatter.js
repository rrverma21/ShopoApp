import { getRegionConfig } from './regionConfig';
import { formatIndianNumber, formatWesternNumber } from './numberFormatter';

export const formatCurrency = (amount, region = 'India') => {
  const config = getRegionConfig(region);
  const formattedNumber = region === 'India' 
    ? formatIndianNumber(amount) 
    : formatWesternNumber(amount);
    
  return `${config.currency.symbol}${formattedNumber}`;
};