import { FIELD_KEY_PATTERN, keyFromLabel, optionsProblem, parseOptions } from './lead-field-rules';

describe('lead field rules', () => {
  it('builds a camelCase key from a label', () => {
    expect(keyFromLabel('Deal size')).toBe('dealSize');
    expect(keyFromLabel('LinkedIn URL')).toBe('linkedinUrl');
    expect(keyFromLabel('  follow-up date ')).toBe('followUpDate');
    expect(keyFromLabel('Café owner')).toBe('cafeOwner');
  });

  it('builds keys the API accepts, even from awkward labels', () => {
    for (const label of ['2nd contact', 'Budget ($)', 'A'.repeat(60), 'Deal size']) {
      expect(keyFromLabel(label)).toMatch(FIELD_KEY_PATTERN);
      expect(keyFromLabel(label).length).toBeLessThanOrEqual(40);
    }
  });

  it('gives up with an empty key when a label has no letters to use', () => {
    expect(keyFromLabel('123 !!')).toBe('');
  });

  it('reads one option per line and skips blank ones', () => {
    expect(parseOptions('Gold\n\n  Silver  \r\nBronze\n')).toEqual(['Gold', 'Silver', 'Bronze']);
  });

  it('says what is wrong with a set of options', () => {
    expect(optionsProblem([])).toBe('Add at least one option.');
    expect(optionsProblem(['Gold', 'Silver', 'Gold'])).toBe('"Gold" is listed more than once.');
    expect(optionsProblem(['x'.repeat(81)])).toBe('Keep each option to 80 characters or fewer.');
    expect(optionsProblem(Array.from({ length: 101 }, (_, index) => `Option ${index}`))).toBe(
      'Use 100 options or fewer.',
    );
    expect(optionsProblem(['Gold', 'gold'])).toBeNull();
  });
});
