export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Lakshadweep', 
  'Andaman and Nicobar Islands', 'Chandigarh', 'Daman and Diu', 
  'Dadra and Nagar Haveli'
];

export const UK_REGIONS = [
  'England', 'Scotland', 'Wales', 'Northern Ireland'
];

export const PHONE_FORMATS = {
  India: {
    prefix: '+91',
    length: 10,
    regex: /^(?:\+91|91)?\s*([6-9]\d{9})$/
  },
  UK: {
    prefix: '+44',
    length: 11, // Standard UK length including 0
    regex: /^(?:\+44|0)?\s*(\d{4}\s*\d{6}|\d{3}\s*\d{3}\s*\d{4}|\d{10,11})$/
  }
};

export const PINCODE_FORMATS = {
  India: {
    name: 'Pincode',
    regex: /^[1-9][0-9]{5}$/,
    example: '110001'
  },
  UK: {
    name: 'Postcode',
    regex: /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i,
    example: 'SW1A 1AA'
  }
};