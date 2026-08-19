export const ERROR_MESSAGES = {
  NETWORK_ERROR: "Network error occurred. Please check your connection and try again.",
  INVALID_EMAIL: "Please enter a valid email address.",
  INVALID_PHONE: "Only Indian mobile numbers (+91) are allowed.",
  WEAK_PASSWORD: "Password must be at least 8 characters, with 1 uppercase, 1 lowercase, 1 number, and 1 special character.",
  PASSWORD_MISMATCH: "Passwords do not match.",
  OTP_EXPIRED: "OTP expired. Please resend.",
  INVALID_EMAIL_OTP: "Invalid Email OTP.",
  INVALID_SMS_OTP: "Invalid Mobile OTP.",
  TOO_MANY_ATTEMPTS: "Too many verification attempts. Please resend OTP.",
  COOLDOWN_ACTIVE: "Please wait 30 seconds before resending.",
  TOO_MANY_RESENDS: "Too many resend requests. Please try again later.",
  NOT_VERIFIED: "OTPs not verified. Please complete verification.",
  SERVER_ERROR: "An unexpected error occurred. Please try again.",
  SEND_FAILED: "Failed to send OTP. Please try again."
};

export const getErrorMessage = (error) => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  return ERROR_MESSAGES.SERVER_ERROR;
};