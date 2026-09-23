import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(new URL('../supabase/migrations/20260923150000_harden_digital_shop_pos_bridge.sql', import.meta.url), 'utf8');

test('bridge hardening fixes SECURITY DEFINER lookup and removes public execution', () => {
  assert.match(migration, /alter function public\.move_digital_order_to_pos_sales\(uuid\) set search_path to ''/);
  assert.match(migration, /revoke all on function public\.move_digital_order_to_pos_sales\(uuid\) from public/);
  assert.match(migration, /revoke all on function public\.move_digital_order_to_pos_sales\(uuid\) from anon/);
  assert.match(migration, /grant execute on function public\.move_digital_order_to_pos_sales\(uuid\) to authenticated, service_role/);
});

test('bridge conversion has a database-level non-null Digital Shop order uniqueness guard', () => {
  assert.match(migration, /create unique index point_of_sale_sales_digital_order_id_unique_idx/);
  assert.doesNotMatch(migration, /create unique index if not exists/);
  assert.match(migration, /on public\.point_of_sale_sales \(digital_order_id\)/);
  assert.match(migration, /where digital_order_id is not null/);
});
