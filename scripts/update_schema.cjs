const fs = require('fs');
let content = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Add release_date to exams
content = content.replace(
  '  shuffle          Boolean            @default(false)\n',
  '  shuffle          Boolean            @default(false)\n  release_date     DateTime?          @db.Timestamptz(6)\n  is_published     Boolean            @default(true)\n'
);

// Add release_date to monthly_courses
content = content.replace(
  '  badge                   String?\n  is_published            Boolean                   @default(true)\n',
  '  badge                   String?\n  is_published            Boolean                   @default(true)\n  release_date            DateTime?                 @db.Timestamptz(6)\n'
);

// Add is_published to lectures
content = content.replace(
  '  image                     String?\n  release_date              DateTime?                @db.Timestamptz(6)\n',
  '  image                     String?\n  release_date              DateTime?                @db.Timestamptz(6)\n  is_published              Boolean                  @default(true)\n'
);

// Add is_published and release_date to lessons
content = content.replace(
  '  video_url                        String?\n',
  '  video_url                        String?\n  is_published                     Boolean  @default(true)\n  release_date                     DateTime? @db.Timestamptz(6)\n'
);

// Add subscription fields to platform_settings
content = content.replace(
  '  rescue_hourly_limit            Int     @default(50)\n',
  '  rescue_hourly_limit            Int     @default(50)\n  subscription_mode              String  @default("purchases_only")\n  grace_period_days              Int     @default(3)\n'
);

// Append subscription models
const subscriptionModels = `
model subscription_plans {
  id              String                  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  title           String
  description     String                  @default("")
  price           Decimal                 @db.Decimal
  duration_days   Int                     @default(30)
  is_active       Boolean                 @default(true)
  created_at      DateTime                @default(now()) @db.Timestamptz(6)
  updated_at      DateTime                @default(now()) @db.Timestamptz(6)
  stage_id        String?                 @db.Uuid
  branch_id       String?                 @db.Uuid

  student_subscriptions student_subscriptions[]

  @@index([is_active])
  @@schema("public")
}

model student_subscriptions {
  id              String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  student_id      String             @db.Uuid
  plan_id         String             @db.Uuid
  start_date      DateTime           @default(now()) @db.Timestamptz(6)
  end_date        DateTime           @db.Timestamptz(6)
  status          String             @default("active")
  created_at      DateTime           @default(now()) @db.Timestamptz(6)
  updated_at      DateTime           @default(now()) @db.Timestamptz(6)

  students        students           @relation(fields: [student_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  plans           subscription_plans @relation(fields: [plan_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@index([student_id, status])
  @@index([end_date])
  @@schema("public")
}
`;

content += subscriptionModels;
fs.writeFileSync('prisma/schema.prisma', content);
console.log('Schema updated successfully');
