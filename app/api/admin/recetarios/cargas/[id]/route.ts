import {NextRequest,NextResponse} from 'next/server';
import {getSessionUser} from '@/lib/auth/session';
import {isAllowedWriteOrigin} from '@/lib/request-origin';
import {BookInputError} from '@/lib/recipe-book-store';
import {bookChunkSize,writeBookChunk,discardBookUpload} from '@/lib/recipe-book-upload';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{const user=await getSessionUser();if(!user)return NextResponse.json({error:'Tu sesión terminó. Inicia sesión de nuevo.'},{status:401});if(user.role==='revisor'||!isAllowedWriteOrigin(request))return NextResponse.json({error:'Solicitud no permitida.'},{status:403});if(!request.headers.get('content-type')?.startsWith('application/octet-stream'))return NextResponse.json({error:'Formato de archivo no válido.'},{status:415});
 const reader=request.body?.getReader();if(!reader)return NextResponse.json({error:'No llegó el archivo.'},{status:400});const chunks:Uint8Array[]=[];let length=0;
 try{for(;;){const result=await reader.read();if(result.done)break;length+=result.value.length;if(length>bookChunkSize){await reader.cancel();return NextResponse.json({error:'La parte del archivo es demasiado grande.'},{status:413});}chunks.push(result.value);}}finally{reader.releaseLock();}
 const {id}=await params;const part=request.nextUrl.searchParams.get('parte');await writeBookChunk(id,user.id,part===null?NaN:Number(part),Buffer.concat(chunks));return NextResponse.json({ok:true});
 }catch(error){return NextResponse.json({error:error instanceof BookInputError?error.message:'No se pudo recibir una parte del archivo. Vuelve a intentarlo.'},{status:error instanceof BookInputError?400:503});}
}
export async function DELETE(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{const user=await getSessionUser();if(!user)return NextResponse.json({error:'Inicia sesión para continuar.'},{status:401});if(!isAllowedWriteOrigin(request))return NextResponse.json({error:'Solicitud no permitida.'},{status:403});await discardBookUpload((await params).id,user.id);return NextResponse.json({ok:true});}catch{return NextResponse.json({error:'La carga ya no está disponible.'},{status:400});}
}
