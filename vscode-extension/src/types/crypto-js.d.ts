declare module 'crypto-js' {
  export interface CipherParams {
    ciphertext: any;
    key?: any;
    iv?: any;
    algorithm?: any;
    mode?: any;
    padding?: any;
    blockSize?: number;
    formatter?: any;
    toString(): string;
  }

  export interface WordArray {
    words: number[];
    sigBytes: number;
    toString(encoder?: any): string;
  }

  export namespace AES {
    function encrypt(message: string | WordArray, key: string | WordArray, cfg?: any): CipherParams;
    function decrypt(encrypted: CipherParams | string, key: string | WordArray, cfg?: any): WordArray;
  }

  export function SHA256(message: string | WordArray): WordArray;

  export namespace enc {
    namespace Utf8 {
      function parse(str: string): WordArray;
      function stringify(wordArray: WordArray): string;
    }
    namespace Base64 {
      function parse(str: string): WordArray;
      function stringify(wordArray: WordArray): string;
    }
  }

  export namespace lib {
    namespace WordArray {
      function random(nBytes: number): WordArray;
    }
  }
}