import { Crypto } from '../src';

describe('Crypto', () => {
  it('Calculate SHA256', () => {
    const data = 'Test data for sha256 calculating';
    const dataSHA256 = '952a959a1ac6cd9ce1d80fcd1dfd570401c0d40ab36ea9a7a2e22295fd630d3b';
    const sha256 = Crypto.sha256(data);
    expect(sha256).toEqual(dataSHA256);
  });
});
