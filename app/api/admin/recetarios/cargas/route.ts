import {NextRequest,NextResponse} from 'next/server';
import {getSessionUser} from '@/lib/auth/session';
import {isAllowedWriteOrigin} from '@/lib/request-origin';
import {BookInputError} from '@/lib/recipe-book-store';
import {startBookUpload} from '@/lib/recipe-book-upload';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:NextRequest){
 try{const user=await getSessionUser();if(!user)return NextResponse.json({error:'Inicia sesión para añadir el libro.'},{status:401});if(user.role==='revisor'||!isAllowedWriteOrigin(request))return NextResponse.json({error:'Solicitud no permitida.'},{status:403});if(!request.headers.get('content-type')?.startsWith('application/json'))return NextResponse.json({error:'Formato de solicitud no válido.'},{status:415});return NextResponse.json(await startBookUpload(user.id,await request.json()),{status:201});}
 catch(error){return NextResponse.json({error:error instanceof BookInputError?error.message:'No se pudo iniciar la carga del archivo.'},{status:error instanceof BookInputError?400:503});}
}
