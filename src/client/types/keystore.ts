export interface Keystore {
  user_id: string;
  private_key: string;

  // oauth
  scope?: string;
  authorization_id?: string;

  // owner private key
  session_id?: string;
  pin?: string;
  pin_token?: string;
  client_secret?: string;
}
interface ClientKeystore {
  client_id: string;
  private_key: string;

  // oauth
  scope?: string;
  authorization_id?: string;

  // owner private key
  session_id?: string;
  pin?: string;
  pin_token?: string;
  client_secret?: string;
}
export type InitKeystore = Keystore | ClientKeystore;

export default Keystore;
