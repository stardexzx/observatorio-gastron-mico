-- Relacionar mercados con recetas existentes sin duplicar fichas.
-- Aplicar una vez sobre una base instalada. Conserva las revisiones anteriores.
BEGIN;
SET LOCAL search_path = ogp, public;
SET LOCAL lock_timeout = '5s';

CREATE TABLE mercado_recetas (
    mercado_id uuid NOT NULL REFERENCES mercados(id),
    receta_id uuid NOT NULL REFERENCES recetas_documentadas(id),
    tipo_vinculo text NOT NULL CHECK (tipo_vinculo IN ('se_prepara','se_vende','documentada_en')),
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    fecha_observacion date,
    descripcion_publica text,
    PRIMARY KEY (mercado_id, receta_id, tipo_vinculo)
);
CREATE INDEX mercado_recetas_receta_idx ON mercado_recetas(receta_id);
CREATE INDEX mercado_recetas_fuente_idx ON mercado_recetas(fuente_id);
REVOKE ALL ON mercado_recetas FROM PUBLIC;
COMMENT ON TABLE mercado_recetas IS 'Recetas previamente registradas que se preparan, venden o fueron documentadas en un mercado; cada vínculo requiere una fuente.';

-- Actualizar la fecha de la ficha al editar sus vínculos y registrar la operación.
CREATE FUNCTION actualizar_vinculo_mercado_receta() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE v_mercado uuid; v_receta uuid; v_actor uuid;
BEGIN
 IF TG_OP IN ('UPDATE','DELETE') THEN
   UPDATE registros SET actualizado_en=now() WHERE id=OLD.mercado_id;
 END IF;
 IF TG_OP IN ('INSERT','UPDATE') THEN
   UPDATE registros SET actualizado_en=now() WHERE id=NEW.mercado_id;
   v_mercado:=NEW.mercado_id; v_receta:=NEW.receta_id;
 ELSE
   v_mercado:=OLD.mercado_id; v_receta:=OLD.receta_id;
 END IF;
 v_actor:=nullif(current_setting('ogp.actor_id',true),'')::uuid;
 INSERT INTO eventos_auditoria(usuario_id,registro_id,accion,tabla_afectada,entidad_id,detalle)
 VALUES(v_actor,v_mercado,lower(TG_OP),'mercado_recetas',v_receta,
   jsonb_build_object('operacion',TG_OP));
 RETURN NULL;
END $$;
CREATE TRIGGER mercado_receta_modificada AFTER INSERT OR UPDATE OR DELETE ON mercado_recetas
FOR EACH ROW EXECUTE FUNCTION actualizar_vinculo_mercado_receta();
REVOKE ALL ON FUNCTION actualizar_vinculo_mercado_receta() FROM PUBLIC;

-- Las próximas revisiones incluyen las recetas y sus dependencias de publicación.
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

CREATE OR REPLACE FUNCTION enviar_revision(p_usuario uuid,p_registro uuid) RETURNS uuid
LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE v_tipo text; v_num integer; v_id uuid; v_prefijo text;
BEGIN
 SELECT tipo INTO STRICT v_tipo FROM registros WHERE id=p_registro AND archivado_en IS NULL FOR UPDATE;
 PERFORM exigir_permiso(p_usuario,v_tipo,'enviar',p_registro);
 SELECT coalesce(max(numero),0)+1 INTO v_num FROM registro_revisiones WHERE registro_id=p_registro;
 INSERT INTO registro_revisiones(registro_id,numero,creado_por,contenido_publico)
 VALUES(p_registro,v_num,p_usuario,construir_contenido(v_tipo,p_registro)) RETURNING id INTO v_id;
 v_prefijo:=v_tipo;
 -- Las tablas de vínculos tienen nombres definidos por el catálogo cerrado de tipos.
 EXECUTE format($consulta$INSERT INTO revision_fuentes(revision_id,fuente_id,cita_publica,afirmacion,apartado)
   SELECT $1,f.id,CASE WHEN f.visibilidad='publico' THEN coalesce(f.cita_publica,f.titulo || '. ' || f.referencia)
      ELSE f.cita_publica END,x.afirmacion,x.apartado
   FROM %I x JOIN fuentes f ON f.id=x.fuente_id WHERE x.%I=$2
     AND (f.visibilidad='publico' OR f.cita_publica IS NOT NULL)$consulta$,v_prefijo||'_fuentes',v_prefijo||'_id')
 USING v_id,p_registro;
 EXECUTE format('INSERT INTO revision_archivos(revision_id,archivo_id,funcion,texto_alternativo,descripcion_publica,orden)
   SELECT $1,archivo_id,funcion,texto_alternativo,descripcion_publica,orden FROM %I WHERE %I=$2',
   v_prefijo||'_archivos',v_prefijo||'_id') USING v_id,p_registro;
 IF v_tipo NOT IN ('podcast','institucional') THEN
   EXECUTE format('INSERT INTO revision_territorios(revision_id,territorio_id,tipo_vinculo,nombre_en_revision,tipo_territorio_en_revision)
     SELECT $1,t.id,x.tipo_vinculo,t.nombre,tt.codigo FROM %I x JOIN territorios t ON t.id=x.territorio_id
     JOIN tipos_territorio tt ON tt.id=t.tipo_id WHERE x.%I=$2',v_prefijo||'_territorios',v_prefijo||'_id')
   USING v_id,p_registro;
 END IF;
 CASE v_tipo
 WHEN 'receta' THEN
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT v_id,preparacion_id,'variante_de',true FROM recetas_documentadas WHERE id=p_registro;
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,ingrediente_id,'utiliza',true FROM receta_ingredientes WHERE receta_id=p_registro;
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,variedad_id,'utiliza_variedad',true FROM receta_ingredientes WHERE receta_id=p_registro AND variedad_id IS NOT NULL;
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria)
   SELECT v_id,x.persona_id,'participacion:'||p.codigo,false FROM receta_personas x
   JOIN participaciones_receta p ON p.id=x.participacion_id WHERE x.receta_id=p_registro;
 WHEN 'variedad' THEN
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT v_id,ingrediente_id,'variedad_de',true FROM ingrediente_variedades WHERE id=p_registro;
 WHEN 'mercado' THEN
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,ingrediente_id,'ofrece',true FROM mercado_ingredientes WHERE mercado_id=p_registro;
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,variedad_id,'ofrece_variedad',true FROM mercado_ingredientes WHERE mercado_id=p_registro AND variedad_id IS NOT NULL;
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,persona_id,'participa',false FROM mercado_personas WHERE mercado_id=p_registro;
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,receta_id,'receta:'||tipo_vinculo,true FROM mercado_recetas WHERE mercado_id=p_registro;
 WHEN 'episodio' THEN
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT v_id,podcast_id,'episodio_de',true FROM episodios WHERE id=p_registro;
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,persona_id,'participa',false FROM episodio_personas WHERE episodio_id=p_registro;
 ELSE NULL;
 END CASE;

IF v_tipo='episodio' THEN

INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,preparacion_id,'menciona',false FROM episodio_preparaciones WHERE episodio_id=p_registro;

INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,receta_id,'menciona',false FROM episodio_recetas WHERE episodio_id=p_registro;

INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,ingrediente_id,'menciona',false FROM episodio_ingredientes WHERE episodio_id=p_registro;

INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,variedad_id,'menciona',false FROM episodio_variedades WHERE episodio_id=p_registro;

INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,mercado_id,'menciona',false FROM episodio_mercados WHERE episodio_id=p_registro;

INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,instrumento_id,'menciona',false FROM episodio_instrumentos WHERE episodio_id=p_registro;

END IF;

IF v_tipo='instrumento' THEN

INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria,descripcion_publica) SELECT v_id,preparacion_id,'instrumento_relacionado',false,alcance FROM instrumento_preparaciones WHERE instrumento_id=p_registro;

INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria,descripcion_publica) SELECT v_id,receta_id,'instrumento_relacionado',false,alcance FROM instrumento_recetas WHERE instrumento_id=p_registro;

INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria,descripcion_publica) SELECT v_id,ingrediente_id,'instrumento_relacionado',false,alcance FROM instrumento_ingredientes WHERE instrumento_id=p_registro;

INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria,descripcion_publica) SELECT v_id,variedad_id,'instrumento_relacionado',false,alcance FROM instrumento_variedades WHERE instrumento_id=p_registro;

END IF;

PERFORM validar_revision(v_id);
 UPDATE registro_revisiones SET sellada_en=now() WHERE id=v_id;
 INSERT INTO eventos_editoriales(registro_id,revision_id,usuario_id,accion) VALUES(p_registro,v_id,p_usuario,'enviar');
 RETURN v_id;
END $$;

COMMIT;
