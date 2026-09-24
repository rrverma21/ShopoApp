-- READ ONLY Production preflight. Do not run as a deployment script.
-- Catalog/metadata inspection only: no application RPCs are invoked and no
-- business, customer, provider-order, payment, or credential rows are read.
--
-- Edge Function deployment/version and environment-secret values cannot be
-- established through SQL and are deliberately outside this diagnostic.
begin transaction isolation level repeatable read, read only;

with relevant_tables(schema_name, table_name) as (
  values
    ('public'::text, 'digital_shop_plans'::text),
    ('public', 'digital_shop_subscriptions'),
    ('public', 'digital_shop_purchase_orders'),
    ('public', 'digital_shop_commercial_prices'),
    ('public', 'digital_shop_addon_prices'),
    ('public', 'digital_shop_commercial_accounts'),
    ('public', 'digital_shop_checkout_reservations'),
    ('public', 'digital_shop_cashfree_claims'),
    ('public', 'digital_shop_cashfree_receipts'),
    ('public', 'digital_shop_cashfree_retirements'),
    ('public', 'digital_shop_payment_events')
), relevant_functions(function_name) as (
  values
    ('prepare_digital_shop_purchase'::text),
    ('activate_digital_shop_purchase'),
    ('prepare_digital_shop_commercial_purchase'),
    ('claim_digital_shop_cashfree_order'),
    ('finalize_digital_shop_cashfree_order'),
    ('finalize_digital_shop_cashfree_claim'),
    ('settle_digital_shop_cashfree_payment'),
    ('activate_paid_digital_shop_commercial_purchase'),
    ('inspect_digital_shop_cashfree_recovery'),
    ('inspect_digital_shop_cashfree_expired_recovery'),
    ('retire_digital_shop_cashfree_checkout'),
    ('retire_digital_shop_cashfree_expired_checkout'),
    ('get_digital_shop_commercial_context'),
    ('create_new_digital_shop_commercial_price_version'),
    ('create_new_digital_shop_addon_price_version'),
    ('get_active_digital_shop_entitlements'),
    ('resolve_effective_digital_shop_entitlement'),
    ('can_actor_access_digital_shop_business'),
    ('is_digital_shop_plan_available_for_business'),
    ('guard_digital_shop_preparation_only'),
    ('guard_digital_shop_cashfree_evidence'),
    ('guard_digital_shop_commercial_purchase'),
    ('guard_digital_shop_activation_record'),
    ('guard_digital_shop_price_version')
), table_catalog as (
  select rt.schema_name, rt.table_name, c.oid as relation_oid, c.relkind,
    c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced,
    pg_get_userbyid(c.relowner)::text as owner
  from relevant_tables rt
  left join pg_namespace n on n.nspname = rt.schema_name
  left join pg_class c on c.relnamespace = n.oid and c.relname = rt.table_name
    and c.relkind in ('r', 'p')
), table_columns as (
  select tc.schema_name, tc.table_name,
    jsonb_agg(jsonb_build_object(
      'name', a.attname,
      'type', pg_catalog.format_type(a.atttypid, a.atttypmod),
      'not_null', a.attnotnull,
      'default', pg_get_expr(d.adbin, d.adrelid),
      'identity', nullif(a.attidentity, ''),
      'generated', nullif(a.attgenerated, '')
    ) order by a.attnum) as columns
  from table_catalog tc
  join pg_attribute a on a.attrelid = tc.relation_oid and a.attnum > 0 and not a.attisdropped
  left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  group by tc.schema_name, tc.table_name
), table_constraints as (
  select tc.schema_name, tc.table_name,
    jsonb_agg(jsonb_build_object(
      'name', con.conname,
      'type', con.contype,
      'definition', pg_get_constraintdef(con.oid, true)
    ) order by con.conname) as constraints
  from table_catalog tc
  join pg_constraint con on con.conrelid = tc.relation_oid
  group by tc.schema_name, tc.table_name
), table_indexes as (
  select tc.schema_name, tc.table_name,
    jsonb_agg(jsonb_build_object(
      'name', ci.relname,
      'unique', i.indisunique,
      'primary', i.indisprimary,
      'definition', pg_get_indexdef(i.indexrelid),
      'predicate', pg_get_expr(i.indpred, i.indrelid)
    ) order by ci.relname) as indexes
  from table_catalog tc
  join pg_index i on i.indrelid = tc.relation_oid
  join pg_class ci on ci.oid = i.indexrelid
  group by tc.schema_name, tc.table_name
), table_policies as (
  select tc.schema_name, tc.table_name,
    jsonb_agg(jsonb_build_object(
      'name', p.policyname,
      'command', p.cmd,
      'roles', to_jsonb(p.roles),
      'using', p.qual,
      'with_check', p.with_check
    ) order by p.policyname) as policies
  from table_catalog tc
  join pg_policies p on p.schemaname = tc.schema_name and p.tablename = tc.table_name
  group by tc.schema_name, tc.table_name
), table_grants as (
  select tc.schema_name, tc.table_name,
    jsonb_agg(jsonb_build_object(
      'grantee', case when acl.grantee = 0 then 'PUBLIC' else pg_get_userbyid(acl.grantee) end,
      'privilege', acl.privilege_type,
      'grantable', acl.is_grantable
    ) order by case when acl.grantee = 0 then 'PUBLIC' else pg_get_userbyid(acl.grantee) end, acl.privilege_type) as grants
  from table_catalog tc
  cross join lateral aclexplode(coalesce((select c.relacl from pg_class c where c.oid = tc.relation_oid), acldefault('r', (select c.relowner from pg_class c where c.oid = tc.relation_oid)))) acl
  where tc.relation_oid is not null
  group by tc.schema_name, tc.table_name
), table_triggers as (
  select tc.schema_name, tc.table_name,
    jsonb_agg(jsonb_build_object(
      'name', t.tgname,
      'definition', pg_get_triggerdef(t.oid, true),
      'function_signature', fnn.nspname || '.' || fn.proname || '(' || pg_get_function_identity_arguments(fn.oid) || ')',
      'function_definition', pg_get_functiondef(fn.oid),
      'security_definer', fn.prosecdef,
      'owner', pg_get_userbyid(fn.proowner),
      'config', to_jsonb(fn.proconfig)
    ) order by t.tgname) as triggers
  from table_catalog tc
  join pg_trigger t on t.tgrelid = tc.relation_oid and not t.tgisinternal
  join pg_proc fn on fn.oid = t.tgfoid
  join pg_namespace fnn on fnn.oid = fn.pronamespace
  group by tc.schema_name, tc.table_name
), function_catalog as (
  select n.nspname::text as schema_name, p.oid, p.proname::text as function_name,
    n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as signature,
    pg_get_functiondef(p.oid) as definition, p.prosecdef as security_definer,
    pg_get_userbyid(p.proowner)::text as owner, p.provolatile::text as volatility,
    to_jsonb(p.proconfig) as config
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join relevant_functions rf on rf.function_name = p.proname
  where n.nspname = 'public'
), function_grants as (
  select fc.oid,
    jsonb_agg(jsonb_build_object(
      'grantee', case when acl.grantee = 0 then 'PUBLIC' else pg_get_userbyid(acl.grantee) end,
      'privilege', acl.privilege_type,
      'grantable', acl.is_grantable
    ) order by case when acl.grantee = 0 then 'PUBLIC' else pg_get_userbyid(acl.grantee) end, acl.privilege_type) as grants
  from function_catalog fc
  cross join lateral aclexplode(coalesce((select p.proacl from pg_proc p where p.oid = fc.oid), acldefault('f', (select p.proowner from pg_proc p where p.oid = fc.oid)))) acl
  group by fc.oid
), relevant_types as (
  select distinct a.atttypid
  from table_catalog tc
  join pg_attribute a on a.attrelid = tc.relation_oid and a.attnum > 0 and not a.attisdropped
), state_types as (
  select t.oid, n.nspname::text as schema_name, t.typname::text as type_name,
    t.typtype::text as type_kind, t.typbasetype,
    case when t.typtype = 'd' then pg_catalog.format_type(t.typbasetype, null) end as domain_base_type,
    case when t.typtype = 'e' then (
      select jsonb_agg(e.enumlabel order by e.enumsortorder) from pg_enum e where e.enumtypid = t.oid
    ) end as enum_labels
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  join relevant_types rt on rt.atttypid = t.oid
  where t.typtype in ('d', 'e')
), migration_ledger_relations as (
  -- Deliberately catalog-only: migration history relation names vary by deployment,
  -- and a static read of an assumed relation would make the whole preflight fail when absent.
  select n.nspname::text as schema_name, c.relname::text as relation_name, c.relkind::text as relation_kind,
    pg_get_userbyid(c.relowner)::text as owner,
    jsonb_agg(jsonb_build_object('name', a.attname, 'type', pg_catalog.format_type(a.atttypid, a.atttypmod)) order by a.attnum) as columns
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
  where c.relkind in ('r', 'p', 'v', 'm')
    and (n.nspname ilike '%migration%' or c.relname ilike '%migration%')
  group by n.nspname, c.relname, c.relkind, c.relowner
)
select 'migration_ledger_relation'::text as section, 'relation'::text as object_type,
  mlr.schema_name, mlr.relation_name as table_name, mlr.relation_name as object_name,
  null::text as identity_signature,
  jsonb_build_object('relation_kind', mlr.relation_kind, 'owner', mlr.owner, 'columns', mlr.columns,
    'note', 'Catalog discovery only. Review the returned relation and run a separately approved, relation-specific SELECT to read applied versions.') as details
from migration_ledger_relations mlr

union all

select 'commercial_tables', 'table', tc.schema_name, tc.table_name, tc.table_name, null,
  jsonb_build_object('exists', tc.relation_oid is not null, 'relkind', tc.relkind, 'owner', tc.owner,
    'rls_enabled', tc.rls_enabled, 'rls_forced', tc.rls_forced,
    'columns', coalesce(col.columns, '[]'::jsonb),
    'constraints', coalesce(con.constraints, '[]'::jsonb),
    'indexes', coalesce(ix.indexes, '[]'::jsonb),
    'policies', coalesce(pol.policies, '[]'::jsonb),
    'grants', coalesce(gr.grants, '[]'::jsonb),
    'triggers', coalesce(trg.triggers, '[]'::jsonb))
from table_catalog tc
left join table_columns col using (schema_name, table_name)
left join table_constraints con using (schema_name, table_name)
left join table_indexes ix using (schema_name, table_name)
left join table_policies pol using (schema_name, table_name)
left join table_grants gr using (schema_name, table_name)
left join table_triggers trg using (schema_name, table_name)

union all

select 'commercial_functions', 'function', fc.schema_name, null, fc.function_name, fc.signature,
  jsonb_build_object('definition', fc.definition, 'security_definer', fc.security_definer,
    'owner', fc.owner, 'volatility', fc.volatility, 'config', fc.config,
    'execute_grants', coalesce(fg.grants, '[]'::jsonb))
from function_catalog fc
left join function_grants fg on fg.oid = fc.oid

union all

select 'status_types', 'type', st.schema_name, null, st.type_name, null,
  jsonb_build_object('kind', st.type_kind, 'domain_base_type', st.domain_base_type, 'enum_labels', st.enum_labels)
from state_types st

union all

select 'status_constraints', 'constraint', tc.schema_name, tc.table_name, con.conname, null,
  jsonb_build_object('type', con.contype, 'definition', pg_get_constraintdef(con.oid, true))
from table_catalog tc
join pg_constraint con on con.conrelid = tc.relation_oid and con.contype = 'c'

union all

select 'expected_function_absent', 'function', 'public', null, rf.function_name, null,
  jsonb_build_object('exists', false, 'note', 'No public overload with this repository-referenced function name was found.')
from relevant_functions rf
where not exists (select 1 from function_catalog fc where fc.function_name = rf.function_name)

union all

select 'expected_table_absent', 'table', rt.schema_name, rt.table_name, rt.table_name, null,
  jsonb_build_object('exists', false, 'note', 'Repository-referenced commercial/payment table was not found.')
from table_catalog rt
where rt.relation_oid is null

order by section, object_type, schema_name, table_name nulls first, object_name, identity_signature nulls first;

commit;
