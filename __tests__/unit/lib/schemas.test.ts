import { describe, it, expect } from 'vitest';
import {
  AddressComponentsSchema,
  LocationSchema,
  SocialsSchema,
  BusinessRecordSchema,
  ScanRequestSchema,
} from '@/lib/schemas';

describe('AddressComponentsSchema', () => {
  it('should validate a full address component object', () => {
    const validAddress = {
      country: 'Belarus',
      region: 'Minskaya voblast',
      city: 'Minsk',
      street: 'Lenina',
      house: '15',
      postal_code: '220000',
    };
    expect(() => AddressComponentsSchema.parse(validAddress)).not.toThrow();
  });

  it('should validate an empty address component object', () => {
    const emptyAddress = {};
    expect(() => AddressComponentsSchema.parse(emptyAddress)).not.toThrow();
  });

  it('should allow partial address component object', () => {
    const partialAddress = { city: 'Minsk', street: 'Lenina' };
    expect(() => AddressComponentsSchema.parse(partialAddress)).not.toThrow();
  });
});

describe('LocationSchema', () => {
  it('should validate a valid location object', () => {
    const validLocation = { lat: 53.9, lng: 27.5667 };
    expect(() => LocationSchema.parse(validLocation)).not.toThrow();
  });

  it('should throw error for missing lat', () => {
    const invalidLocation = { lng: 27.5667 };
    expect(() => LocationSchema.parse(invalidLocation)).toThrow();
  });

  it('should throw error for missing lng', () => {
    const invalidLocation = { lat: 53.9 };
    expect(() => LocationSchema.parse(invalidLocation)).toThrow();
  });

  it('should throw error for non-numeric lat/lng', () => {
    const invalidLocation = { lat: '53.9', lng: 27.5667 };
    expect(() => LocationSchema.parse(invalidLocation)).toThrow();
  });
});

describe('SocialsSchema', () => {
  it('should validate a full socials object', () => {
    const validSocials = {
      facebook: 'https://facebook.com/test',
      instagram: 'https://instagram.com/test',
      x: 'https://x.com/test',
      telegram: 'https://t.me/test',
      vk: 'https://vk.com/test',
      linkedin: 'https://linkedin.com/in/test',
      youtube: 'https://youtube.com/channel/test',
      tiktok: 'https://tiktok.com/@test',
      other: ['https://example.com/blog'],
    };
    expect(() => SocialsSchema.parse(validSocials)).not.toThrow();
  });

  it('should validate an empty socials object', () => {
    const emptySocials = {};
    expect(() => SocialsSchema.parse(emptySocials)).not.toThrow();
  });

  it('should allow partial socials object', () => {
    const partialSocials = { facebook: 'https://facebook.com/test' };
    expect(() => SocialsSchema.parse(partialSocials)).not.toThrow();
  });

  it('should validate socials with only "other" array', () => {
    const otherSocials = { other: ['https://custom.com'] };
    expect(() => SocialsSchema.parse(otherSocials)).not.toThrow();
  });

  it('should throw error if "other" is not an array of strings', () => {
    const invalidOtherSocials = { other: ['https://custom.com', 123] };
    expect(() => SocialsSchema.parse(invalidOtherSocials)).toThrow();
  });
});

describe('BusinessRecordSchema', () => {
  const baseValidRecord = {
    source: 'rapidapi-local-business-data',
    collected_at: new Date().toISOString(),
    region_query: 'Minsk',
    activity_query: 'autoservice',
    place_id: 'ChIJ-y_y_y_y_y_y_y_y_y_y_y_y',
    name: 'Test Auto Service',
    categories: ['Auto Service', 'Repair'],
    address_full: '123 Test St, Minsk',
    address_components: { city: 'Minsk' },
    location: { lat: 53.9, lng: 27.5 },
    emails: ['info@test.com'],
    socials: { facebook: 'https://facebook.com/test' },
  };

  it('should validate a minimal valid business record', () => {
    expect(() => BusinessRecordSchema.parse(baseValidRecord)).not.toThrow();
  });

  it('should validate a full business record', () => {
    const fullRecord = {
      ...baseValidRecord,
      description: 'A great auto service',
      phone_e164: '+375291234567',
      website: 'https://testautoservice.com',
      rating: 4.8,
      user_ratings_total: 150,
      opening_hours_raw: ['Mon-Fri 9-18'],
      price_level: 2,
      google_url: 'https://maps.google.com/test',
      notes: 'Some notes',
    };
    expect(() => BusinessRecordSchema.parse(fullRecord)).not.toThrow();
  });

  it('should throw error for invalid source', () => {
    const invalidRecord = { ...baseValidRecord, source: 'invalid-source' };
    expect(() => BusinessRecordSchema.parse(invalidRecord)).toThrow();
  });

  it('should throw error for invalid collected_at', () => {
    const invalidRecord = { ...baseValidRecord, collected_at: 'not-a-date' };
    expect(() => BusinessRecordSchema.parse(invalidRecord)).toThrow();
  });

  it('should throw error for invalid email format', () => {
    const invalidRecord = { ...baseValidRecord, emails: ['invalid-email'] };
    expect(() => BusinessRecordSchema.parse(invalidRecord)).toThrow();
  });

  it('should throw error for invalid website URL', () => {
    const invalidRecord = { ...baseValidRecord, website: 'not-a-url' };
    expect(() => BusinessRecordSchema.parse(invalidRecord)).toThrow();
  });
});

describe('ScanRequestSchema', () => {
  it('should validate a valid scan request', () => {
    const validRequest = { region: 'Minsk', activity: 'autoservice' };
    expect(() => ScanRequestSchema.parse(validRequest)).not.toThrow();
  });

  it('should throw error for missing region', () => {
    const invalidRequest = { activity: 'autoservice' };
    expect(() => ScanRequestSchema.parse(invalidRequest)).toThrow();
  });

  it('should throw error for empty region', () => {
    const invalidRequest = { region: '', activity: 'autoservice' };
    expect(() => ScanRequestSchema.parse(invalidRequest)).toThrow();
  });

  it('should throw error for missing activity', () => {
    const invalidRequest = { region: 'Minsk' };
    expect(() => ScanRequestSchema.parse(invalidRequest)).toThrow();
  });

  it('should throw error for empty activity', () => {
    const invalidRequest = { region: 'Minsk', activity: '' };
    expect(() => ScanRequestSchema.parse(invalidRequest)).toThrow();
  });
});
