ALTER TABLE "user" ADD COLUMN "registered" BOOLEAN;
ALTER TABLE "inactivityNotice" ADD COLUMN "revoked" BOOLEAN DEFAULT false;
