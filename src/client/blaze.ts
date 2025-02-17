import WebSocket from 'ws';
import { v4 as uuid } from 'uuid';
import Keystore from './types/keystore';
import { BlazeOptions, BlazeHandler } from './types';
import { websocket } from './ws';
import { sendRaw } from './utils';

const wsHostURL = ['wss://mixin-blaze.zeromesh.net', 'wss://blaze.mixin.one/'];

export const BlazeKeystoreClient = (keystore: Keystore | undefined, wsOptions: BlazeOptions | undefined) => {
  let url = wsHostURL[0];
  let ws: WebSocket | undefined;
  let pingTimeout: ReturnType<typeof setTimeout> | undefined;
  let onTerminate: (() => void) | undefined;

  const terminate = () => {
    clearTimeout(Number(pingTimeout));
    if (!ws) return;
    ws?.terminate();
    onTerminate?.();
  };

  const heartbeat = () => {
    clearTimeout(Number(pingTimeout));
    pingTimeout = setTimeout(terminate, 1000 * 30);
  };

  const loopBlaze = (h: BlazeHandler) => {
    const connect = () => {
      ws = websocket(keystore, url, h, wsOptions);
      heartbeat();

      ws.on('ping', heartbeat);

      ws.onopen = () => {
        heartbeat();
        sendRaw(ws!, { id: uuid(), action: 'LIST_PENDING_MESSAGES' });
      };

      ws.onclose = () => {
        clearTimeout(Number(pingTimeout));
        loopBlaze(h);
      };

      ws.onerror = e => {
        if (e.message !== 'Opening handshake has timed out') return;
        url = url === wsHostURL[0] ? wsHostURL[1] : wsHostURL[0];
        terminate();
      };
    };

    onTerminate = connect;

    connect();
  };

  return {
    loop: (h: BlazeHandler) => {
      if (ws) throw new Error('Blaze is already running');
      if (!h.onMessage) throw new Error('OnMessage not set');
      loopBlaze(h);
    },
    stopLoop: () => {
      onTerminate = undefined;
      terminate();
      ws = undefined;
    },
    getWebSocket: () => ws,
  };
};

export const BlazeClient = (keystore: Keystore, wsOptions?: BlazeOptions) => ({ blaze: BlazeKeystoreClient(keystore, wsOptions) });

export default BlazeClient;
