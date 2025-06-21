/*
  Warnings:

  - You are about to drop the column `isAvailable` on the `Book` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Book" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "description" TEXT,
    "totalCopies" INTEGER NOT NULL DEFAULT 1,
    "availableCopies" INTEGER NOT NULL DEFAULT 1,
    "isbn" TEXT,
    "publishedYear" INTEGER,
    "publisher" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Book" ("author", "createdAt", "description", "genre", "id", "isbn", "publishedYear", "publisher", "title", "updatedAt") SELECT "author", "createdAt", "description", "genre", "id", "isbn", "publishedYear", "publisher", "title", "updatedAt" FROM "Book";
DROP TABLE "Book";
ALTER TABLE "new_Book" RENAME TO "Book";
CREATE UNIQUE INDEX "Book_isbn_key" ON "Book"("isbn");
CREATE INDEX "Book_title_idx" ON "Book"("title");
CREATE INDEX "Book_author_idx" ON "Book"("author");
CREATE INDEX "Book_genre_idx" ON "Book"("genre");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
