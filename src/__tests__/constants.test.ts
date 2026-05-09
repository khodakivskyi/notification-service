import { describe, it, expect } from 'vitest';
import { ANONYMOUS_USER_ID, NOTIFICATION_STATUSES, isValidStatusId } from '../constants/';

describe('constants', () => {
  describe('NOTIFICATION_STATUSES', () => {
    it('has expected status IDs', () => {
      expect(NOTIFICATION_STATUSES.QUEUED).toBe(1);
      expect(NOTIFICATION_STATUSES.SENDING).toBe(2);
      expect(NOTIFICATION_STATUSES.SENT).toBe(3);
      expect(NOTIFICATION_STATUSES.FAILED).toBe(4);
      expect(NOTIFICATION_STATUSES.RETRYING).toBe(5);
    });
  });

  describe('isValidStatusId', () => {
    it('returns true for valid status IDs', () => {
      expect(isValidStatusId(1)).toBe(true);
      expect(isValidStatusId(2)).toBe(true);
      expect(isValidStatusId(3)).toBe(true);
      expect(isValidStatusId(4)).toBe(true);
      expect(isValidStatusId(5)).toBe(true);
    });

    it('returns false for invalid status IDs', () => {
      expect(isValidStatusId(0)).toBe(false);
      expect(isValidStatusId(6)).toBe(false);
      expect(isValidStatusId(-1)).toBe(false);
    });
  });

  describe('ANONYMOUS_USER_ID', () => {
    it('is a valid UUID string', () => {
      expect(ANONYMOUS_USER_ID).toBe('00000000-0000-0000-0000-000000000000');
      expect(ANONYMOUS_USER_ID).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });
  });
});
