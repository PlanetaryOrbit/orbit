import * as IronSession from "iron-session";
declare module "iron-session" {
	interface IronSessionData {
	  userid: number;
	  verification?: { 
		userid: number;
		verificationCode: string;
		isReset?: boolean;
	  }
	}
  }

export type User = {
	userId: number
	username: string
	displayname: string
	thumbnail: string
}

declare global {
	namespace NodeJS {
	  interface Global {
		prisma: any;
	  }
	}
  }