export async function readBookResponse<T>(response:Response):Promise<T>{
 const message=()=>{
  if(response.status===413)return 'El servidor rechazó la carga por su tamaño. Vuelve a intentarlo.';
  if(response.status===401||response.redirected&&new URL(response.url).pathname.includes('iniciar-sesion'))return 'Tu sesión terminó. Inicia sesión de nuevo antes de añadir el libro.';
  if(response.status===403)return 'No se autorizó la carga. Comprueba tu sesión y el acceso al enlace de VS Code.';
  if(response.status===404)return 'El servicio de carga no está disponible. Recarga la página y vuelve a intentarlo.';
  if([502,503,504].includes(response.status))return 'La conexión con el servidor se interrumpió. Vuelve a intentar la carga.';
  return `El servidor devolvió una respuesta inesperada${response.ok?'':` (HTTP ${response.status})`}. Recarga la página y vuelve a intentarlo.`;
 };
 let data:unknown;
 try{data=JSON.parse(await response.text());}catch{throw new Error(message());}
 if(!response.ok)throw new Error(data&&typeof data==='object'&&'error'in data&&typeof data.error==='string'?data.error:message());
 if(!data||typeof data!=='object')throw new Error(message());
 return data as T;
}
export async function uploadBookFile(file:File,kind:'pdf'|'cover',onProgress:(bytes:number)=>void,onStarted:(id:string)=>void){
 const initialized=await readBookResponse<{id:string;chunkSize:number}>(await fetch('/api/admin/recetarios/cargas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({size:file.size,kind})}));
 if(typeof initialized.id!=='string'||!/^[0-9a-f-]{36}$/.test(initialized.id)||initialized.chunkSize!==512*1024)throw new Error('No se pudo preparar la carga. Recarga la página.');
 onStarted(initialized.id);
 for(let offset=0,part=0;offset<file.size;offset+=initialized.chunkSize,part++){
  const bytes=file.slice(offset,Math.min(offset+initialized.chunkSize,file.size));
  await readBookResponse(await fetch(`/api/admin/recetarios/cargas/${initialized.id}?parte=${part}`,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:bytes}));
  onProgress(bytes.size);
 }
 return initialized.id;
}
