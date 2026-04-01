import { describe, it, expect } from 'vitest';
import { parseXML } from './xml.js';

describe('parseXML', () => {
  it('parses a simple XML document', () => {
    const xml = '<root><name>Test</name><value>42</value></root>';
    const result = parseXML(xml);
    expect(result).toEqual({ root: { name: 'Test', value: 42 } });
  });

  it('preserves attributes with @_ prefix', () => {
    const xml = '<item id="123" type="law">Content</item>';
    const result = parseXML<{ item: Record<string, unknown> }>(xml);
    expect(result.item['@_id']).toBe('123');
    expect(result.item['@_type']).toBe('law');
    expect(result.item['#text']).toBe('Content');
  });

  it('handles nested structures', () => {
    const xml = `
      <response>
        <status><code>200</code></status>
        <data><entry>one</entry><entry>two</entry></data>
      </response>`;
    const result = parseXML<{ response: { status: { code: number }; data: { entry: string[] } } }>(xml);
    expect(result.response.status.code).toBe(200);
    expect(result.response.data.entry).toEqual(['one', 'two']);
  });
});

describe('XML security', () => {
  it('does not expand internal entity declarations', () => {
    const xml = `<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe "expanded-entity-value">
]>
<root>&xxe;</root>`;
    const result = parseXML<{ root: string }>(xml);
    expect(typeof result.root === 'string' ? result.root : '').not.toContain('expanded-entity-value');
  });

  it('does not resolve external entity references', () => {
    const xml = `<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<root>&xxe;</root>`;
    expect(() => parseXML<{ root: unknown }>(xml)).toThrow('External entities are not supported');
  });
});
