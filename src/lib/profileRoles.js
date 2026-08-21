export const normalizeProfileRole = (role) => {
  return role === 'client' ? 'customer' : role;
};
