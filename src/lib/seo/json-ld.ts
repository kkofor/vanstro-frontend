type JsonLdValue = Record<string, unknown> | Record<string, unknown>[];

export function serializeJsonLd(value: JsonLdValue) {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) => {
    const escapes: Record<string, string> = {
      "<": "\\u003c",
      ">": "\\u003e",
      "&": "\\u0026",
      "\u2028": "\\u2028",
      "\u2029": "\\u2029"
    };
    return escapes[character];
  });
}
