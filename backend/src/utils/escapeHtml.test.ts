import { escapeHtml } from './escapeHtml';

describe('escapeHtml', () => {
  it('escapes ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes less-than signs', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes greater-than signs', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#x27;s');
  });

  it('escapes a full XSS payload', () => {
    const malicious = '<script>alert("xss")</script>';
    const escaped = '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;';
    expect(escapeHtml(malicious)).toBe(escaped);
  });

  it('leaves safe strings unchanged', () => {
    expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
  });

  it('handles an empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('escapes multiple special characters in one string', () => {
    const input = `Tom & Jerry's "show" <2024>`;
    const expected = 'Tom &amp; Jerry&#x27;s &quot;show&quot; &lt;2024&gt;';
    expect(escapeHtml(input)).toBe(expected);
  });
});
