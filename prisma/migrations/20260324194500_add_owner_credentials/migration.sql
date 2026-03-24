CREATE TABLE "OwnerCredential" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "mustRotatePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OwnerCredential_email_key" ON "OwnerCredential"("email");
