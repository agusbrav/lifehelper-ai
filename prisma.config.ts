import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: './packages/core/prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
})
