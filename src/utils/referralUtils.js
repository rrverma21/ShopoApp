export const generateReferralCode = (prefix = 'NEX') => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}${result}`;
};

export const getWhatsAppShareLink = (code) => {
  const url = `${window.location.origin}/signup?ref=${code}`;
  const text = `Join ShopoApp using my referral code *${code}* and get exclusive rewards on your first subscription! 🚀\nSign up here: ${url}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
};

export const getEmailShareLink = (code) => {
  const url = `${window.location.origin}/signup?ref=${code}`;
  const subject = `Join me on ShopoApp!`;
  const body = `Hi,\n\nI've been using ShopoApp to manage my business and thought you might like it too. Use my referral code ${code} to get extra benefits when you subscribe.\n\nSign up here: ${url}\n\nBest regards!`;
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    return false;
  }
};