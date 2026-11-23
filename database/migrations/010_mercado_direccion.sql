-- Dirección estructurada de mercados; conserva las direcciones anteriores.
BEGIN;
SET LOCAL search_path = ogp, public;
SET LOCAL lock_timeout = '5s';
ALTER TABLE mercado_ubicaciones
 ADD COLUMN calle text,
 ADD COLUMN numero_exterior text,
 ADD COLUMN numero_interior text,
 ADD COLUMN colonia text,
 ADD COLUMN codigo_postal text CHECK (codigo_postal IS NULL OR codigo_postal ~ '^[0-9]{5}$'),
 ADD COLUMN localidad_nombre text;
COMMENT ON COLUMN mercado_ubicaciones.direccion IS 'Dirección completa para consulta y compatibilidad; los campos estructurados se capturan por separado.';
COMMENT ON COLUMN mercado_ubicaciones.localidad_nombre IS 'Localidad capturada como texto; localidad_id sigue reservado al catálogo territorial verificado.';
-- municipio_id ya referencia municipios_puebla; los horarios se guardan por ubicación
-- en mercado_horarios (día, apertura, cierre y cierre al día siguiente).

CREATE OR REPLACE FUNCTION construir_contenido(p_tipo text,p_id uuid) RETURNS jsonb
LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE v_tabla text; v_ficha jsonb; v_detalle jsonb := '{}'::jsonb;
BEGIN
 v_tabla := CASE p_tipo

WHEN 'preparacion' THEN 'preparaciones'

WHEN 'ingrediente' THEN 'ingredientes'

WHEN 'variedad' THEN 'ingrediente_variedades'

WHEN 'persona' THEN 'personas'

WHEN 'receta' THEN 'recetas_documentadas'

WHEN 'mercado' THEN 'mercados'

WHEN 'expediente' THEN 'expedientes_legales'

WHEN 'instrumento' THEN 'instrumentos_legales'

WHEN 'podcast' THEN 'podcasts'

WHEN 'episodio' THEN 'episodios'

WHEN 'institucional' THEN 'contenidos_institucionales'

ELSE NULL END;
 IF v_tabla IS NULL THEN RAISE EXCEPTION 'Tipo desconocido: %',p_tipo; END IF;
 EXECUTE format($consulta$SELECT to_jsonb(t) - ARRAY['id','tipo_registro','preparacion_id','ingrediente_id','podcast_id'] FROM %I t WHERE id=$1$consulta$,v_tabla)
 INTO v_ficha USING p_id;
 IF v_ficha IS NULL THEN RAISE EXCEPTION 'Falta ficha de dominio para el registro'; END IF;
 CASE p_tipo
 WHEN 'preparacion' THEN
   SELECT jsonb_build_object('nombres',coalesce(jsonb_agg(to_jsonb(n)-ARRAY['id','preparacion_id','fuente_id']),'[]'::jsonb))
   INTO v_detalle FROM preparacion_nombres n WHERE preparacion_id=p_id;
 WHEN 'receta' THEN
   v_detalle := jsonb_build_object(
    'pasos',(SELECT coalesce(jsonb_agg(to_jsonb(x)-ARRAY['id','receta_id'] ORDER BY orden),'[]'::jsonb) FROM receta_pasos x WHERE receta_id=p_id),
    'ingredientes',(SELECT coalesce(jsonb_agg(to_jsonb(x)-ARRAY['id','receta_id'] ORDER BY orden),'[]'::jsonb) FROM receta_ingredientes x WHERE receta_id=p_id),
    'tecnicas',(SELECT coalesce(jsonb_agg(jsonb_build_object('codigo',t.codigo,'nombre',t.nombre,'observaciones',x.observaciones_publicas)),'[]'::jsonb) FROM receta_tecnicas x JOIN tecnicas t ON t.id=x.tecnica_id WHERE receta_id=p_id));
 WHEN 'persona' THEN
   v_detalle := jsonb_build_object(
    'participaciones',(SELECT coalesce(jsonb_agg(t.nombre),'[]'::jsonb) FROM persona_tipos_participacion x JOIN tipos_participacion t ON t.id=x.participacion_id WHERE persona_id=p_id),
    'especialidades',(SELECT coalesce(jsonb_agg(t.nombre),'[]'::jsonb) FROM persona_especialidades x JOIN especialidades t ON t.id=x.especialidad_id WHERE persona_id=p_id),
    'lenguas',(SELECT coalesce(jsonb_agg(t.nombre),'[]'::jsonb) FROM persona_lenguas x JOIN lenguas t ON t.id=x.lengua_id WHERE persona_id=p_id),
    'reconocimientos',(SELECT coalesce(jsonb_agg(to_jsonb(x)-ARRAY['id','persona_id','fuente_id']),'[]'::jsonb) FROM reconocimientos x WHERE persona_id=p_id));
 WHEN 'mercado' THEN
   v_detalle := jsonb_build_object('ubicacion',(
    SELECT jsonb_build_object('direccion',u.direccion,'descripcion',u.descripcion_ubicacion,
      'calle',u.calle,'numero_exterior',u.numero_exterior,'numero_interior',u.numero_interior,
      'colonia',u.colonia,'codigo_postal',u.codigo_postal,'localidad',u.localidad_nombre,
      'municipio_id',u.municipio_id,'localidad_id',u.localidad_id,'precision',u.precision,
      'longitud',ST_X(u.punto),'latitud',ST_Y(u.punto),'vigente_desde',u.vigente_desde,
      'horarios',(SELECT coalesce(jsonb_agg(to_jsonb(h)-ARRAY['id','ubicacion_id']),'[]'::jsonb) FROM mercado_horarios h WHERE h.ubicacion_id=u.id))
    FROM mercado_ubicaciones u WHERE u.mercado_id=p_id AND u.vigente_desde<=current_date
      AND (u.vigente_hasta IS NULL OR u.vigente_hasta>current_date)),
    'temporadas',(SELECT coalesce(jsonb_agg(to_jsonb(x)-ARRAY['id','mercado_id','fuente_id']),'[]'::jsonb) FROM mercado_temporadas x WHERE mercado_id=p_id),
    'servicios',(SELECT coalesce(jsonb_agg(jsonb_build_object('nombre',s.nombre,'descripcion',x.descripcion,'fecha',x.fecha_comprobacion)),'[]'::jsonb) FROM mercado_servicios x JOIN servicios s ON s.id=x.servicio_id WHERE mercado_id=p_id),
    'productos',(SELECT coalesce(jsonb_agg(to_jsonb(x)-ARRAY['id','mercado_id','fuente_id']),'[]'::jsonb) FROM mercado_ingredientes x WHERE mercado_id=p_id),
    'recetas',(SELECT coalesce(jsonb_agg(jsonb_build_object(
      'receta_id',x.receta_id,'tipo_vinculo',x.tipo_vinculo,
      'fecha_observacion',x.fecha_observacion,'descripcion_publica',x.descripcion_publica)
      ORDER BY x.receta_id,x.tipo_vinculo),'[]'::jsonb)
      FROM mercado_recetas x WHERE x.mercado_id=p_id));
 WHEN 'episodio' THEN
   v_detalle := jsonb_build_object(
    'creditos',(SELECT coalesce(jsonb_agg(jsonb_build_object('nombre',nombre_publico,'funcion',funcion)),'[]'::jsonb) FROM episodio_creditos WHERE episodio_id=p_id AND autorizacion_confirmada),
    'enlaces',(SELECT coalesce(jsonb_agg(jsonb_build_object('plataforma',plataforma,'url',url,'tipo',tipo,'verificado_en',verificado_en)),'[]'::jsonb) FROM episodio_enlaces WHERE episodio_id=p_id AND disponible AND verificado_en IS NOT NULL));
 WHEN 'expediente' THEN
   SELECT jsonb_build_object('actuaciones',coalesce(jsonb_agg(to_jsonb(x)-ARRAY['id','expediente_id','fuente_id','visibilidad']),'[]'::jsonb))
   INTO v_detalle FROM expediente_eventos x WHERE expediente_id=p_id AND visibilidad='publico';
 ELSE NULL;
 END CASE;

IF p_tipo='ingrediente' THEN
 v_detalle := jsonb_build_object(
   'nombres',(SELECT coalesce(jsonb_agg(to_jsonb(x)-ARRAY['id','ingrediente_id','fuente_id']),'[]'::jsonb) FROM ingrediente_nombres x WHERE ingrediente_id=p_id),
   'temporadas',(SELECT coalesce(jsonb_agg((to_jsonb(x)-ARRAY['id','ingrediente_id','fuente_id']) || jsonb_build_object('meses',
      (SELECT coalesce(jsonb_agg(m.mes ORDER BY m.mes),'[]'::jsonb) FROM ingrediente_temporada_meses m WHERE m.temporada_id=x.id))),'[]'::jsonb) FROM ingrediente_temporadas x WHERE ingrediente_id=p_id),
   'produccion',(SELECT coalesce(jsonb_agg(to_jsonb(x)-ARRAY['id','ingrediente_id','fuente_id']),'[]'::jsonb) FROM ingrediente_produccion x WHERE ingrediente_id=p_id));
 END IF;

IF p_tipo='variedad' THEN
 v_detalle := jsonb_build_object(
   'nombres',(SELECT coalesce(jsonb_agg(to_jsonb(x)-ARRAY['id','variedad_id','fuente_id']),'[]'::jsonb) FROM variedad_nombres x WHERE variedad_id=p_id),
   'temporadas',(SELECT coalesce(jsonb_agg((to_jsonb(x)-ARRAY['id','variedad_id','fuente_id']) || jsonb_build_object('meses',
      (SELECT coalesce(jsonb_agg(m.mes ORDER BY m.mes),'[]'::jsonb) FROM variedad_temporada_meses m WHERE m.temporada_id=x.id))),'[]'::jsonb) FROM variedad_temporadas x WHERE variedad_id=p_id),
   'produccion',(SELECT coalesce(jsonb_agg(to_jsonb(x)-ARRAY['id','variedad_id','fuente_id']),'[]'::jsonb) FROM variedad_produccion x WHERE variedad_id=p_id));
 END IF;

RETURN jsonb_build_object('tipo',p_tipo,'ficha',v_ficha,'detalle',v_detalle);
END $$;

COMMIT;
