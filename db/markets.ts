import { z } from 'zod';
import { pool, requireDemo } from './postgres';
import type { PoolClient } from 'pg';
import type { MarketCatalogs, MarketRecord } from '@/data/markets';
import {pueblaMunicipalities} from '@/data/puebla-municipalities';
export class MarketError extends Error { constructor(message:string,public status=400){super(message);} }
const uuid=z.string().uuid();
const address=z.object({street:z.string().trim().min(1).max(250),exterior:z.string().trim().max(40),interior:z.string().trim().max(40),neighborhood:z.string().trim().min(1).max(250),municipalityCode:z.string().refine(code=>pueblaMunicipalities.some(x=>x.code===code),'Municipio inválido'),postalCode:z.string().regex(/^[0-9]{5}$/),locality:z.string().trim().max(250),reference:z.string().trim().max(2000)});
const time=z.string().regex(/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/);
const input=z.object({
 address,hours:z.array(z.object({day:z.number().int().min(1).max(7),opens:time,closes:time,nextDay:z.boolean()})).max(28),
 name:z.string().trim().min(1).max(250),type:z.enum(['mercado','tianguis']),description:z.string().trim().max(20000),
 sourceId:z.union([uuid,z.literal('')]),newSource:z.object({title:z.string().trim().min(1).max(500),reference:z.string().trim().min(1).max(20000),typeId:uuid}).optional(),observationDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>{const date=new Date(value);return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;},'Fecha inválida'),
 recipes:z.array(z.object({id:uuid,relationship:z.enum(['se_prepara','se_vende','documentada_en'])})).max(100),
 ingredients:z.array(z.object({id:uuid,availability:z.string().trim().max(1000)})).max(100),
 people:z.array(z.object({id:uuid,participationId:uuid})).max(100),
}).superRefine((form,ctx)=>{
 const intervals:{start:number;end:number}[]=[];
 for(const [index,hour] of form.hours.entries()){
  const minutes=(value:string)=>Number(value.slice(0,2))*60+Number(value.slice(3));
  const start=minutes(hour.opens),end=minutes(hour.closes)+(hour.nextDay?1440:0);
  if(end<=start||end-start>1440)ctx.addIssue({code:'custom',path:['hours',index],message:'Revisa apertura, cierre y cambio de día.'});
  intervals.push({start:(hour.day-1)*1440+start,end:(hour.day-1)*1440+end});
 }
 for(let i=0;i<intervals.length;i++)for(let j=i+1;j<intervals.length;j++){
  if([-10080,0,10080].some(shift=>intervals[i].start<intervals[j].end+shift&&intervals[j].start+shift<intervals[i].end))ctx.addIssue({code:'custom',path:['hours'],message:'Los horarios se superponen.'});
 }
 if(!form.sourceId&&!form.newSource)ctx.addIssue({code:'custom',path:['sourceId'],message:'Selecciona o registra una fuente.'});
 for(const key of ['recipes','ingredients','people'] as const){
  const keys=form[key].map(x=>key==='recipes'?`${x.id}:${'relationship' in x?x.relationship:''}`:key==='people'?`${x.id}:${'participationId' in x?x.participationId:''}`:x.id);
  if(new Set(keys).size!==keys.length)ctx.addIssue({code:'custom',path:[key],message:'Hay vínculos repetidos.'});
 }
});
export async function authorizeMarketRead(actorId:string){
 requireDemo();uuid.parse(actorId);
 const {rows:[row]}=await pool.query(`SELECT EXISTS(SELECT 1 FROM ogp.usuarios u WHERE u.id=$1 AND u.estado='activo' AND
 (EXISTS(SELECT 1 FROM ogp.usuario_modulos WHERE usuario_id=u.id AND modulo='mercado') OR EXISTS(
 SELECT 1 FROM ogp.usuario_roles ur JOIN ogp.roles r ON r.id=ur.rol_id WHERE ur.usuario_id=u.id AND r.activo AND r.codigo='administrador'))) AS allowed`,[actorId]);
 if(!row.allowed)throw new MarketError('No tienes acceso al módulo de mercados.',403);
}
export async function marketCatalogs(actorId:string):Promise<MarketCatalogs>{
 await authorizeMarketRead(actorId);
 const results=await Promise.all([
  pool.query("SELECT x.id,x.titulo::text AS name FROM ogp.recetas_documentadas x JOIN ogp.registros r ON r.id=x.id WHERE r.archivado_en IS NULL ORDER BY x.titulo,x.id"),
  pool.query("SELECT x.id,x.nombre::text AS name FROM ogp.ingredientes x JOIN ogp.registros r ON r.id=x.id WHERE r.archivado_en IS NULL ORDER BY x.nombre,x.id"),
  pool.query("SELECT x.id,x.nombre_publico::text AS name FROM ogp.personas x JOIN ogp.registros r ON r.id=x.id WHERE r.archivado_en IS NULL ORDER BY x.nombre_publico,x.id"),
  pool.query("SELECT id,titulo::text AS name FROM ogp.fuentes ORDER BY titulo,id"),
  pool.query("SELECT id,nombre::text AS name FROM ogp.tipos_participacion WHERE activo ORDER BY nombre,id"),
  pool.query("SELECT ogp.tiene_permiso($1,'mercado','crear') AS allowed",[actorId]),
  pool.query("SELECT id,nombre::text AS name FROM ogp.tipos_fuente WHERE activo ORDER BY nombre,id"),
 ]);
 return {recipes:results[0].rows,ingredients:results[1].rows,people:results[2].rows,sources:results[3].rows,participations:results[4].rows,sourceTypes:results[6].rows,canCreate:results[5].rows[0].allowed};
}
const baseQuery=`SELECT m.id,m.nombre AS name,m.tipo AS type,coalesce(m.descripcion,'') AS description,r.actualizado_en AS "updatedAt",
 ogp.tiene_permiso($1,'mercado','editar',m.id) AS "canEdit",
 coalesce((SELECT mf.fuente_id::text FROM ogp.mercado_fuentes mf JOIN ogp.fuentes f ON f.id=mf.fuente_id WHERE mf.mercado_id=m.id ORDER BY f.creado_en DESC,f.id LIMIT 1),'') AS "sourceId",
 coalesce(to_char(m.fecha_comprobacion,'YYYY-MM-DD'),'') AS "observationDate",
 coalesce((SELECT jsonb_build_object('street',coalesce(u.calle,''),'exterior',coalesce(u.numero_exterior,''),'interior',coalesce(u.numero_interior,''),'neighborhood',coalesce(u.colonia,''),'municipalityCode',mp.cvegeo,'postalCode',coalesce(u.codigo_postal,''),'locality',coalesce(u.localidad_nombre,''),'reference',coalesce(u.descripcion_ubicacion,''),'legacy',coalesce(u.direccion,'')) FROM ogp.mercado_ubicaciones u JOIN ogp.municipios_puebla mp ON mp.territorio_id=u.municipio_id WHERE u.mercado_id=m.id AND u.vigente_desde<=current_date AND (u.vigente_hasta IS NULL OR u.vigente_hasta>current_date)), '{"street":"","exterior":"","interior":"","neighborhood":"","municipalityCode":"","postalCode":"","locality":"","reference":""}'::jsonb) AS address,
 coalesce((SELECT jsonb_agg(jsonb_build_object('day',h.dia_semana,'opens',to_char(h.apertura,'HH24:MI'),'closes',to_char(h.cierre,'HH24:MI'),'nextDay',h.cierra_dia_siguiente) ORDER BY h.dia_semana,h.apertura) FROM ogp.mercado_horarios h JOIN ogp.mercado_ubicaciones u ON u.id=h.ubicacion_id WHERE u.mercado_id=m.id AND u.vigente_desde<=current_date AND (u.vigente_hasta IS NULL OR u.vigente_hasta>current_date) AND h.apertura IS NOT NULL),'[]'::jsonb) AS hours,
 coalesce((SELECT jsonb_agg(jsonb_build_object('id',receta_id,'relationship',tipo_vinculo) ORDER BY receta_id,tipo_vinculo) FROM ogp.mercado_recetas WHERE mercado_id=m.id),'[]'::jsonb) AS recipes,
 coalesce((SELECT jsonb_agg(jsonb_build_object('id',ingrediente_id,'availability',coalesce(disponibilidad,'')) ORDER BY ingrediente_id) FROM (SELECT DISTINCT ON (ingrediente_id) ingrediente_id,disponibilidad FROM ogp.mercado_ingredientes WHERE mercado_id=m.id ORDER BY ingrediente_id,fecha_observacion DESC,id) latest),'[]'::jsonb) AS ingredients,
 coalesce((SELECT jsonb_agg(jsonb_build_object('id',persona_id,'participationId',participacion_id) ORDER BY persona_id,participacion_id) FROM ogp.mercado_personas WHERE mercado_id=m.id),'[]'::jsonb) AS people
 FROM ogp.mercados m JOIN ogp.registros r ON r.id=m.id WHERE r.archivado_en IS NULL`;
export async function listMarkets(actorId:string):Promise<MarketRecord[]>{await authorizeMarketRead(actorId);return (await pool.query(baseQuery+' ORDER BY r.actualizado_en DESC,m.id',[actorId])).rows;}
export async function getMarket(id:string,actorId:string):Promise<MarketRecord|null>{uuid.parse(id);await authorizeMarketRead(actorId);return (await pool.query(baseQuery+' AND m.id=$2',[actorId,id])).rows[0]??null;}
async function assertActive(db:PoolClient,ids:string[],type:string){
 if(!ids.length)return;
 const unique=[...new Set(ids)];
 const {rows}=await db.query('SELECT id FROM ogp.registros WHERE id=ANY($1::uuid[]) AND tipo=$2 AND archivado_en IS NULL FOR SHARE',[unique,type]);
 if(rows.length!==unique.length)throw new MarketError('Una ficha seleccionada ya no está disponible. Actualiza los catálogos.',409);
}
async function municipalityId(db:PoolClient,code:string,actorId:string){
 // Import only a real municipality from the INEGI catalog bundled with the map.
 await db.query('SELECT pg_advisory_xact_lock(210008,$1::int)',[Number(code)]);
 const {rows:[existing]}=await db.query('SELECT territorio_id FROM ogp.municipios_puebla WHERE cvegeo=$1',[code]);
 if(existing)return existing.territorio_id as string;
 const municipality=pueblaMunicipalities.find(x=>x.code===code)!;
 let {rows:[source]}=await db.query("SELECT id FROM ogp.fuentes WHERE titulo='INEGI · Catálogo municipal de Puebla 2025' AND autor_institucion='INEGI' ORDER BY creado_en,id LIMIT 1");
 if(!source){source=(await db.query(`INSERT INTO ogp.fuentes(tipo_id,titulo,referencia,autor_institucion,visibilidad,creado_por)
 SELECT id,'INEGI · Catálogo municipal de Puebla 2025','Marco Geoestadístico, diciembre de 2025. Catálogo de claves y nombres incluido en data/geo/puebla-municipios-inegi-2025.geojson.','INEGI','publico',$1 FROM ogp.tipos_fuente WHERE codigo='oficial' RETURNING id`,[actorId])).rows[0];}
 const {rows:[territory]}=await db.query("INSERT INTO ogp.territorios(tipo_id,nombre,fuente_id) SELECT id,$1,$2 FROM ogp.tipos_territorio WHERE codigo='municipio' RETURNING id",[municipality.name,source.id]);
 await db.query('INSERT INTO ogp.municipios_puebla(territorio_id,cve_mun,version_fuente,fuente_id) VALUES($1,$2,$3,$4)',[territory.id,code.slice(2),'INEGI diciembre 2025; catálogo local de claves y nombres',source.id]);
 return territory.id as string;
}
async function saveLocation(db:PoolClient,marketId:string,form:z.infer<typeof input>,actorId:string){
 const municipality=await municipalityId(db,form.address.municipalityCode,actorId);
 const a=form.address;
 const formatted=[a.street,a.exterior&&`Núm. ${a.exterior}`,a.interior&&`Int. ${a.interior}`,a.neighborhood,a.locality,pueblaMunicipalities.find(x=>x.code===a.municipalityCode)!.name,`Puebla, C.P. ${a.postalCode}`].filter(Boolean).join(', ');
 const {rows:[current]}=await db.query('SELECT *,vigente_desde<current_date AS past FROM ogp.mercado_ubicaciones WHERE mercado_id=$1 AND vigente_hasta IS NULL FOR UPDATE',[marketId]);
 let locationId:string|undefined=current?.id;
 const changed=current&&[current.calle??'',current.numero_exterior??'',current.numero_interior??'',current.colonia??'',current.municipio_id,current.codigo_postal??'',current.localidad_nombre??''].some((value,index)=>value!==[a.street,a.exterior,a.interior,a.neighborhood,municipality,a.postalCode,a.locality][index]);
 if(changed&&current.past){
  await db.query('UPDATE ogp.mercado_ubicaciones SET vigente_hasta=current_date WHERE id=$1',[current.id]);locationId=undefined;
 }
 const params=[locationId??null,marketId,municipality,formatted,a.reference,form.sourceId,a.street,a.exterior,a.interior,a.neighborhood,a.postalCode,a.locality];
 if(locationId){
  await db.query(`UPDATE ogp.mercado_ubicaciones SET municipio_id=$3,direccion=$4,descripcion_ubicacion=$5,fuente_id=$6,calle=$7,numero_exterior=$8,numero_interior=$9,colonia=$10,codigo_postal=$11,localidad_nombre=$12,
    localidad_id=CASE WHEN municipio_id=$3 THEN localidad_id ELSE NULL END,punto=CASE WHEN $13 THEN NULL ELSE punto END WHERE id=$1 AND mercado_id=$2`,[...params,Boolean(changed)]);
 }else{
  locationId=(await db.query(`INSERT INTO ogp.mercado_ubicaciones(mercado_id,municipio_id,direccion,descripcion_ubicacion,fuente_id,calle,numero_exterior,numero_interior,colonia,codigo_postal,localidad_nombre,vigente_desde)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,current_date) RETURNING id`,params.slice(1))).rows[0].id;
 }
 await db.query('DELETE FROM ogp.mercado_horarios WHERE ubicacion_id=$1 AND apertura IS NOT NULL',[locationId]);
 for(const hour of form.hours)await db.query('INSERT INTO ogp.mercado_horarios(ubicacion_id,dia_semana,apertura,cierre,cierra_dia_siguiente) VALUES($1,$2,$3,$4,$5)',[locationId,hour.day,hour.opens,hour.closes,hour.nextDay]);
 await db.query("DELETE FROM ogp.mercado_territorios WHERE mercado_id=$1 AND tipo_vinculo='ubicacion' AND territorio_id<>$2",[marketId,municipality]);
 await db.query("INSERT INTO ogp.mercado_territorios(mercado_id,territorio_id,tipo_vinculo,fuente_id) VALUES($1,$2,'ubicacion',$3) ON CONFLICT DO NOTHING",[marketId,municipality,form.sourceId]);
}
export async function saveMarket(body:unknown,id:string|undefined,actorId:string):Promise<MarketRecord>{
 requireDemo();uuid.parse(actorId);if(id)uuid.parse(id);const form=input.parse(body);
 const db=await pool.connect();let marketId=id;
 try{
  await db.query('BEGIN');
  await db.query("SELECT set_config('ogp.actor_id',$1,true)",[actorId]);
  if(id){
   const {rows}=await db.query("SELECT id FROM ogp.registros WHERE id=$1 AND tipo='mercado' AND archivado_en IS NULL FOR UPDATE",[id]);
   if(!rows.length)throw new MarketError('Mercado no encontrado.',404);
   await db.query("SELECT ogp.exigir_permiso($1,'mercado','editar',$2)",[actorId,id]);
  }else{
   marketId=(await db.query("SELECT ogp.crear_registro($1,'mercado') AS id",[actorId])).rows[0].id;
   await db.query('INSERT INTO ogp.mercados(id,nombre,tipo) VALUES($1,$2,$3)',[marketId,form.name,form.type]);
  }
  if(form.newSource){
   const {rows:types}=await db.query('SELECT id FROM ogp.tipos_fuente WHERE id=$1 AND activo FOR SHARE',[form.newSource.typeId]);
   if(!types.length)throw new MarketError('Selecciona un tipo de fuente vigente.',409);
   const {rows:[created]}=await db.query('INSERT INTO ogp.fuentes(tipo_id,titulo,referencia,fecha_consulta,creado_por) VALUES($1,$2,$3,$4,$5) RETURNING id',[form.newSource.typeId,form.newSource.title,form.newSource.reference,form.observationDate,actorId]);
   form.sourceId=created.id;
  }
  const {rows:sources}=await db.query('SELECT id FROM ogp.fuentes WHERE id=$1 FOR KEY SHARE',[form.sourceId]);
  if(!sources.length)throw new MarketError('Selecciona una fuente registrada.',409);
  await assertActive(db,form.recipes.map(x=>x.id),'receta');
  await assertActive(db,form.ingredients.map(x=>x.id),'ingrediente');
  await assertActive(db,form.people.map(x=>x.id),'persona');
  for(const participationId of new Set(form.people.map(x=>x.participationId))){
   if(!(await db.query('SELECT id FROM ogp.tipos_participacion WHERE id=$1 AND activo FOR SHARE',[participationId])).rows.length)throw new MarketError('Selecciona una participación vigente.',409);
  }
  await db.query('UPDATE ogp.mercados SET nombre=$2,tipo=$3,descripcion=$4,fecha_comprobacion=$5 WHERE id=$1',[marketId,form.name,form.type,form.description,form.observationDate]);
  await db.query(`INSERT INTO ogp.mercado_fuentes(mercado_id,fuente_id,afirmacion) VALUES($1,$2,'Documenta el mercado y sus vínculos') ON CONFLICT(mercado_id,fuente_id) DO NOTHING`,[marketId,form.sourceId]);
  // Synchronize selected pairs, retaining the evidence of unchanged links.
  for(const [table,columns,keys] of [
   ['mercado_recetas','receta_id,tipo_vinculo',form.recipes.map(x=>[x.id,x.relationship])],
   ['mercado_personas','persona_id,participacion_id',form.people.map(x=>[x.id,x.participationId])],
  ] as const){
   const [first,second]=columns.split(',');
   const saved=await db.query(`SELECT ${columns},fuente_id FROM ogp.${table} WHERE mercado_id=$1`,[marketId]);
   for(const link of saved.rows){
    if(!keys.some(pair=>pair[0]===link[first]&&pair[1]===link[second])){
     await db.query(`DELETE FROM ogp.${table} WHERE mercado_id=$1 AND ${first}=$2 AND ${second}=$3`,[marketId,link[first],link[second]]);
    }
   }
  }
  for(const link of form.recipes)await db.query(`INSERT INTO ogp.mercado_recetas(mercado_id,receta_id,tipo_vinculo,fuente_id,fecha_observacion) VALUES($1,$2,$3,$4,$5) ON CONFLICT(mercado_id,receta_id,tipo_vinculo) DO NOTHING`,[marketId,link.id,link.relationship,form.sourceId,form.observationDate]);
  for(const link of form.people)await db.query(`INSERT INTO ogp.mercado_personas(mercado_id,persona_id,participacion_id,fuente_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,[marketId,link.id,link.participationId,form.sourceId]);
  // Keep dated ingredient observations; removing an ingredient removes its association explicitly.
  await db.query('DELETE FROM ogp.mercado_ingredientes WHERE mercado_id=$1 AND NOT(ingrediente_id=ANY($2::uuid[]))',[marketId,form.ingredients.map(x=>x.id)]);
  for(const link of form.ingredients){
   const saved=await db.query('SELECT id FROM ogp.mercado_ingredientes WHERE mercado_id=$1 AND ingrediente_id=$2 AND fuente_id=$3 AND fecha_observacion=$4 FOR UPDATE',[marketId,link.id,form.sourceId,form.observationDate]);
   if(saved.rows.length)await db.query('UPDATE ogp.mercado_ingredientes SET disponibilidad=$2 WHERE id=ANY($1::uuid[])',[saved.rows.map(x=>x.id),link.availability]);
   else await db.query('INSERT INTO ogp.mercado_ingredientes(mercado_id,ingrediente_id,fuente_id,fecha_observacion,disponibilidad) VALUES($1,$2,$3,$4,$5)',[marketId,link.id,form.sourceId,form.observationDate,link.availability]);
  }
  await saveLocation(db,marketId!,form,actorId);
  await db.query('SET CONSTRAINTS ALL IMMEDIATE');await db.query('COMMIT');
 }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
 return (await getMarket(marketId!,actorId))!;
}
