-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cdpWalletId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Policy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "dailyBudgetUsd" REAL NOT NULL,
    "allowedProtocols" TEXT NOT NULL,
    "allowedActions" TEXT NOT NULL,
    "deniedFunctions" TEXT NOT NULL DEFAULT '["approve","setApprovalForAll"]',
    "allowedTokens" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "agentWalletId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Policy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentActionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "policyId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "rawRequest" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'local-demo',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentActionLog_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_cdpWalletId_key" ON "User"("cdpWalletId");

-- CreateIndex
CREATE UNIQUE INDEX "Policy_agentWalletId_key" ON "Policy"("agentWalletId");
