-- AddForeignKey
ALTER TABLE "user_modules" ADD CONSTRAINT "user_modules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
