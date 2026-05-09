import { MigrationBuilder } from 'node-pg-migrate';
import fs from 'fs';
import path from 'path';

export async function up(pgm: MigrationBuilder): Promise<void> {
  const sql = fs.readFileSync(
    path.resolve(process.cwd(), 'migrations/sql/20260101000001_create_notifications_table.sql'),
    'utf-8',
  );

  pgm.sql(sql);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP TRIGGER IF EXISTS update_notifications_updated_at ON notification_service.notifications;
    DROP FUNCTION IF EXISTS notification_service.update_updated_at_column;
    DROP TABLE IF EXISTS notification_service.notifications;
    DROP SCHEMA IF EXISTS notification_service CASCADE;
  `);
}
