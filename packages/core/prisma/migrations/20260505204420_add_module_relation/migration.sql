-- AddForeignKey
ALTER TABLE "user_modules" ADD CONSTRAINT "user_modules_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "module_registry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
