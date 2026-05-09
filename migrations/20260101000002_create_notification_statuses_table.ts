import { MigrationBuilder } from 'node-pg-migrate';
import fs from 'fs';
import path from 'path';

export async function up(pgm: MigrationBuilder): Promise<void> {
  const sql = fs.readFileSync(
    path.resolve(
      process.cwd(),
      'migrations/sql/20260101000002_create_notification_statuses_table.sql',
    ),
    'utf-8',
  );

  pgm.sql(sql);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE notification_service.notifications
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'pending';
    ALTER TABLE notification_service.notifications
        DROP COLUMN IF EXISTS "statusId";
    DROP TABLE IF EXISTS notification_service.notification_statuses;
  `);
}
