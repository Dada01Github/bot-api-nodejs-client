// @ts-ignore
import nano from 'nano-seconds';
import { sharedKey } from 'curve25519-js';
import forge from 'node-forge';
import { Uint64LE as Uint64 } from 'int64-buffer';
import Keystore from '../types/keystore';
import { base64RawURLEncode } from './base64';
import { Encoder } from '../../mvm';

export const getNanoTime = () => {
  const now: number[] = nano.now();
  return now[0] * 1e9 + now[1];
};

const privateKeyToCurve25519 = (privateKey: Buffer) => {
  const seed = forge.util.createBuffer(privateKey.subarray(0, 32), 'raw');

  const md = forge.md.sha512.create();
  md.update(seed.getBytes());
  const res = md.digest().getBytes();

  const digest = Buffer.from(res, 'binary');
  digest[0] &= 248;
  digest[31] &= 127;
  digest[31] |= 64;
  return digest.subarray(0, 32);
};

export const sharedEd25519Key = (pinTokenRaw: string, privateKeyRaw: string) => {
  const pinToken = Buffer.from(pinTokenRaw, 'base64');
  let privateKey = Buffer.from(privateKeyRaw, 'base64');
  privateKey = privateKeyToCurve25519(privateKey);

  return sharedKey(privateKey, pinToken);
};

export const getTipPinUpdateMsg = (pub: Buffer, counter: number) => {
  const enc = new Encoder(pub);
  enc.writeUint64(BigInt(counter));
  return enc.buf;
};

export const signEd25519PIN = (pin: string, keystore: Keystore | undefined): string => {
  if (!keystore) {
    return '';
  }
  const blockSize = 16;

  const format = pin.length > 6 ? 'hex' : 'utf8';
  const _pin = Buffer.from(pin, format);
  const iterator = Buffer.from(new Uint64(getNanoTime()).toBuffer());
  const time = Buffer.from(new Uint64(Date.now() / 1000).toBuffer());
  const buf = Buffer.concat([_pin, time, iterator]);

  const buffer = forge.util.createBuffer(buf.toString('binary'));
  const paddingLen = blockSize - (buffer.length() % blockSize);
  const paddings = [];
  for (let i = 0; i < paddingLen; i += 1) {
    paddings.push(paddingLen);
  }
  buffer.putBytes(Buffer.from(paddings).toString('binary'));

  const iv = forge.random.getBytesSync(blockSize);
  const sharedKey = sharedEd25519Key(keystore.pin_token!, keystore.private_key!);
  const cipher = forge.cipher.createCipher('AES-CBC', forge.util.createBuffer(sharedKey, 'raw'));
  cipher.start({ iv });
  cipher.update(buffer);
  cipher.finish();

  const pinBuff = forge.util.createBuffer();
  pinBuff.putBytes(iv);
  pinBuff.putBytes(cipher.output.getBytes());

  const len = pinBuff.length();
  const encryptedBytes = Buffer.from(pinBuff.getBytes(len - 16), 'binary');
  return base64RawURLEncode(encryptedBytes);
};

export const buildTipPin = (pin: string) => {
  const timestamp = getNanoTime();
  const msg = `TIP:VERIFY:${`${timestamp}`.padStart(32, '0')}`;
  const privateKey = Buffer.from(pin, 'hex');
  const signData = forge.pki.ed25519.sign({
    message: msg,
    encoding: 'utf8',
    privateKey,
  });
  return {
    pin_base64: signData.toString('hex'),
    timestamp,
  };
};
