import { describe, it, expect } from 'vitest';

describe('PIN and Access Validation Logic', () => {
  it('validates PIN with case insensitivity and whitespace trimming', () => {
    const expectedPin = '0001';
    
    const validatePin = (input: string, expected: string) => {
      const cleanExpected = (expected || '').trim().toUpperCase();
      const cleanInput = (input || '').trim().toUpperCase();
      return cleanInput.length > 0 && cleanInput === cleanExpected;
    };

    expect(validatePin('0001', expectedPin)).toBe(true);
    expect(validatePin(' 0001 ', expectedPin)).toBe(true);
    expect(validatePin('0001', ' 0001 ')).toBe(true);
    expect(validatePin('0002', expectedPin)).toBe(false);
    expect(validatePin('', expectedPin)).toBe(false);
    expect(validatePin('   ', expectedPin)).toBe(false);
  });

  it('determines if school requires PIN gating', () => {
    const isPinRequired = (groupCode?: string | null) => {
      return !!groupCode && groupCode.trim() !== '';
    };

    expect(isPinRequired('0001')).toBe(true);
    expect(isPinRequired('')).toBe(false);
    expect(isPinRequired('   ')).toBe(false);
    expect(isPinRequired(null)).toBe(false);
    expect(isPinRequired(undefined)).toBe(false);
  });

  it('verifies admin privilege check criteria', () => {
    const isUserAdmin = (userId: string, adminList: { id: string; email: string }[]) => {
      if (!userId) return false;
      return adminList.some(admin => admin.id === userId);
    };

    const mockAdminTable = [
      { id: 'uuid-admin-1', email: 'admin@supertour.com.ar' },
      { id: 'uuid-admin-2', email: 'manager@supertour.com.ar' }
    ];

    expect(isUserAdmin('uuid-admin-1', mockAdminTable)).toBe(true);
    expect(isUserAdmin('uuid-admin-2', mockAdminTable)).toBe(true);
    expect(isUserAdmin('uuid-regular-user', mockAdminTable)).toBe(false);
    expect(isUserAdmin('', mockAdminTable)).toBe(false);
  });
});
