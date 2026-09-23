-- READ ONLY Production preflight. Do not run as a deployment script.
-- Catalog inspection only: it does not invoke application functions or read order data.
begin transaction isolation level repeatable read, read only;

with target_functions as (
  select p.oid,n.nspname::text schema_name,p.proname::text function_name,
    n.nspname::text||'.'||p.proname::text||'('||pg_get_function_identity_arguments(p.oid)||')' signature,
    p.prosecdef security_definer,pg_get_userbyid(p.proowner)::text owner,p.proconfig::text[] function_config,
    pg_get_functiondef(p.oid) definition
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in ('move_digital_order_to_pos_sales','check_team_access')
), function_grants as (
  select p.oid,jsonb_agg(jsonb_build_object('grantee',case when a.grantee=0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end,'privilege',a.privilege_type,'grantable',a.is_grantable) order by case when a.grantee=0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end,a.privilege_type) grants
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
  where n.nspname='public' and p.proname in ('move_digital_order_to_pos_sales','check_team_access') group by p.oid
), pos_triggers as (
  select n.nspname::text schema_name,c.relname::text table_name,t.tgname::text trigger_name,
    pg_get_triggerdef(t.oid,true) trigger_definition,
    fnn.nspname::text||'.'||fn.proname::text||'('||pg_get_function_identity_arguments(fn.oid)||')' trigger_function_signature,
    pg_get_functiondef(fn.oid) trigger_function_definition
  from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
  join pg_proc fn on fn.oid=t.tgfoid join pg_namespace fnn on fnn.oid=fn.pronamespace
  where not t.tgisinternal and n.nspname='public' and c.relname in ('point_of_sale_sales','point_of_sale_sale_items')
), digital_order_indexes as (
  select n.nspname::text schema_name,c.relname::text table_name,ci.relname::text index_name,
    i.indisunique,i.indisprimary,pg_get_indexdef(i.indexrelid) index_definition,pg_get_expr(i.indpred,i.indrelid) predicate
  from pg_index i join pg_class c on c.oid=i.indrelid join pg_class ci on ci.oid=i.indexrelid join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname='point_of_sale_sales'
    and (pg_get_indexdef(i.indexrelid) ilike '%digital_order_id%' or exists(select 1 from unnest(i.indkey) k(attnum) join pg_attribute a on a.attrelid=i.indrelid and a.attnum=k.attnum where a.attname='digital_order_id'))
), digital_order_constraints as (
  select n.nspname::text schema_name,c.relname::text table_name,con.conname::text constraint_name,con.contype::text constraint_type,pg_get_constraintdef(con.oid,true) constraint_definition
  from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname='point_of_sale_sales' and pg_get_constraintdef(con.oid,true) ilike '%digital_order_id%'
), order_policies as (
  select policyname::text policy_name,cmd::text policy_command,roles::text[] policy_roles,qual::text using_expression,with_check::text with_check_expression
  from pg_policies where schemaname='public' and tablename='digital_shop_orders'
)
select 'function'::text object_type,tf.schema_name,null::text table_name,tf.function_name object_name,tf.signature,tf.security_definer,tf.owner,tf.function_config,tf.definition,fg.grants,
  null::text policy_command,null::text[] policy_roles,null::text using_expression,null::text with_check_expression,null::text trigger_definition,null::text constraint_type,null::boolean unique_index,null::boolean primary_index,null::text index_definition,null::text index_predicate
from target_functions tf left join function_grants fg on fg.oid=tf.oid
union all
select 'policy', 'public', 'digital_shop_orders',op.policy_name,null,null,null,null,null,null,op.policy_command,op.policy_roles,op.using_expression,op.with_check_expression,null,null,null,null,null,null from order_policies op
union all
select 'trigger',pt.schema_name,pt.table_name,pt.trigger_name,pt.trigger_function_signature,null,null,null,pt.trigger_function_definition,null,null,null,null,null,pt.trigger_definition,null,null,null,null,null from pos_triggers pt
union all
select 'index',di.schema_name,di.table_name,di.index_name,null,null,null,null,null,null,null,null,null,null,null,null,di.indisunique,di.indisprimary,di.index_definition,di.predicate from digital_order_indexes di
union all
select 'constraint',dc.schema_name,dc.table_name,dc.constraint_name,null,null,null,null,null,null,null,null,null,null,null,dc.constraint_type,null,null,dc.constraint_definition,null from digital_order_constraints dc
order by object_type,schema_name,table_name nulls first,object_name;

commit;
