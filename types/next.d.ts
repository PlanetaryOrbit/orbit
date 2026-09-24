import { IronSession } from 'iron-session';

declare module 'next' {
  interface NextApiRequest {
    session: IronSession & {
      userid?: number;
    };
  }
}

declare module 'http' {
  interface IncomingMessage {
    session?: IronSession & {
      userid?: number;
    };
  }
}
